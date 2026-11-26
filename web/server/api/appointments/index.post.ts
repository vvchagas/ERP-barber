import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { createCustomerSession } from "../../utils/adminSession";
import { createAdminNotification } from "../../utils/adminNotifications";

const bodySchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^[0-9()+ -]{10,20}$/),
  customerEmail: z.string().email().optional(),
  barberId: z.string().min(1).max(191),
  scheduledAt: z.string().datetime({ offset: true }),
  serviceIds: z.array(z.string().min(1).max(191)).min(1).max(10),
  noConversation: z.boolean().default(false),
  notes: z.string().trim().max(1000).default(""),
  paymentTiming: z.enum(["PRESENCIAL_BALCAO", "LIQUIDADO_AGORA"]).default("PRESENCIAL_BALCAO"),
  lgpdConsent: z.literal(true),
  usePlanCredit: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  const result = bodySchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados do agendamento inválidos" });
  }

  const data = result.data;
  return prisma.$transaction(async (tx) => {
    const barber = await tx.barber.findFirst({
      where: { id: data.barberId, active: true },
      select: { id: true },
    });
    if (!barber) {
      throw createError({ statusCode: 404, statusMessage: "Barbeiro não disponível" });
    }

    const services = await tx.service.findMany({
      where: { id: { in: data.serviceIds }, active: true },
    });
    if (services.length !== new Set(data.serviceIds).size) {
      throw createError({ statusCode: 400, statusMessage: "Um ou mais serviços não estão disponíveis" });
    }

    const duration = services.reduce((total, service) => total + service.durationMin, 0);
    const start = new Date(data.scheduledAt);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      throw createError({ statusCode: 400, statusMessage: "Não é possível agendar em um horário passado" });
    }
    const saoPauloParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(start);
    const weekday = saoPauloParts.find((part) => part.type === "weekday")?.value;
    const hour = Number(saoPauloParts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(saoPauloParts.find((part) => part.type === "minute")?.value ?? "0");
    if (weekday === "Sun" || hour < 8 || hour >= 19 || (hour === 18 && minute > 30)) {
      throw createError({ statusCode: 400, statusMessage: "Horário fora do funcionamento" });
    }
    const end = new Date(start.getTime() + duration * 60_000);
    const endParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(end);
    const endHour = Number(endParts.find((part) => part.type === "hour")?.value ?? "24");
    const endMinute = Number(endParts.find((part) => part.type === "minute")?.value ?? "0");
    if (endHour > 19 || (endHour === 19 && endMinute > 0)) {
      throw createError({ statusCode: 400, statusMessage: "O serviço ultrapassa o horário de funcionamento" });
    }
    await tx.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      `appointment:${data.barberId}:${start.toISOString().slice(0, 10)}`,
    );

    const conflict = await tx.appointment.findFirst({
      where: {
        barberId: data.barberId,
        status: { in: ["AGENDADO", "EM_ATENDIMENTO"] },
        scheduledAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { id: true },
    });
    if (conflict) {
      throw createError({ statusCode: 409, statusMessage: "Este horário acabou de ser ocupado" });
    }

    const existingCustomer = await tx.customer.findUnique({
      where: { phone: data.customerPhone },
      select: { id: true },
    });
    const customer = await tx.customer.upsert({
      where: { phone: data.customerPhone },
      update: { name: data.customerName, email: data.customerEmail, lgpdConsentAt: new Date(), notes: data.notes },
      create: {
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
        lgpdConsentAt: new Date(),
        notes: data.notes,
      },
    });

    if (data.usePlanCredit) {
      const subscription = await tx.customerSubscription.findFirst({
        where: {
          customerId: customer.id,
          active: true,
          expiresAt: { gt: new Date() },
          remainingCredits: { gt: 0 },
        },
        orderBy: { expiresAt: "asc" },
      });
      if (!subscription) {
        throw createError({ statusCode: 409, statusMessage: "Você não possui créditos ativos para este agendamento" });
      }
      await tx.customerSubscription.update({
        where: { id: subscription.id },
        data: { remainingCredits: { decrement: 1 } },
      });
    }

    const appointment = await tx.appointment.create({
      data: {
        customerId: customer.id,
        barberId: data.barberId,
        scheduledAt: start,
        endsAt: end,
        noConversation: data.noConversation,
        notes: data.notes,
        paymentTiming: data.paymentTiming,
        services: {
          create: services.map((service) => ({
            serviceId: service.id,
            quantity: 1,
            unitPrice: service.promoPrice !== null
              && Math.round(Number(service.promoPrice) * 100) < Math.round(Number(service.price) * 100)
              ? service.promoPrice
              : service.price,
          })),
        },
      },
      include: { customer: true, barber: true, services: { include: { service: true } } },
    });
    if (!existingCustomer) {
      await createAdminNotification({
        type: "CUSTOMER_NEW",
        title: "Novo cadastro de cliente",
        message: `${customer.name} realizou o primeiro agendamento.`,
        metadata: { customerId: customer.id },
      }, tx);
    }
    await createAdminNotification({
      type: "APPOINTMENT_NEW",
      title: "Novo agendamento",
      message: `${customer.name} agendou com ${appointment.barber.name}.`,
      metadata: { appointmentId: appointment.id, customerId: customer.id },
    }, tx);
    createCustomerSession(event, customer.phone);

    return {
      ...appointment,
      services: appointment.services.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    };
  });
});
