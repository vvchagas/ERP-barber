import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
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
  }));
});
