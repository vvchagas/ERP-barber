import { z } from "zod";
import { prisma } from "../../utils/prisma";
import {
  getCustomerSessionPhone,
  isAdminSessionValid,
} from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";
import { createAdminNotification } from "../../utils/adminNotifications";

const bodySchema = z.object({
  appointmentId: z.string().min(1).max(191).optional(),
  serviceIds: z.array(z.string().min(1).max(191)).min(1).max(10).optional(),
  planId: z.string().min(1).max(191).optional(),
  method: z.enum(["PIX", "CREDITO", "DEBITO", "DINHEIRO"]),
  timing: z.enum(["PRESENCIAL_BALCAO", "LIQUIDADO_AGORA"]),
  grossAmount: z.number().positive().max(100000).optional(),
  installments: z.number().int().min(1).max(12).default(1),
  amountReceived: z.number().nonnegative().optional(),
  pixKey: z.string().optional(),
  cardAuthorization: z.string().optional(),
  gatewayProvider: z.string().max(50).optional(),
  gatewayTransactionId: z.string().max(191).optional(),
}).refine((data) => data.appointmentId || data.serviceIds || data.planId || data.grossAmount, {
  message: "Informe uma comanda, serviços ou plano",
});

export default defineEventHandler(async (event) => {
  const isAdmin = isAdminSessionValid(event);
  const customerPhone = getCustomerSessionPhone(event);
  if (!isAdmin && !customerPhone) {
    throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
  }
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados de pagamento inválidos" });
  }
  const data = parsed.data;
  if (!isAdmin && (data.method === "DINHEIRO" || data.timing !== "LIQUIDADO_AGORA")) {
    throw createError({ statusCode: 403, statusMessage: "Pagamento presencial deve ser registrado pela equipe" });
  }
  const feeRate = data.method === "CREDITO"
    ? data.installments > 1 ? 0.0399 : 0.0299
    : data.method === "DEBITO" ? 0.0199 : 0;

  const payment = await prisma.$transaction(async (tx) => {
    let gross: number;
    let barberId: string | null = null;
    let subscriptionPlan: { id: string; cutCredits: number; beardCredits: number; customerId: string } | null = null;
    let purchasePlanId: string | null = null;
    if (data.appointmentId) {
      const appointment = await tx.appointment.findUnique({
        where: { id: data.appointmentId },
        include: { barber: true, customer: true, services: true },
      });
      if (!appointment) {
        throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
      }
      if (!isAdmin && customerPhone !== appointment.customer.phone) {
        throw createError({ statusCode: 403, statusMessage: "Pagamento não autorizado" });
      }
      if (appointment.status === "FALTOU" || appointment.status === "CANCELADO") {
        throw createError({ statusCode: 409, statusMessage: "Status não permite pagamento" });
      }
      const existingPayment = await tx.paymentTransaction.findFirst({
        where: {
          appointmentId: appointment.id,
          status: { in: ["PENDENTE", "CONFIRMADO"] },
        },
        select: { id: true, status: true },
      });
      if (existingPayment) {
        throw createError({ statusCode: 409, statusMessage: "Este agendamento já possui um pagamento em aberto ou confirmado" });
      }
      const serviceIds = [...new Set(appointment.services.map((item) => item.serviceId))];
      const services = await tx.service.findMany({
        where: { id: { in: serviceIds }, active: true },
        select: { id: true, price: true, promoPrice: true },
      });
      if (services.length !== serviceIds.length) {
        throw createError({ statusCode: 409, statusMessage: "Um serviço desta comanda não está disponível" });
      }
      const grossCents = appointment.services.reduce((sum, item) => {
        const service = services.find((candidate) => candidate.id === item.serviceId);
        const originalCents = Math.round(Number(service?.price ?? 0) * 100);
        const promoCents = service?.promoPrice == null ? null : Math.round(Number(service.promoPrice) * 100);
        const priceCents = promoCents !== null && promoCents < originalCents ? promoCents : originalCents;
        return sum + priceCents * item.quantity;
      }, 0);
      gross = grossCents / 100;
      barberId = appointment.barberId;
    } else if (data.serviceIds) {
      const services = await tx.service.findMany({
        where: { id: { in: [...new Set(data.serviceIds)] }, active: true },
        select: { id: true, price: true, promoPrice: true },
      });
      if (services.length !== new Set(data.serviceIds).size) {
        throw createError({ statusCode: 400, statusMessage: "Um ou mais serviços não estão disponíveis" });
      }
      gross = services.reduce((sum, service) => {
        const originalCents = Math.round(Number(service.price) * 100);
        const promoCents = service.promoPrice === null ? null : Math.round(Number(service.promoPrice) * 100);
        return sum + (promoCents !== null && promoCents < originalCents ? promoCents : originalCents);
      }, 0) / 100;
    } else if (data.planId) {
      if (!customerPhone) {
        throw createError({ statusCode: 403, statusMessage: "Plano requer uma sessão válida do cliente" });
      }
      const plan = await tx.subscriptionPlan.findFirst({
        where: { id: data.planId, active: true },
        select: { id: true, price: true, promoPrice: true, cutCredits: true, beardCredits: true },
      });
      if (!plan) {
        throw createError({ statusCode: 404, statusMessage: "Plano não encontrado" });
      }
      const originalCents = Math.round(Number(plan.price) * 100);
      const promoCents = plan.promoPrice === null ? null : Math.round(Number(plan.promoPrice) * 100);
      gross = (promoCents !== null && promoCents < originalCents ? promoCents : originalCents) / 100;
      const customer = await tx.customer.findUnique({ where: { phone: customerPhone } });
      if (!customer) {
        throw createError({ statusCode: 404, statusMessage: "Cliente não encontrado" });
      }
      const activeSubscription = await tx.customerSubscription.findFirst({
        where: {
          customerId: customer.id,
          active: true,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (activeSubscription) {
        throw createError({ statusCode: 409, statusMessage: "Você já possui uma assinatura ativa" });
      }
      purchasePlanId = plan.id;
      subscriptionPlan = { ...plan, customerId: customer.id };
    } else if (isAdmin && data.grossAmount) {
      gross = Math.round(data.grossAmount * 100) / 100;
    } else {
      throw createError({ statusCode: 400, statusMessage: "Informe uma comanda, serviços ou plano" });
    }

    const grossCents = Math.round(gross * 100);
    if (data.method === "DINHEIRO" && Math.round((data.amountReceived ?? 0) * 100) < grossCents) {
      throw createError({ statusCode: 400, statusMessage: "Valor recebido insuficiente" });
    }

    const feeCents = Math.round(grossCents * feeRate);
    const netCents = grossCents - feeCents;
    const feeAmount = feeCents / 100;
    const netAmount = netCents / 100;
    const amountReceivedCents = data.method === "DINHEIRO"
      ? Math.round((data.amountReceived ?? 0) * 100)
      : 0;
    const amountReceived = amountReceivedCents / 100;
    const changeGiven = data.method === "DINHEIRO"
      ? (amountReceivedCents - grossCents) / 100
      : 0;

    const paymentStatus = isAdmin
      ? data.method === "PIX" && data.timing === "PRESENCIAL_BALCAO" ? "PENDENTE" : "CONFIRMADO"
      : "PENDENTE";
    const payment = await tx.paymentTransaction.create({
      data: {
        appointmentId: data.appointmentId,
        planId: purchasePlanId,
        method: data.method,
        status: paymentStatus,
        timing: data.timing,
        grossAmount: gross,
        feeAmount,
        netAmount,
        installments: data.installments,
        amountReceived,
        changeGiven,
        pixKey: data.pixKey,
        cardAuthorization: data.cardAuthorization,
        gatewayProvider: data.gatewayProvider,
        gatewayTransactionId: data.gatewayTransactionId,
        paidAt: paymentStatus === "CONFIRMADO" ? new Date() : null,
      },
    });

    if (subscriptionPlan && payment.status === "CONFIRMADO") {
      await tx.customerSubscription.updateMany({
        where: { customerId: subscriptionPlan.customerId, active: true },
        data: { active: false },
      });
      await tx.customerSubscription.create({
        data: {
          customerId: subscriptionPlan.customerId,
          planId: subscriptionPlan.id,
          remainingCredits: subscriptionPlan.cutCredits + subscriptionPlan.beardCredits,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          active: true,
        },
      });
      await tx.customer.update({
        where: { id: subscriptionPlan.customerId },
        data: { subscriptionId: subscriptionPlan.id },
      });
      await createAdminNotification({
        type: "VIP_SUBSCRIBED",
        title: "Nova assinatura VIP",
        message: `Um cliente assinou o plano ${subscriptionPlan.id}.`,
        metadata: { customerId: subscriptionPlan.customerId, planId: subscriptionPlan.id },
      }, tx);
    }

    if (data.appointmentId && payment.status === "CONFIRMADO") {
      const appointment = await tx.appointment.findUnique({
        where: { id: data.appointmentId },
        include: { barber: true, customer: true, services: true },
      });
      if (appointment) {
        if (appointment.status !== "CONCLUIDO") {
          await tx.appointment.update({
            where: { id: appointment.id },
            data: { status: "CONCLUIDO" },
          });
        }

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
              commissionAmount: Math.round(grossCents * rate) / 100,
            },
          });
        }
        if (appointment.status !== "CONCLUIDO") {
          await createAdminNotification({
            type: "APPOINTMENT_COMPLETED",
            title: "Atendimento concluído",
            message: `O atendimento de ${appointment.customer.name} foi concluído após pagamento.`,
            metadata: { appointmentId: appointment.id, customerId: appointment.customerId },
          }, tx);
        }
      }
    }
    if (payment.status === "CONFIRMADO") {
      await createAdminNotification({
        type: "PAYMENT_CONFIRMED",
        title: "Pagamento confirmado",
        message: `Pagamento de R$ ${gross.toFixed(2)} confirmado via ${data.method}.`,
        metadata: { paymentId: payment.id, appointmentId: data.appointmentId, planId: purchasePlanId },
      }, tx);
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
  await writeAccessLog(event, true, "payment_checkout", undefined);
  return payment;
});
