import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";
import { isValidPromo, serviceCreateSchema } from "../../../utils/adminCatalogSchemas";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const parsed = serviceCreateSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do serviço inválidos" });
  const data = parsed.data;
  if (!isValidPromo(data.price, data.promoPrice)) {
    throw createError({ statusCode: 400, statusMessage: "O preço promocional deve ser menor que o original" });
  }
  const service = await prisma.service.create({
    data: {
      ...data,
      promoPrice: data.promoPrice ?? null,
      promoLabel: data.promoPrice == null ? null : data.promoLabel || "PROMOÇÃO",
    },
  });
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Serviços e promoções atualizados",
    message: `O serviço ${service.name} foi cadastrado.`,
    metadata: { resource: "service", id: service.id, action: "created" },
  });
  await writeAccessLog(event, true, "admin_service_created", "admin-session");
  return service;
});
