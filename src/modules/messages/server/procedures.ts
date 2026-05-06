import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const messagesRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "ID cannot be empty" }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const message = await prisma.message.findFirst({
        where: {
          id: input.id,
          project: {
            userId: ctx.userId,
          },
        },
      });

      if (!message) {
        throw new Error("Message not found");
      }

      return message;
    }),
  getAll: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.userId,
          },
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
  create: protectedProcedure
    .input(
      z.object({
        content: z
          .string()
          .min(1, { message: "Message cannot be empty" })
          .max(10000, { message: "Message cannot exceed 10000 characters" }),
        projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const createdMessage = await prisma.message.create({
        data: {
          content: input.content,
          role: "USER",
          type: "RESULT",
          projectId: project.id,
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          message: input.content,
          projectId: project.id,
        },
      });

      return createdMessage;
    }),
});
