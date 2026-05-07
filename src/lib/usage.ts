import { RateLimiterPrisma } from "rate-limiter-flexible";
import { prisma } from "./prisma";
import { headers } from "next/headers";
import { auth } from "./auth";

const FREE_TIER_POINTS = 5;
const FREE_TIER_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
const GENERATION_COST = 1; // Each generation costs 1 point

export async function getUsageTracker() {
  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points: FREE_TIER_POINTS,
    duration: FREE_TIER_DURATION,
  });

  return usageTracker;
}

export async function consumeCredits() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(session.user.id, GENERATION_COST);

  return result;
}

export async function getUsageStatus() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(session.user.id);

  return result;
}
