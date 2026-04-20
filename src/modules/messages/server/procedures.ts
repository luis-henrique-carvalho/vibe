import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";

export const messagesRouter = createTRPCRouter({
  getAll: baseProcedure.query(async () => {
    const messages = await prisma.message.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return messages;
  }),
  create: baseProcedure
    .input(
      z.object({
        content: z
          .string()
          .min(1, "Message cannot be empty")
          .max(10000, "Message cannot exceed 10000 characters"),
        projectId: z.string().min(1, "Project ID cannot be empty"),
      }),
    )
    .mutation(async ({ input }) => {
      const createdMessage = await prisma.message.create({
        data: {
          content: input.content,
          role: "USER",
          type: "RESULT",
          projectId: input.projectId,
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          message: input.content,
          projectId: input.projectId,
        },
      });

      return createdMessage;
    }),
});
