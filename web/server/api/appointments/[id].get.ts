import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { getCustomerSessionPhone, isAdminSessionValid } from "../../utils/adminSession";

const paramsSchema = z.object({ id: z.string().min(1).max(191) });

export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({ id: getRouterParam(event, "id") });
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Identificador inválido" });
  const customerPhone = getCustomerSessionPhone(event);
  const isAdmin = await isAdminSessionValid(event);
  if (!customerPhone && !isAdmin) throw createError({ statusCode: 401, statusMessage: "Entre na sua conta para ver este pagamento" });

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.id },
    include: {
      customer: { select: { phone: true } },
      barber: { select: { name: true, specialty: true, photoUrl: true } },
      services: { include: { service: { select: { name: true } } } },
      payments: { where: { status: { in: ["PENDENTE", "CONFIRMADO"] } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!appointment) throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
  if (!isAdmin && customerPhone !== appointment.customer.phone) {
    throw createError({ statusCode: 403, statusMessage: "Você não pode visualizar este agendamento" });
  }
  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    barber: appointment.barber,
    services: appointment.services.map((item) => ({
      name: item.service.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
    total: appointment.services.reduce((sum, item) => sum + Math.round(Number(item.unitPrice) * 100) * item.quantity, 0) / 100,
    paymentStatus: appointment.payments[0]?.status ?? null,
  };
});
