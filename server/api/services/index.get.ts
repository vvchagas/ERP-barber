import { prisma } from "../../utils/prisma";

export default defineEventHandler(async () => {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return services.map((service) => ({
    ...service,
    price: Number(service.price),
  }));
});
