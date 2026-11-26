import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = z.string().min(1).max(191).safeParse(getRouterParam(event, "id"));
  if (!id.success) throw createError({ statusCode: 400, statusMessage: "Plano inválido" });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: id.data } });
  if (!plan) throw createError({ statusCode: 404, statusMessage: "Plano não encontrado" });
  const [customers, subscriptions, payments] = await Promise.all([
    prisma.customer.count({ where: { subscriptionId: plan.id } }),
    prisma.customerSubscription.count({ where: { planId: plan.id } }),
    prisma.paymentTransaction.count({ where: { planId: plan.id } }),
  ]);
  const archived = customers + subscriptions + payments > 0;
  if (archived) {
    await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { active: false } });
  } else {
    await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
  }
  await createAdminNotification({
    type: "TEAM_UPDATE",
    title: "Clube VIP atualizado",
    message: `O plano ${plan.name} foi removido do catálogo ativo.`,
    metadata: { resource: "plan", id: plan.id, action: "deleted" },
  });
  await writeAccessLog(event, true, "admin_plan_deleted", "admin-session");
  return { deleted: true, archived };
});
