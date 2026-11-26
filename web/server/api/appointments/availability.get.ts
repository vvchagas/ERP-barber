import { z } from "zod";
import { prisma } from "../../utils/prisma";

const querySchema = z.object({
  barberId: z.string().min(1).max(191),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`))),
  duration: z.coerce.number().int().min(15).max(240).default(30),
});

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Parâmetros de disponibilidade inválidos" });
  }

  const day = new Date(`${parsed.data.date}T00:00:00-03:00`);
  if (Number.isNaN(day.getTime()) || day.getTime() <= Date.now() || day.getDay() === 0) {
    return [];
  }
  const barber = await prisma.barber.findFirst({
    where: { id: parsed.data.barberId, active: true },
    select: { id: true },
  });
  if (!barber) return [];
  const nextDayUtc = new Date(day);
  nextDayUtc.setDate(nextDayUtc.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: parsed.data.barberId,
      scheduledAt: { gte: day, lt: nextDayUtc },
      status: { in: ["AGENDADO", "EM_ATENDIMENTO"] },
    },
    select: { scheduledAt: true, endsAt: true },
  });

  const slots: string[] = [];
  for (let minutes = 8 * 60; minutes < 19 * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const start = new Date(`${parsed.data.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`);
    const end = new Date(start.getTime() + parsed.data.duration * 60_000);
    if (start.getTime() <= Date.now() || minutes + parsed.data.duration > 19 * 60) continue;

    const conflict = appointments.some(
      ({ scheduledAt, endsAt }) => start < endsAt && end > scheduledAt,
    );
    if (!conflict) slots.push(start.toISOString());
  }
  return slots;
});
