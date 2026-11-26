import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";
import { barberPatchSchema } from "../../../utils/adminCatalogSchemas";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = z.string().min(1).max(191).safeParse(getRouterParam(event, "id"));
  const parsed = barberPatchSchema.safeParse(await readBody(event));
  if (!id.success || !parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do barbeiro inválidos" });
  const barber = await prisma.barber.update({
    where: { id: id.data },
    data: parsed.data,
  }).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      throw createError({ statusCode: 404, statusMessage: "Barbeiro não encontrado" });
    }
    throw error;
  });
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Equipe atualizada",
    message: `Os dados de ${barber.name} foram atualizados.`,
    metadata: { resource: "barber", id: barber.id, action: "updated" },
  });
  await writeAccessLog(event, true, "admin_barber_updated", "admin-session");
  return barber;
});
