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
      update: {
        name: "Rafael",
        specialty: "Cortes clássicos e fades",
        bio: "Especialista em acabamento preciso e estilos modernos.",
        photoUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
        active: true,
      },
      create: {
        id: "barber-rafael",
        name: "Rafael",
        specialty: "Cortes clássicos e fades",
        bio: "Especialista em acabamento preciso e estilos modernos.",
        photoUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
      },
    }),
    prisma.barber.upsert({
      where: { id: "barber-lucas" },
      update: {
        name: "Lucas",
        specialty: "Barbas e descoloração",
        bio: "Foco em alinhamento de barba, técnicas de clareamento e contornos.",
        photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
        active: true,
      },
      create: {
        id: "barber-lucas",
        name: "Lucas",
        specialty: "Barbas e descoloração",
        bio: "Foco em alinhamento de barba, técnicas de clareamento e contornos.",
        photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
      },
    }),
  ]);

  const services = [
    ["Corte masculino", "Corte completo com acabamento", 40, 45],
    ["Barba", "Barba alinhada e acabamento", 30, 35],
    ["Combo corte + barba", "Corte e barba com acabamento", 70, 70],
    ["Platinado", "Descoloração integral do cabelo", 180, 180],
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

  const plans = [
    ["plan-corte-essencial", "Plano Corte Essencial", "2 cortes por mês", 149, 2, 0],
    ["plan-barba-alinhada", "Plano Barba Alinhada", "4 barbas por mês", 99, 0, 4],
    ["plan-combo-classico", "Plano Combo Clássico", "2 cortes + 2 barbas por mês", 179, 2, 2],
    ["plan-vip-black", "Plano VIP Black", "4 cortes + 4 barbas + sobrancelha e toalha quente por mês", 249, 4, 4],
  ] as const;
  for (const [id, name, description, price, cutCredits, beardCredits] of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id },
      update: { name, description, price, servicesPerMonth: cutCredits + beardCredits, cutCredits, beardCredits, active: true },
      create: { id, name, description, price, servicesPerMonth: cutCredits + beardCredits, cutCredits, beardCredits },
    });
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha no seed");
    process.exitCode = 1;
  });
