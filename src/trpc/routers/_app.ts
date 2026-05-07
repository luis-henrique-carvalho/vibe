import { projectRouter } from "@/modules/project/server/procedures";
import { createTRPCRouter } from "../init";

import { messagesRouter } from "@/modules/messages/server/procedures";
import { usageRouter } from "@/modules/usage/server/procedures";

export const appRouter = createTRPCRouter({
  usage: usageRouter,
  messages: messagesRouter,
  projects: projectRouter,
});

export type AppRouter = typeof appRouter;
