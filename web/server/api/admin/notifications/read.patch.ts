import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";

const bodySchema = z.object({
  all: z.boolean().optional(),
  id: z.string().min(1).max(191).optional(),
}).strict().refine((value) => value.all === true || Boolean(value.id), {
  message: "Informe uma notificação ou selecione todas",
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados inválidos" });
  }
  const result = await prisma.adminNotification.updateMany({
    where: parsed.data.all ? { read: false } : { id: parsed.data.id, read: false },
    data: { read: true },
  });
  await writeAccessLog(event, true, "admin_notifications_read", "admin-session");
  return { updated: result.count };
});
