import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { consumeRateLimit } from "../../utils/rateLimit";
import { verifyPassword } from "../../utils/password";
import { writeAccessLog } from "../../utils/accessLog";
import { createAdminSession } from "../../utils/adminSession";

const bodySchema = z.object({
  magicKey: z.string().min(1),
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event) || "unknown";
  const rate = consumeRateLimit(`admin-login:${ip}`);
  if (!rate.allowed) {
    await writeAccessLog(event, false, "rate_limit");
    setResponseHeader(event, "Retry-After", rate.retryAfterSeconds);
    throw createError({ statusCode: 429, statusMessage: "Muitas tentativas" });
  }

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    await writeAccessLog(event, false, "invalid_body");
    throw createError({ statusCode: 400, statusMessage: "Dados inválidos" });
  }

  if (parsed.data.magicKey !== process.env.MAGIC_KEY) {
    await writeAccessLog(event, false, "invalid_magic_key", parsed.data.username);
    throw createError({ statusCode: 401, statusMessage: "Credenciais inválidas" });
  }

  const admin = await prisma.adminUser.findUnique({
    where: { username: parsed.data.username },
  });
  if (
    !admin ||
    !verifyPassword(parsed.data.password, admin.passwordSalt, admin.passwordHash)
  ) {
    await writeAccessLog(event, false, "invalid_password", parsed.data.username);
    throw createError({ statusCode: 401, statusMessage: "Credenciais inválidas" });
  }

  await writeAccessLog(event, true, "login_success", admin.username);
  createAdminSession(event, admin.username);
  return { unlocked: true };
});
