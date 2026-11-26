import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";

const paramsSchema = z.object({ id: z.string().min(1).max(191) });
const bodySchema = z.object({
  status: z.enum(["AGENDADO", "EM_ATENDIMENTO", "CONCLUIDO", "FALTOU", "CANCELADO"]),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const params = paramsSchema.safeParse(getRouterParams(event));
  const body = bodySchema.safeParse(await readBody(event));
  if (!params.success || !body.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados inválidos" });
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const previous = await tx.appointment.findUnique({
      where: { id: params.data.id },
      include: { services: true, barber: true, customer: true },
    });
    if (!previous) throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
    const updated = await tx.appointment.update({
      where: { id: previous.id },
      data: { status: body.data.status },
      include: { customer: true, barber: true, payments: true },
    });
    if (previous.status !== body.data.status && body.data.status === "CANCELADO") {
      await createAdminNotification({
        type: "APPOINTMENT_CANCELED",
        title: "Agendamento cancelado",
        message: `O agendamento de ${previous.customer.name} com ${previous.barber.name} foi cancelado.`,
        metadata: { appointmentId: previous.id, customerId: previous.customerId },
      }, tx);
    }
    if (previous.status !== body.data.status && body.data.status === "CONCLUIDO") {
      const grossCents = previous.services.reduce(
        (sum, service) => sum + Math.round(Number(service.unitPrice) * 100) * service.quantity,
        0,
      );
      const existingCommission = await tx.commissionRecord.findUnique({
        where: {
          appointmentId_barberId: {
            appointmentId: previous.id,
            barberId: previous.barberId,
          },
        },
      });
      if (!existingCommission) {
        const rate = Number(previous.barber.commissionRate);
        await tx.commissionRecord.create({
          data: {
            appointmentId: previous.id,
            barberId: previous.barberId,
            grossAmount: grossCents / 100,
            commissionRate: rate,
            commissionAmount: Math.round(grossCents * rate) / 100,
          },
        });
      }
      await createAdminNotification({
        type: "APPOINTMENT_COMPLETED",
        title: "Atendimento concluído",
        message: `O atendimento de ${previous.customer.name} foi concluído.`,
        metadata: { appointmentId: previous.id, customerId: previous.customerId },
      }, tx);
    }
    return updated;
  });
  await writeAccessLog(event, true, `appointment_status_${body.data.status}`, undefined);
  return {
    ...appointment,
    payments: appointment.payments.map((payment) => ({
      ...payment,
      grossAmount: Number(payment.grossAmount),
      feeAmount: Number(payment.feeAmount),
      netAmount: Number(payment.netAmount),
      amountReceived: Number(payment.amountReceived),
      changeGiven: Number(payment.changeGiven),
    })),
  };
});
