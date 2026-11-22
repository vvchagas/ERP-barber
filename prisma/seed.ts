import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashPassword } from "../server/utils/password";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("ADMIN_USER and ADMIN_PASSWORD are required");
  }

  const { salt, hash } = hashPassword(password);
  await prisma.adminUser.upsert({
    where: { username },
    update: {},
    create: { username, passwordSalt: salt, passwordHash: hash },
  });

  await Promise.all([
    prisma.barber.upsert({
      where: { id: "barber-rafael" },
      update: { name: "Rafael", commissionRate: 0.30, active: true },
      create: { id: "barber-rafael", name: "Rafael", commissionRate: 0.30 },
    }),
    prisma.barber.upsert({
      where: { id: "barber-lucas" },
      update: { name: "Lucas", commissionRate: 0.30, active: true },
      create: { id: "barber-lucas", name: "Lucas", commissionRate: 0.30 },
    }),
  ]);

  const services = [
    ["Corte masculino", "Corte completo com acabamento", 40, 45],
    ["Barba", "Barba alinhada e acabamento", 30, 35],
    ["Combo corte + barba", "Corte e barba com acabamento", 70, 70],
    ["Platinado", "Descoloracao integral do cabelo", 180, 180],
  ] as const;

  for (const [name, description, durationMin, price] of services) {
    await prisma.service.upsert({
      where: { id: `service-${name.toLowerCase().replaceAll(" ", "-").replaceAll("+", "mais")}` },
      update: { name, description, durationMin, price, active: true },
      create: {
        id: `service-${name.toLowerCase().replaceAll(" ", "-").replaceAll("+", "mais")}`,
        name,
        description,
        durationMin,
        price,
      },
    });
  }

  await prisma.subscriptionPlan.upsert({
    where: { id: "plan-clube-vip-mensal" },
    update: { name: "Clube VIP Mensal", description: "2 cortes por mes + barba", price: 149, servicesPerMonth: 2, active: true },
    create: { id: "plan-clube-vip-mensal", name: "Clube VIP Mensal", description: "2 cortes por mes + barba", price: 149, servicesPerMonth: 2 },
  });
  await prisma.subscriptionPlan.upsert({
    where: { id: "plan-clube-vip-premium" },
    update: { name: "Clube VIP Premium", description: "4 cortes por mes + barba", price: 249, servicesPerMonth: 4, active: true },
    create: { id: "plan-clube-vip-premium", name: "Clube VIP Premium", description: "4 cortes por mes + barba", price: 249, servicesPerMonth: 4 },
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha no seed");
    process.exitCode = 1;
  });
