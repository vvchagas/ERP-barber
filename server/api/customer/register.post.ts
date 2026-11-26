import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { hashPassword } from "../../utils/password";
import { consumeRateLimit } from "../../utils/rateLimit";
import { createCustomerSession } from "../../utils/adminSession";
import { createAdminNotification } from "../../utils/adminNotifications";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^[0-9()+ -]{10,20}$/),
  password: z.string().min(8).max(128),
  lgpdConsent: z.literal(true),
}).strict();

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event) || "unknown";
  const rate = consumeRateLimit(`customer-register:${ip}`);
  if (!rate.allowed) {
    setResponseHeader(event, "Retry-After", rate.retryAfterSeconds);
    throw createError({ statusCode: 429, statusMessage: "Muitas tentativas" });
  }
  const result = bodySchema.safeParse(await readBody(event));
  if (!result.success) throw createError({ statusCode: 400, statusMessage: "Dados de cadastro inválidos" });
  const existing = await prisma.customer.findUnique({ where: { phone: result.data.phone } });
  if (existing) throw createError({ statusCode: 409, statusMessage: "Já existe uma conta com este telefone" });
  const credentials = hashPassword(result.data.password);
  const isOwner = Boolean(
    process.env.OWNER_EMAIL
    && result.data.email.trim().toLowerCase() === process.env.OWNER_EMAIL.trim().toLowerCase(),
  );
  try {
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name: result.data.name,
          email: result.data.email,
          phone: result.data.phone,
          role: isOwner ? "ADMIN" : "CUSTOMER",
          passwordHash: credentials.hash,
          passwordSalt: credentials.salt,
          lgpdConsent: true,
          lgpdConsentAt: new Date(),
        },
      });
      await createAdminNotification({
        type: "CUSTOMER_NEW",
        title: "Novo cadastro de cliente",
        message: `${created.name} criou uma conta.`,
        metadata: { customerId: created.id },
      }, tx);
      return created;
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw createError({ statusCode: 409, statusMessage: "Já existe uma conta com estes dados" });
    }
    throw error;
  }
  createCustomerSession(event, result.data.phone);
  return { created: true };
});
