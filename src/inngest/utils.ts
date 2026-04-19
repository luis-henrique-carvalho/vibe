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
  try {
    const check = await sandbox.commands.run(
      "curl --connect-timeout 3 --max-time 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000 || echo '000'",
      { timeoutMs: 15_000 },
    );

    const statusCode = check.stdout.trim().replace(/'/g, "");

    if (statusCode !== "000" && statusCode !== "") {
      return; // Server is running
    }
  } catch {
    console.log("Health check failed, will attempt restart...");
  }

  console.log("Dev server is down, restarting...");

  try {
    // Kill any zombie next processes first
    await sandbox.commands.run("pkill -f 'next dev' || true", {
      timeoutMs: 5_000,
    });

    // Start the server in the background — don't await the process itself
    await sandbox.commands.run(
      "cd /home/user && NODE_OPTIONS='--max-old-space-size=512' nohup npx next dev -H 0.0.0.0 > /tmp/next.log 2>&1 &",
      { timeoutMs: 10_000 },
    );
  } catch {
    console.warn("Failed to start dev server command");
  }

  // Wait for the server to be ready (up to ~30s)
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const retry = await sandbox.commands.run(
        "curl --connect-timeout 2 --max-time 3 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000 || echo '000'",
        { timeoutMs: 10_000 },
      );
      const code = retry.stdout.trim().replace(/'/g, "");
      if (code === "200") {
        console.log("Dev server restarted successfully");
        return;
      }
    } catch {
      // Retry on next iteration
    }
  }
  console.warn("Dev server may not have restarted in time");
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const message = result.output
    .slice()
    .reverse()
    .find((message) => message.role === "assistant") as TextMessage | undefined;

  return message?.content
    ? typeof message?.content === "string"
      ? message.content
      : message?.content.map((part) => part.text).join("")
    : undefined;
}
