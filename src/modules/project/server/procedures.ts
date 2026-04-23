import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";
import { generateSlug } from "random-word-slugs";

export const projectRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "ID cannot be empty" }),
      }),
    )
    .query(async ({ input }) => {
      const project = await prisma.project.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!project) {
        throw new Error("project not found");
      }

      return project;
    }),
  getAll: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "Project ID cannot be empty" }),
      }),
    )
    .query(async ({ input }) => {
      const projects = await prisma.project.findMany({
        where: {
          id: input.id,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return projects;
    }),
  create: baseProcedure
    .input(
      z.object({
        message: z
          .string()
          .min(1, "Message cannot be empty")
          .max(10000, "Message cannot exceed 10000 characters"),
      }),
    )
    .mutation(async ({ input }) => {
      const createdProject = await prisma.project.create({
        data: {
          name: generateSlug(2, {
            format: "kebab",
          }),
          messages: {
            create: {
              content: input.message,
              role: "USER",
              type: "RESULT",
            },
          },
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          message: input.message,
          projectId: createdProject.id,
        },
      });

      console.log("Project created with id:", createdProject.id);

      return createdProject;
    }),
});
