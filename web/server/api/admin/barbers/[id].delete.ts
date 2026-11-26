import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = z.string().min(1).max(191).safeParse(getRouterParam(event, "id"));
  if (!id.success) throw createError({ statusCode: 400, statusMessage: "Barbeiro inválido" });
  const barber = await prisma.barber.findUnique({ where: { id: id.data } });
  if (!barber) throw createError({ statusCode: 404, statusMessage: "Barbeiro não encontrado" });
  const appointments = await prisma.appointment.count({ where: { barberId: barber.id } });
  if (appointments > 0) {
    await prisma.barber.update({ where: { id: barber.id }, data: { active: false } });
  } else {
    await prisma.barber.delete({ where: { id: barber.id } });
  }
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Equipe atualizada",
    message: `${barber.name} foi removido(a) da equipe ativa.`,
    metadata: { resource: "barber", id: barber.id, action: "deleted" },
  });
  await writeAccessLog(event, true, "admin_barber_deleted", "admin-session");
  return { deleted: true, archived: appointments > 0 };
});
