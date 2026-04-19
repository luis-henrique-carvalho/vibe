import { inngest } from "./client";
import {
  openai,
  createAgent,
  createTool,
  createNetwork,
} from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import {
  getSandbox,
  lastAssistantTextMessageContent,
  ensureDevServer,
} from "./utils";
import z from "zod";
import { PROMPT } from "@/prompt";

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

            // Ensure the dev server is still running after file changes
            await step?.run("ensure-dev-server-after-write", async () => {
              const sandbox = await getSandbox(sandboxId);
              await ensureDevServer(sandbox);
            });
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
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork({
      name: "coding-agent-network",
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

    const result = await network.run(event.data.value);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);

      // Ensure the dev server is running before returning the URL
      await ensureDevServer(sandbox);

      const host = sandbox.getHost(3000);

      console.log("Sandbox URL:", host);

      return `https://${host}`;
    });

    console.log("SANDBOX URL RESULT", sandboxUrl);

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);
