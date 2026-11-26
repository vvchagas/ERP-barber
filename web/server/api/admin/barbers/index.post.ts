import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";
import { barberCreateSchema } from "../../../utils/adminCatalogSchemas";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const parsed = barberCreateSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do barbeiro inválidos" });
  const barber = await prisma.barber.create({ data: parsed.data });
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Equipe atualizada",
    message: `${barber.name} foi adicionado(a) à equipe.`,
    metadata: { resource: "barber", id: barber.id, action: "created" },
  });
  await writeAccessLog(event, true, "admin_barber_created", "magic-key");
  return barber;
});
