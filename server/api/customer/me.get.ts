import { prisma } from "../../utils/prisma";
import { getCustomerSessionPhone } from "../../utils/adminSession";

export default defineEventHandler(async (event) => {
  const phone = getCustomerSessionPhone(event);
  if (!phone) throw createError({ statusCode: 401, statusMessage: "Sessão do cliente não encontrada" });

  const customer = await prisma.customer.findUnique({
    where: { phone },
    include: {
      subscriptions: {
        where: { active: true, expiresAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { expiresAt: "asc" },
      },
    },
  });
  if (!customer || customer.anonymizedAt) {
    throw createError({ statusCode: 401, statusMessage: "Sessão do cliente não encontrada" });
  }

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    avatarUrl: customer.avatarUrl,
    silentCut: customer.silentCut,
    silentPreference: customer.silentPreference,
    favoriteBarberId: customer.favoriteBarberId,
    seniorMode: customer.seniorMode,
    fontScale: customer.fontScale,
    theme: customer.theme,
    lgpdConsent: customer.lgpdConsent,
    lgpdConsentAt: customer.lgpdConsentAt,
    subscriptions: customer.subscriptions.map((subscription) => ({
      id: subscription.id,
      remainingCredits: subscription.remainingCredits,
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      active: subscription.active,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description,
        price: Number(subscription.plan.price),
        cutCredits: subscription.plan.cutCredits,
        beardCredits: subscription.plan.beardCredits,
      },
    })),
  };
});
