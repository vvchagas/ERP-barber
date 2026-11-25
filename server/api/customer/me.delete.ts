import { createHash } from "node:crypto";
import { prisma } from "../../utils/prisma";
import { getCustomerSessionPhone, clearCustomerSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  const phone = getCustomerSessionPhone(event);
  if (!phone) throw createError({ statusCode: 401, statusMessage: "Sessão do cliente não encontrada" });
  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer || customer.anonymizedAt) throw createError({ statusCode: 404, statusMessage: "Cliente não encontrado" });

  const anonymousPhone = `deleted_${createHash("sha256").update(`${customer.id}:${Date.now()}`).digest("hex").slice(0, 32)}`;
  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { customerId: customer.id },
      data: { notes: "" },
    }),
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: "Cliente Excluído",
        phone: anonymousPhone,
        email: null,
        avatarUrl: null,
        passwordHash: null,
        passwordSalt: null,
        notes: "",
        silentCut: false,
        silentPreference: false,
        favoriteBarberId: null,
        anonymizedAt: new Date(),
      },
    }),
    prisma.customerSubscription.updateMany({
      where: { customerId: customer.id, active: true },
      data: { active: false },
    }),
  ]);
  clearCustomerSession(event);
  await writeAccessLog(event, true, "lgpd_customer_anonymized", customer.id);
  return { deleted: true };
});
