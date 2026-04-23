import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";

export const messagesRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "ID cannot be empty" }),
      }),
    )
    .query(async ({ input }) => {
      const message = await prisma.message.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!message) {
        throw new Error("Message not found");
      }

      return message;
    }),
  getAll: baseProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
      }),
    )
    .query(async ({ input }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          fragment: true,
        },
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
          .min(1, { message: "Message cannot be empty" })
          .max(10000, { message: "Message cannot exceed 10000 characters" }),
        projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
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
