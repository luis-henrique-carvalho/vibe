import Sandbox from "@e2b/code-interpreter";
import { AgentResult, TextMessage } from "@inngest/agent-kit";

export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);

  return sandbox;
}

/**
 * Check if the Next.js dev server is running on port 3000.
 * If not, restart it.
 */
export async function ensureDevServer(sandbox: Sandbox) {
  const check = await sandbox.commands.run(
    "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000 || echo '000'",
    { timeoutMs: 10_000 },
  );

  const statusCode = check.stdout.trim().replace(/'/g, "");

  if (statusCode === "000" || statusCode === "") {
    console.log("Dev server is down, restarting...");
    await sandbox.commands.run(
      "cd /home/user && NODE_OPTIONS='--max-old-space-size=512' npx next dev -H 0.0.0.0 > /tmp/next.log 2>&1 &",
      { timeoutMs: 5_000 },
    );

    // Wait for the server to be ready
    for (let i = 0; i < 30; i++) {
      const retry = await sandbox.commands.run(
        "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000 || echo '000'",
        { timeoutMs: 5_000 },
      );
      const code = retry.stdout.trim().replace(/'/g, "");
      if (code === "200") {
        console.log("Dev server restarted successfully");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.warn("Dev server may not have restarted in time");
  }
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const message = result.output
    .slice()
    .reverse()
    .find((message) => message.role === "assistant") as
    | TextMessage
    | undefined;

  return message?.content
    ? typeof message?.content === "string"
      ? message.content
      : message?.content.map((part) => part.text).join("")
    : undefined;
}
