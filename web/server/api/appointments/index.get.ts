import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  await writeAccessLog(event, true, "appointments_list", undefined);
  const appointments = await prisma.appointment.findMany({
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      customer: { select: { id: true, name: true } },
      barber: { select: { id: true, name: true } },
      services: {
        select: {
          quantity: true,
          unitPrice: true,
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return appointments.map((appointment) => ({
    ...appointment,
    services: appointment.services.map((item) => ({
      unitPrice: Number(item.unitPrice),
    })),
  }));
});
