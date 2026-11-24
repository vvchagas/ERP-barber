import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  await writeAccessLog(event, true, "appointments_list", undefined);
  const appointments = await prisma.appointment.findMany({
    include: {
      customer: true,
      barber: true,
      services: { include: { service: true } },
      payments: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  return appointments.map((appointment) => ({
    ...appointment,
    services: appointment.services.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    })),
    payments: appointment.payments.map((payment) => ({
      ...payment,
      grossAmount: Number(payment.grossAmount),
      feeAmount: Number(payment.feeAmount),
      netAmount: Number(payment.netAmount),
      amountReceived: Number(payment.amountReceived),
      changeGiven: Number(payment.changeGiven),
    })),
  }));
});
