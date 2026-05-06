import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import superjson from "superjson";

import { auth } from "@/lib/auth";

export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  /**
   * @see: https://trpc.io/docs/server/context
   */
  return { session };
});

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<TRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to continue",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
