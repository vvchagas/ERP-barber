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

  const day = new Date(`${parsed.data.date}T09:00:00`);
  if (day.getTime() < Date.now()) {
    return [];
  }
  const barber = await prisma.barber.findFirst({
    where: { id: parsed.data.barberId, active: true },
    select: { id: true },
  });
  if (!barber) return [];
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: parsed.data.barberId,
      scheduledAt: { gte: day, lt: nextDay },
      status: { in: ["AGENDADO", "EM_ATENDIMENTO"] },
    },
    select: { scheduledAt: true, endsAt: true },
  });

  const slots: string[] = [];
  for (let minutes = 9 * 60; minutes < 19 * 60; minutes += 30) {
    const start = new Date(day);
    start.setMinutes(minutes);
    const end = new Date(start.getTime() + parsed.data.duration * 60_000);
    if (start.getTime() <= Date.now() || minutes + parsed.data.duration > 19 * 60) continue;

    const conflict = appointments.some(
      ({ scheduledAt, endsAt }) => start < endsAt && end > scheduledAt,
    );
    if (!conflict) slots.push(start.toISOString());
  }
  return slots;
});
