import { inngest } from "./client";
import { openai, createAgent } from "@inngest/agent-kit";

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
  async ({ event }) => {
    const summarizer = createAgent({
      name: "summarizer",
      system:
        "You are a helpful assistant that summarizes the given message into two words.",
      model: openai({ model: "gpt-4o", apiKey: process.env.OPEN_AI_KEY }),
    });

    const response = await summarizer.run(event.data.message);

    return { summary: response };
  },
);
