import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";
import { generateSlug } from "random-word-slugs";

export const projectRouter = createTRPCRouter({
  getAll: baseProcedure.query(async () => {
    const project = await prisma.project.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return project;
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
