import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { inngest } from "@/inngest/client";

export const appRouter = createTRPCRouter({
  create: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
  invoke: baseProcedure
    .input(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await inngest.send({
        name: "app/task.created",
        data: {
          message: input.message,
        },
      });

      return { ok: "success" };
    }),
  summarize: baseProcedure
    .input(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await inngest.send({
        name: "app/summarize",
        data: {
          message: input.message,
        },
      });

      return { ok: "success" };
    }),
});

export type AppRouter = typeof appRouter;
