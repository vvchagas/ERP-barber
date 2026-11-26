import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";
import { isValidPromo, planPatchSchema } from "../../../utils/adminCatalogSchemas";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = z.string().min(1).max(191).safeParse(getRouterParam(event, "id"));
  const parsed = planPatchSchema.safeParse(await readBody(event));
  if (!id.success || !parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do plano inválidos" });
  const current = await prisma.subscriptionPlan.findUnique({ where: { id: id.data } });
  if (!current) throw createError({ statusCode: 404, statusMessage: "Plano não encontrado" });
  const price = parsed.data.price ?? Number(current.price);
  const promoPrice = parsed.data.promoPrice === undefined
    ? current.promoPrice === null ? null : Number(current.promoPrice)
    : parsed.data.promoPrice;
  if (!isValidPromo(price, promoPrice)) {
    throw createError({ statusCode: 400, statusMessage: "O preço promocional deve ser menor que o original" });
  }
  const cutCredits = parsed.data.cutCredits ?? current.cutCredits;
  const beardCredits = parsed.data.beardCredits ?? current.beardCredits;
  if (cutCredits + beardCredits < 1) {
    throw createError({ statusCode: 400, statusMessage: "O plano precisa incluir ao menos um crédito" });
  }
  const plan = await prisma.subscriptionPlan.update({
    where: { id: current.id },
    data: {
      ...parsed.data,
      promoPrice,
      promoLabel: promoPrice === null ? null : parsed.data.promoLabel ?? current.promoLabel ?? "PROMOÇÃO",
      servicesPerMonth: cutCredits + beardCredits,
    },
  });
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Clube VIP atualizado",
    message: `Os dados do plano ${plan.name} foram atualizados.`,
    metadata: { resource: "plan", id: plan.id, action: "updated" },
  });
  await writeAccessLog(event, true, "admin_plan_updated", "magic-key");
  return plan;
});
