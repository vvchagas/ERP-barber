import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { consumeRateLimit } from "../../utils/rateLimit";
import { writeAccessLog } from "../../utils/accessLog";
import { createAdminSession, getCustomerSessionPhone } from "../../utils/adminSession";
import { magicKeyMatches, secretMatches } from "../../utils/magicKey";

const bodySchema = z.object({
  username: z.string().trim().min(1).max(200).optional(),
  password: z.string().min(1).max(512).optional(),
  magicKey: z.string().min(1).max(512).optional(),
}).strict().refine((body) => (
  (body.username && body.password && !body.magicKey)
  || (body.magicKey && !body.username && !body.password)
), "Informe usuário e senha, ou a chave alternativa.");

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event) || "unknown";
  const rate = await consumeRateLimit(`admin-login:${ip}`);
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

  const phone = getCustomerSessionPhone(event);
  const customer = phone
    ? await prisma.customer.findUnique({ where: { phone }, select: { id: true, email: true, role: true } })
    : null;
  if (!customer || customer.role !== "ADMIN") {
    await writeAccessLog(event, false, "admin_customer_session_required");
    throw createError({ statusCode: 401, statusMessage: "Entre com uma conta administradora antes de continuar" });
  }

  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  const usernameMatches = parsed.data.username !== undefined
    && secretMatches(parsed.data.username, username);
  const passwordMatches = parsed.data.password !== undefined
    && secretMatches(parsed.data.password, password);
  const credentialsValid = usernameMatches && passwordMatches;
  const fallbackValid = parsed.data.magicKey !== undefined
    && magicKeyMatches(parsed.data.magicKey);
  if (!credentialsValid && !fallbackValid) {
    await writeAccessLog(event, false, "invalid_admin_credentials", customer.email ?? undefined);
    throw createError({ statusCode: 401, statusMessage: "Credenciais inválidas" });
  }

  await writeAccessLog(event, true, "login_success", customer.email ?? username);
  createAdminSession(event, customer.id, customer.email ?? username ?? "admin");
  return { unlocked: true };
});
