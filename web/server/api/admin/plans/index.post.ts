import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";
import { isValidPromo, planCreateSchema } from "../../../utils/adminCatalogSchemas";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const parsed = planCreateSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do plano inválidos" });
  const data = parsed.data;
  if (!isValidPromo(data.price, data.promoPrice)) {
    throw createError({ statusCode: 400, statusMessage: "O preço promocional deve ser menor que o original" });
  }
  const plan = await prisma.subscriptionPlan.create({
    data: {
      ...data,
      promoPrice: data.promoPrice ?? null,
      promoLabel: data.promoPrice == null ? null : data.promoLabel || "PROMOÇÃO",
      servicesPerMonth: data.cutCredits + data.beardCredits,
    },
  });
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Clube VIP atualizado",
    message: `O plano ${plan.name} foi cadastrado.`,
    metadata: { resource: "plan", id: plan.id, action: "created" },
  });
  await writeAccessLog(event, true, "admin_plan_created", "admin-session");
  return plan;
});
