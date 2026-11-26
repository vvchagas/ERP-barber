import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = z.string().min(1).max(191).safeParse(getRouterParam(event, "id"));
  if (!id.success) throw createError({ statusCode: 400, statusMessage: "Serviço inválido" });
  const service = await prisma.service.findUnique({ where: { id: id.data } });
  if (!service) throw createError({ statusCode: 404, statusMessage: "Serviço não encontrado" });
  const appointments = await prisma.appointmentService.count({ where: { serviceId: service.id } });
  if (appointments > 0) {
    await prisma.service.update({ where: { id: service.id }, data: { active: false } });
  } else {
    await prisma.service.delete({ where: { id: service.id } });
  }
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Serviços e promoções atualizados",
    message: `O serviço ${service.name} foi removido do catálogo ativo.`,
    metadata: { resource: "service", id: service.id, action: "deleted" },
  });
  await writeAccessLog(event, true, "admin_service_deleted", "admin-session");
  return { deleted: true, archived: appointments > 0 };
});
