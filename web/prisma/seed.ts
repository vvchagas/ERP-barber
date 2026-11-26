import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail) {
    await prisma.customer.updateMany({
      where: { email: { equals: ownerEmail, mode: "insensitive" } },
      data: { role: "ADMIN" },
    });
  }

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
    prisma.barber.upsert({
      where: { id: "barber-mateus" },
      update: {
        name: "Mateus",
        specialty: "Cortes infantis e atendimento familiar",
        bio: "Atendimento paciente e acolhedor para crianças e famílias.",
        photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
        active: true,
      },
      create: {
        id: "barber-mateus",
        name: "Mateus",
        specialty: "Cortes infantis e atendimento familiar",
        bio: "Atendimento paciente e acolhedor para crianças e famílias.",
        photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
      },
    }),
    prisma.barber.upsert({
      where: { id: "barber-andre" },
      update: {
        name: "André",
        specialty: "Barba tradicional e toalha quente",
        bio: "Especialista em barba clássica, navalha e ritual de toalha quente.",
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
        active: true,
      },
      create: {
        id: "barber-andre",
        name: "André",
        specialty: "Barba tradicional e toalha quente",
        bio: "Especialista em barba clássica, navalha e ritual de toalha quente.",
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=85",
        commissionRate: 0.30,
      },
    }),
  ]);

  const services = [
    ["service-corte-masculino", "Corte masculino", "Corte completo com acabamento", 40, 35, 30, "PROMOÇÃO"],
    ["service-barba", "Barba", "Barba alinhada e acabamento", 30, 35, null, null],
    ["service-combo-corte-mais-barba", "Combo corte + barba", "Corte e barba com acabamento", 70, 70, null, null],
    ["service-platinado", "Platinado", "Descoloração integral do cabelo", 180, 180, null, null],
    ["service-corte-infantil", "Corte infantil", "Corte com atendimento acolhedor para crianças", 35, 30, null, null],
    ["service-sobrancelha-toalha-quente", "Sobrancelha e toalha quente", "Acabamento de sobrancelha com toalha quente", 25, 30, null, null],
  ] as const;

  for (const [id, name, description, durationMin, price, promoPrice, promoLabel] of services) {
    await prisma.service.upsert({
      where: { id },
      update: { name, description, durationMin, price, promoPrice, promoLabel, active: true },
      create: {
        id,
        name,
        description,
        durationMin,
        price,
        promoPrice,
        promoLabel,
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
      update: {
        name,
        description,
        price,
        servicesPerMonth: cutCredits + beardCredits,
        cutCredits,
        beardCredits,
        rules: "Créditos válidos por 30 dias. Atendimento de segunda a sábado, das 08h às 19h. Cancelamento com pelo menos 2 horas de antecedência.",
        active: true,
      },
      create: {
        id,
        name,
        description,
        price,
        servicesPerMonth: cutCredits + beardCredits,
        cutCredits,
        beardCredits,
        rules: "Créditos válidos por 30 dias. Atendimento de segunda a sábado, das 08h às 19h. Cancelamento com pelo menos 2 horas de antecedência.",
      },
    });
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha no seed");
    process.exitCode = 1;
  });
