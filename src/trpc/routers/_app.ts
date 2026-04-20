import { projectRouter } from "@/modules/project/server/procedures";
import { createTRPCRouter } from "../init";

import { messagesRouter } from "@/modules/messages/server/procedures";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectRouter,
});

export type AppRouter = typeof appRouter;
