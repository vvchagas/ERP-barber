import type { H3Event } from "h3";
import { getHeader, getRequestIP } from "h3";
import { prisma } from "./prisma";

export async function writeAccessLog(
  event: H3Event,
  authorized: boolean,
  reason: string,
  username?: string,
): Promise<void> {
  await prisma.accessLog.create({
    data: {
      ip: getRequestIP(event) || "unknown",
      userAgent: getHeader(event, "user-agent") || "unknown",
      username: username || null,
      authorized,
      reason,
    },
  });
}
