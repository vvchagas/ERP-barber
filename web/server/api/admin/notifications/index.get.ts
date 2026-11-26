import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";

const querySchema = z.object({
  type: z.enum([
    "APPOINTMENT_NEW",
    "APPOINTMENT_CANCELED",
    "APPOINTMENT_COMPLETED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_TEST",
    "CUSTOMER_NEW",
    "VIP_SUBSCRIBED",
    "TEAM_UPDATE",
  ]).optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  await writeAccessLog(event, true, "admin_notifications_list", "admin-session");
  const parsed = querySchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Filtro de notificações inválido" });
  }
  const where = parsed.data.type ? { type: parsed.data.type } : {};
  const [notifications, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parsed.data.take,
    }),
    prisma.adminNotification.count({ where: { read: false } }),
  ]);
  return { notifications, unreadCount };
});
