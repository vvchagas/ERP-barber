import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getCustomerSessionPhone } from "../../utils/adminSession";
import { prisma } from "../../utils/prisma";
import { consumeRateLimit } from "../../utils/rateLimit";
import { createAdminNotification } from "../../utils/adminNotifications";

const bodySchema = z.object({
  pin: z.string().regex(/^\d{8}$/),
}).strict();

export default defineEventHandler(async (event) => {
  const phone = getCustomerSessionPhone(event);
  if (!phone) {
    throw createError({ statusCode: 401, statusMessage: "Entre na sua conta para resgatar o código" });
  }
  const ip = getRequestIP(event) || "unknown";
  const rate = await consumeRateLimit(`redeem-pin:${ip}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    setResponseHeader(event, "Retry-After", rate.retryAfterSeconds);
    throw createError({ statusCode: 429, statusMessage: "Muitas tentativas. Tente novamente mais tarde." });
  }

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "O código deve conter exatamente 8 dígitos" });
  }
  const customer = await prisma.customer.findUnique({
    where: { phone },
    select: { id: true, name: true, role: true, anonymizedAt: true },
  });
  if (!customer || customer.anonymizedAt) {
    throw createError({ statusCode: 401, statusMessage: "Sessão do cliente inválida" });
  }

  const suppliedHash = createHash("sha256").update(parsed.data.pin).digest();
  const pinHash = suppliedHash.toString("hex");
  const invite = await prisma.roleInvitePin.findUnique({
    where: { pinHash },
    select: { id: true, pinHash: true, targetRole: true, expiresAt: true, usedAt: true },
  });
  const decodedHash = invite ? Buffer.from(invite.pinHash, "hex") : Buffer.alloc(0);
  const storedHash = decodedHash.length === suppliedHash.length
    ? decodedHash
    : Buffer.alloc(suppliedHash.length);
  const hashMatches = timingSafeEqual(storedHash, suppliedHash);
  const now = new Date();
  if (
    !invite
    || !hashMatches
    || invite.usedAt
    || invite.expiresAt <= now
    || (invite.targetRole !== "BARBER" && invite.targetRole !== "ADMIN")
  ) {
    throw createError({ statusCode: 400, statusMessage: "Código inválido ou expirado" });
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.roleInvitePin.updateMany({
      where: { id: invite.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now, usedByCustomerId: customer.id },
    });
    if (claimed.count !== 1) {
      throw createError({ statusCode: 409, statusMessage: "Este código já foi resgatado" });
    }
    await tx.customer.update({
      where: { id: customer.id },
      data: { role: invite.targetRole },
    });
    await tx.accessLog.create({
      data: {
        ip,
        userAgent: getHeader(event, "user-agent") || "unknown",
        username: customer.name,
        authorized: true,
        reason: `role_pin_redeemed_${invite.targetRole}`,
      },
    });
    await createAdminNotification({
      type: "TEAM_UPDATE",
      title: "Cargo de equipe ativado",
      message: `${customer.name} ativou o cargo ${invite.targetRole}.`,
      metadata: { customerId: customer.id, role: invite.targetRole },
    }, tx);
  });

  return { redeemed: true, role: invite.targetRole };
});
