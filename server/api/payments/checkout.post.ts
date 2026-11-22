import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";

const bodySchema = z.object({
  appointmentId: z.string().min(1).max(191).optional(),
  method: z.enum(["PIX", "CREDITO", "DEBITO", "DINHEIRO"]),
  timing: z.enum(["PRESENCIAL_BALCAO", "LIQUIDADO_AGORA"]),
  grossAmount: z.number().positive().max(100000).optional(),
  installments: z.number().int().min(1).max(12).default(1),
  amountReceived: z.number().nonnegative().optional(),
  pixKey: z.string().optional(),
  cardAuthorization: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados de pagamento inválidos" });
  }

  const data = parsed.data;
  const feeRate = data.method === "CREDITO"
    ? data.installments > 1 ? 0.0399 : 0.0299
    : data.method === "DEBITO" ? 0.0199 : 0;

  return prisma.$transaction(async (tx) => {
    let gross: number;
    let barberId: string | null = null;
    if (data.appointmentId) {
      const appointment = await tx.appointment.findUnique({
        where: { id: data.appointmentId },
        include: { barber: true, services: { include: { service: true } } },
      });
      if (!appointment) {
        throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
      }
      if (appointment.status === "FALTOU" || appointment.status === "CANCELADO") {
        throw createError({ statusCode: 409, statusMessage: "Status não permite pagamento" });
      }
      gross = Number(
        appointment.services
          .reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
          .toFixed(2),
      );
      barberId = appointment.barberId;
    } else {
      if (!data.grossAmount) {
        throw createError({ statusCode: 400, statusMessage: "Informe o valor da venda avulsa" });
      }
      gross = Number(data.grossAmount.toFixed(2));
    }

    if (data.method === "DINHEIRO" && (data.amountReceived ?? 0) < gross) {
      throw createError({ statusCode: 400, statusMessage: "Valor recebido insuficiente" });
    }

    const feeAmount = Number((gross * feeRate).toFixed(2));
    const netAmount = Number((gross - feeAmount).toFixed(2));
    const amountReceived = data.method === "DINHEIRO" ? Number((data.amountReceived ?? 0).toFixed(2)) : 0;
    const changeGiven = data.method === "DINHEIRO"
      ? Number((amountReceived - gross).toFixed(2))
      : 0;

    const payment = await tx.paymentTransaction.create({
      data: {
        appointmentId: data.appointmentId,
        method: data.method,
        status: data.method === "PIX" && data.timing === "PRESENCIAL_BALCAO" ? "PENDENTE" : "CONFIRMADO",
        timing: data.timing,
        grossAmount: gross,
        feeAmount,
        netAmount,
        installments: data.installments,
        amountReceived,
        changeGiven,
        pixKey: data.pixKey,
        cardAuthorization: data.cardAuthorization,
        paidAt: data.method === "PIX" && data.timing === "PRESENCIAL_BALCAO" ? null : new Date(),
      },
    });

    if (data.appointmentId && payment.status === "CONFIRMADO") {
      const appointment = await tx.appointment.findUnique({
        where: { id: data.appointmentId },
        include: { barber: true, services: true },
      });
      if (appointment) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: "CONCLUIDO" },
        });

        const existingCommission = await tx.commissionRecord.findUnique({
          where: {
            appointmentId_barberId: {
              appointmentId: appointment.id,
              barberId: appointment.barberId,
            },
          },
        });
        if (!existingCommission) {
          const rate = Number(appointment.barber.commissionRate);
          await tx.commissionRecord.create({
            data: {
              appointmentId: appointment.id,
              barberId: appointment.barberId,
              grossAmount: gross,
              commissionRate: rate,
              commissionAmount: Number((gross * rate).toFixed(2)),
            },
          });
        }
      }
    }

    return {
      ...payment,
      grossAmount: gross,
      feeAmount,
      netAmount,
      amountReceived,
      changeGiven,
    };
  });
});
