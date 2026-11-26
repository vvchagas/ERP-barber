import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../../../utils/prisma";
import { requireAdminSession } from "../../../../utils/adminSession";
import { writeAccessLog } from "../../../../utils/accessLog";

const paramSchema = z.object({ id: z.string().min(1).max(191) });

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const params = paramSchema.safeParse(getRouterParam(event, "id") ? { id: getRouterParam(event, "id") } : {});
  if (!params.success) throw createError({ statusCode: 400, statusMessage: "Cliente inválido" });

  const customer = await prisma.customer.findUnique({ where: { id: params.data.id } });
  if (!customer) throw createError({ statusCode: 404, statusMessage: "Cliente não encontrado" });
  const salt = randomBytes(16).toString("hex");
  const anonymousHash = createHash("sha256").update(`${customer.id}:${salt}`).digest("hex");

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      name: `Cliente anonimizado ${anonymousHash.slice(0, 8)}`,
      phone: `anon-${anonymousHash.slice(0, 24)}`,
      email: null,
      notes: "",
      passwordHash: null,
      passwordSalt: null,
      anonymousHash,
    },
  });
  await prisma.appointment.updateMany({
    where: { customerId: customer.id },
    data: { notes: "" },
  });
  await writeAccessLog(event, true, "customer_anonymized", undefined);
  return { anonymized: true };
});
