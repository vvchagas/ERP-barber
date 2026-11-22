import { z } from "zod";
import { prisma } from "../../../utils/prisma";
import { requireAdminSession } from "../../../utils/adminSession";

const paramsSchema = z.object({ id: z.string().min(1).max(191) });
const bodySchema = z.object({
  status: z.enum(["AGENDADO", "EM_ATENDIMENTO", "CONCLUIDO", "FALTOU", "CANCELADO"]),
});

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  const params = paramsSchema.safeParse(getRouterParams(event));
  const body = bodySchema.safeParse(await readBody(event));
  if (!params.success || !body.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados inválidos" });
  }

  return prisma.appointment.update({
    where: { id: params.data.id },
    data: { status: body.data.status },
    include: { customer: true, barber: true, payments: true },
  });
});
