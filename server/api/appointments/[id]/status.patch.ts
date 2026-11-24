import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";

const paramsSchema = z.object({ id: z.string().min(1).max(191) });
const bodySchema = z.object({
  status: z.enum(["AGENDADO", "EM_ATENDIMENTO", "CONCLUIDO", "FALTOU", "CANCELADO"]),
});

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  const params = paramsSchema.safeParse(getRouterParams(event));
  const body = bodySchema.safeParse(await readBody(event));
  if (!params.success || !body.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados inválidos" });
  }

  let appointment;
  try {
    appointment = await prisma.appointment.update({
      where: { id: params.data.id },
      data: { status: body.data.status },
      include: { customer: true, barber: true, payments: true },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") {
      throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
    }
    throw error;
  }
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
