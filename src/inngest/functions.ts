import { inngest } from "./client";
import {
  openai,
  createAgent,
  createTool,
  createNetwork,
} from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import z from "zod";
import { PROMPT } from "@/prompt";

type AppCheckResult = {
  success: boolean;
  statusCode: number | null;
  url: string;
  errors: string[];
  stdout: string;
  stderr: string | null;
};

async function checkNextJsAppInSandbox(
  sandboxId: string,
  path = "/",
): Promise<AppCheckResult> {
  const buffers = { stdout: "", stderr: "" };
  const routePath = path.startsWith("/") ? path : `/${path}`;
  const url = `http://127.0.0.1:3000${routePath}`;

  try {
    const sandbox = await getSandbox(sandboxId);
    const command = [
      "cd /home/user",
      `status=$(curl -sS -L -o /tmp/vibe-next-check.html -w "%{http_code}" "${url}" || true)`,
      'echo "STATUS:$status"',
      'echo "---NEXT_LOG_TAIL---"',
      "tail -n 200 /tmp/next.log || true",
    ].join(" && ");

    const result = await sandbox.commands.run(command, {
      onStdout(data: string) {
        buffers.stdout += data;
      },
      onStderr(data: string) {
        buffers.stderr += data;
      },
    });

    const stdout = result.stdout || buffers.stdout;
    const output = `${stdout}\n${buffers.stderr}`.trim();
    const statusCodeMatch = output.match(/STATUS:(\d{3})/);
    const statusCode = statusCodeMatch ? Number(statusCodeMatch[1]) : null;
    const errorPatterns = [
      "Module not found",
      "Failed to compile",
      "Build Error",
      "Syntax Error",
      "Type error",
      "Unhandled Runtime Error",
      "Error: Cannot find module",
    ];
    const detectedErrors = errorPatterns.filter((pattern) =>
      output.includes(pattern),
    );
    const success =
      statusCode !== null &&
      statusCode >= 200 &&
      statusCode < 400 &&
      detectedErrors.length === 0;

    return {
      success,
      statusCode,
      url,
      errors: detectedErrors,
      stdout,
      stderr: buffers.stderr || null,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: null,
      url,
      errors: [`App check failed: ${error}`],
      stdout: buffers.stdout,
      stderr: buffers.stderr || null,
    };
  }
}

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      return { processed: true, message: event.data.message };
    });

    await step.sleep("pause", "5s");

    return { message: `Task ${event.data.message} complete`, result };
  },
);

export const sendOpenAiMessage = inngest.createFunction(
  { id: "send-openai-message", triggers: { event: "app/summarize" } },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-test-9225");

      return sandbox.sandboxId;
    });

    const codeAgent = createAgent({
      name: "code-agent",
      description:
        "An expert coding agent that can read and write files and run terminal commands in a sandboxed Next.js environment",
      system: PROMPT,
      model: openai({
        model: "gpt-5-mini",
        apiKey: process.env.OPEN_AI_KEY,
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string().describe("The command to run in the terminal"),
          }),
          handler: async ({ command }, { step, network }) => {
            console.log({
              tool: "terminal",
              command,
              sandboxId,
            });
            network.state.data.appCheckPassed = false;

            return await step?.run("run-terminal-command", async () => {
              const buffers = {
                stdout: "",
                stderr: "",
              };

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout(data: string) {
                    buffers.stdout += data;
                  },
                  onStderr(data: string) {
                    buffers.stderr += data;
                  },
                });

                return result.stdout;
              } catch (error) {
                const errorMessage = `Command failed: ${error}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;

                console.error(errorMessage);

                return errorMessage;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              }),
            ),
          }),
          handler: async ({ files }, { step, network }) => {
            console.log({
              tool: "createOrUpdateFiles",
              files,
              sandboxId,
            });

            const newFiles = await step?.run(
              "create-or-update-files",
              async () => {
                try {
                  const updatedFiles: Record<string, string> =
                    network.state.data.files || {};
                  const sandbox = await getSandbox(sandboxId);

                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }

                  return updatedFiles;
                } catch (error) {
                  return `Error creating/updating files: ${error}`;
                }
              },
            );

            if (
              newFiles &&
              typeof newFiles === "object" &&
              !Array.isArray(newFiles)
            ) {
              network.state.data.files = newFiles;
              network.state.data.appCheckPassed = false;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z
              .array(z.string())
              .describe("The paths of the files to read"),
          }),
          handler: async ({ files }, { step }) => {
            console.log({
              tool: "readFiles",
              files,
              sandboxId,
            });

            return await step?.run("read-files", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];

                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return `Error reading files: ${error}`;
              }
            });
          },
        }),
        createTool({
          name: "checkNextJsApp",
          description:
            "Checks whether the already-running Next.js dev server can render a route without compilation errors. This does not run build/dev/start commands.",
          parameters: z.object({
            path: z
              .string()
              .default("/")
              .describe("The route path to check, usually '/'."),
          }),
          handler: async ({ path }, { step, network }) => {
            console.log({
              tool: "checkNextJsApp",
              path,
              sandboxId,
            });

            return await step?.run("check-nextjs-app", async () => {
              const payload = await checkNextJsAppInSandbox(sandboxId, path);

              network.state.data.lastAppCheck = payload;
              network.state.data.appCheckPassed = payload.success;

              return JSON.stringify(payload);
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              if (network.state.data.appCheckPassed) {
                network.state.data.summary = lastAssistantMessageText;
              } else {
                network.state.data.rejectedSummary = lastAssistantMessageText;
              }
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork({
      name: "code-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;

        if (summary) {
          return;
        }

        return codeAgent;
      },
    });

    const result = await network.run(event.data.message);

    const finalAppCheck = await step.run("final-nextjs-app-check", async () => {
      return await checkNextJsAppInSandbox(sandboxId, "/");
    });

    result.state.data.lastAppCheck = finalAppCheck;
    result.state.data.appCheckPassed = finalAppCheck.success;

    if (!finalAppCheck.success) {
      result.state.data.summary = null;
    } else if (!result.state.data.summary && result.state.data.rejectedSummary) {
      result.state.data.summary = result.state.data.rejectedSummary;
    }

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);

      const host = sandbox.getHost(3000);

      return `https://${host}`;
    });

    return {
      sandboxId,
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files ?? {},
      summary: result.state.data.summary ?? null,
      appCheck: result.state.data.lastAppCheck ?? null,
      validationStatus: finalAppCheck.success ? "ready" : "failed",
      summaryRejected: Boolean(result.state.data.rejectedSummary),
    };
  },
);
