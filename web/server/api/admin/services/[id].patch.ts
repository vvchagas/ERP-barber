import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";
import { isValidPromo, servicePatchSchema } from "../../../utils/adminCatalogSchemas";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = z.string().min(1).max(191).safeParse(getRouterParam(event, "id"));
  const parsed = servicePatchSchema.safeParse(await readBody(event));
  if (!id.success || !parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do serviço inválidos" });
  const current = await prisma.service.findUnique({ where: { id: id.data } });
  if (!current) throw createError({ statusCode: 404, statusMessage: "Serviço não encontrado" });
  const price = parsed.data.price ?? Number(current.price);
  const promoPrice = parsed.data.promoPrice === undefined
    ? current.promoPrice === null ? null : Number(current.promoPrice)
    : parsed.data.promoPrice;
  if (!isValidPromo(price, promoPrice)) {
    throw createError({ statusCode: 400, statusMessage: "O preço promocional deve ser menor que o original" });
  }
  const service = await prisma.service.update({
    where: { id: current.id },
    data: {
      ...parsed.data,
      promoPrice,
      promoLabel: promoPrice === null ? null : parsed.data.promoLabel ?? current.promoLabel ?? "PROMOÇÃO",
    },
  });
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Serviços e promoções atualizados",
    message: `Os dados do serviço ${service.name} foram atualizados.`,
    metadata: { resource: "service", id: service.id, action: "updated" },
  });
  await writeAccessLog(event, true, "admin_service_updated", "admin-session");
  return service;
});
