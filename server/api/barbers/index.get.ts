import { prisma } from "../../utils/prisma";

export default defineEventHandler(async () => {
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return barbers.map((barber) => ({
    ...barber,
    commissionRate: Number(barber.commissionRate),
  }));
});
