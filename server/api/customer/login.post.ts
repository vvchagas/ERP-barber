import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { verifyPassword } from "../../utils/password";
import { consumeRateLimit } from "../../utils/rateLimit";
import { createCustomerSession } from "../../utils/adminSession";

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event) || "unknown";
  const rate = consumeRateLimit(`customer-login:${ip}`);
  if (!rate.allowed) {
    setResponseHeader(event, "Retry-After", rate.retryAfterSeconds);
    throw createError({ statusCode: 429, statusMessage: "Muitas tentativas" });
  }
  const result = bodySchema.safeParse(await readBody(event));
  if (!result.success) throw createError({ statusCode: 400, statusMessage: "Dados de login inválidos" });
  const customer = await prisma.customer.findFirst({
    where: { email: result.data.email },
  });
  if (!customer?.passwordHash || !customer.passwordSalt || !verifyPassword(result.data.password, customer.passwordSalt, customer.passwordHash)) {
    throw createError({ statusCode: 401, statusMessage: "E-mail ou senha inválidos" });
  }
  createCustomerSession(event, customer.phone);
  return { authenticated: true };
});
