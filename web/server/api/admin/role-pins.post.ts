import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { requireAdminSession } from "../../utils/adminSession";

const bodySchema = z.object({
  targetRole: z.enum(["BARBER", "ADMIN"]),
}).strict();

export default defineEventHandler(async (event) => {
  const admin = await requireAdminSession(event);
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Cargo de destino inválido" });
  }

  const pin = randomInt(10000000, 99999999).toString();
  const pinHash = createHash("sha256").update(pin).digest("hex");
  await prisma.roleInvitePin.create({
    data: {
      pinHash,
      targetRole: parsed.data.targetRole,
      createdByCustomerId: admin.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  return { pin, expiresInSeconds: 15 * 60 };
});
