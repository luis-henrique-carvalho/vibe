import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { generateSlug } from "random-word-slugs";

export const projectRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "ID cannot be empty" }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!project) {
        throw new Error("project not found");
      }

      return project;
    }),
  getAll: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "Project ID cannot be empty" }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const projects = await prisma.project.findMany({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return projects;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: ctx.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, "Message cannot be empty")
          .max(10000, "Message cannot exceed 10000 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const createdProject = await prisma.project.create({
        data: {
          name: generateSlug(2, {
            format: "kebab",
          }),
          userId: ctx.userId,
          messages: {
            create: {
              content: input.value,
              role: "USER",
              type: "RESULT",
            },
          },
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          message: input.value,
          projectId: createdProject.id,
        },
      });

      console.log("Project created with id:", createdProject.id);

      return createdProject;
    }),
});
