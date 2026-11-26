import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  await writeAccessLog(event, true, "admin_catalog_access", "magic-key");
  const [barbers, services, plans, customers] = await Promise.all([
    prisma.barber.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.service.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.subscriptionPlan.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({
      where: { anonymizedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        subscriptions: {
          where: { active: true, expiresAt: { gt: new Date() } },
          select: { id: true, remainingCredits: true, expiresAt: true, plan: { select: { name: true } } },
          orderBy: { expiresAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return {
    barbers: barbers.map((barber) => ({ ...barber, commissionRate: Number(barber.commissionRate) })),
    services: services.map((service) => ({
      ...service,
      price: Number(service.price),
      promoPrice: service.promoPrice === null ? null : Number(service.promoPrice),
    })),
    plans: plans.map((plan) => ({
      ...plan,
      price: Number(plan.price),
      promoPrice: plan.promoPrice === null ? null : Number(plan.promoPrice),
    })),
    customers,
  };
});
