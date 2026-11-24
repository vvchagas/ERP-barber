import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  await writeAccessLog(event, true, "dashboard_access", undefined);
  const [appointments, payments, commissions] = await Promise.all([
    prisma.appointment.findMany({
      include: { barber: true, services: { include: { service: true } } },
    }),
    prisma.paymentTransaction.findMany({
      where: { status: "CONFIRMADO" },
      orderBy: { paidAt: "asc" },
    }),
    prisma.commissionRecord.findMany({
      include: { barber: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const gross = payments.reduce((sum, payment) => sum + Number(payment.grossAmount), 0);
  const fees = payments.reduce((sum, payment) => sum + Number(payment.feeAmount), 0);
  const net = gross - fees;
  const missed = appointments.filter((appointment) => appointment.status === "FALTOU").length;
  const absentRate = appointments.length ? (missed / appointments.length) * 100 : 0;

  const daily = new Map<string, number>();
  payments.forEach((payment) => {
    const date = (payment.paidAt ?? payment.createdAt).toISOString().slice(0, 10);
    daily.set(date, (daily.get(date) ?? 0) + Number(payment.grossAmount));
  });

  const commissionByBarber = new Map<string, { barberId: string; name: string; total: number }>();
  commissions.forEach((commission) => {
    const current = commissionByBarber.get(commission.barberId) ?? {
      barberId: commission.barberId,
      name: commission.barber.name,
      total: 0,
    };
    current.total += Number(commission.commissionAmount);
    commissionByBarber.set(commission.barberId, current);
  });

  const paymentByMethod = {
    PIX: payments.filter((payment) => payment.method === "PIX").reduce((sum, payment) => sum + Number(payment.grossAmount), 0),
    CREDITO: payments.filter((payment) => payment.method === "CREDITO").reduce((sum, payment) => sum + Number(payment.grossAmount), 0),
    DEBITO: payments.filter((payment) => payment.method === "DEBITO").reduce((sum, payment) => sum + Number(payment.grossAmount), 0),
    DINHEIRO: payments.filter((payment) => payment.method === "DINHEIRO").reduce((sum, payment) => sum + Number(payment.grossAmount), 0),
  };

  return {
    gross,
    net,
    ticketAverage: payments.length ? gross / payments.length : 0,
    absentRate,
    daily: Array.from(daily, ([date, amount]) => ({ date, amount })),
    commissionsByBarber: Array.from(commissionByBarber.values()),
    paymentByMethod,
  };
});
