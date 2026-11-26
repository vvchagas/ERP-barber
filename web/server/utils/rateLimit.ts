import { prisma } from "./prisma";

let requestsSinceCleanup = 0;

export async function consumeRateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ attempts: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "attempts", "resetAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${nextReset}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."attempts" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    WHERE "RateLimitBucket"."resetAt" <= ${now}
       OR "RateLimitBucket"."attempts" < ${limit}
    RETURNING "attempts", "resetAt"
  `;

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100) {
    requestsSinceCleanup = 0;
    await prisma.$executeRaw`
      DELETE FROM "RateLimitBucket"
      WHERE "resetAt" <= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
    `;
  }

  if (rows.length) return { allowed: true, retryAfterSeconds: 0 };
  const state = await prisma.$queryRaw<Array<{ resetAt: Date }>>`
    SELECT "resetAt" FROM "RateLimitBucket" WHERE "key" = ${key}
  `;
  const resetAt = state[0]?.resetAt;
  if (!resetAt) throw new Error("Rate-limit bucket disappeared during update");
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
  };
}
