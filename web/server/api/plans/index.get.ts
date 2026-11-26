import { prisma } from "../../utils/prisma";

export default defineEventHandler(async () => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });
  return plans.map((plan) => ({
    ...plan,
    price: Number(plan.price),
    promoPrice: plan.promoPrice === null ? null : Number(plan.promoPrice),
  }));
});
