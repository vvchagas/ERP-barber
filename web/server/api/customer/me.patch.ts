import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { createCustomerSession, getCustomerSessionPhone } from "../../utils/adminSession";
import { hashPassword, verifyPassword } from "../../utils/password";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(/^[0-9()+ -]{10,20}$/).optional(),
  email: z.string().trim().email().max(254).toLowerCase().nullable().optional(),
  avatarUrl: z.string().max(41000).nullable().optional(),
  silentCut: z.boolean().optional(),
  favoriteBarberId: z.string().min(1).max(191).nullable().optional(),
  seniorMode: z.boolean().optional(),
  fontScale: z.enum(["100", "115", "130"]).optional(),
  theme: z.enum(["light", "dark", "high-contrast"]).optional(),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8).max(128).optional(),
}).strict();

export default defineEventHandler(async (event) => {
  const phone = getCustomerSessionPhone(event);
  if (!phone) throw createError({ statusCode: 401, statusMessage: "Sessão do cliente não encontrada" });
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Dados do perfil inválidos" });
  const data = parsed.data;
  if (data.avatarUrl) {
    const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(data.avatarUrl);
    if (!match) throw createError({ statusCode: 400, statusMessage: "O avatar deve ser uma imagem WebP válida" });
    const base64 = match[1];
    if (!base64) throw createError({ statusCode: 400, statusMessage: "O avatar está vazio" });
    const avatarBytes = Buffer.from(base64, "base64").byteLength;
    if (avatarBytes > 30 * 1024) throw createError({ statusCode: 413, statusMessage: "O avatar deve ter no máximo 30 KB" });
  }

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer || customer.anonymizedAt) throw createError({ statusCode: 401, statusMessage: "Sessão inválida" });

  if (data.phone && data.phone !== customer.phone) {
    const owner = await prisma.customer.findUnique({ where: { phone: data.phone } });
    if (owner) throw createError({ statusCode: 409, statusMessage: "Este telefone já pertence a outro cliente" });
  }
  if (data.email) {
    const owner = await prisma.customer.findUnique({ where: { email: data.email } });
    if (owner && owner.id !== customer.id) throw createError({ statusCode: 409, statusMessage: "Este e-mail já pertence a outro cliente" });
  }

  let passwordHash = customer.passwordHash;
  let passwordSalt = customer.passwordSalt;
  if (data.newPassword) {
    if (!customer.passwordHash || !customer.passwordSalt || !data.currentPassword) {
      throw createError({ statusCode: 400, statusMessage: "Informe a senha atual" });
    }
    if (!verifyPassword(data.currentPassword, customer.passwordSalt, customer.passwordHash)) {
      throw createError({ statusCode: 401, statusMessage: "Senha atual incorreta" });
    }
    const credentials = hashPassword(data.newPassword);
    passwordHash = credentials.hash;
    passwordSalt = credentials.salt;
  }

  let updated;
  try {
    updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      avatarUrl: data.avatarUrl,
      silentCut: data.silentCut,
      silentPreference: data.silentCut,
      favoriteBarberId: data.favoriteBarberId,
      seniorMode: data.seniorMode,
      fontScale: data.fontScale,
      theme: data.theme,
      passwordHash,
        passwordSalt,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw createError({ statusCode: 409, statusMessage: "Telefone ou e-mail já pertence a outro cliente" });
    }
    throw error;
  }
  if (data.phone && data.phone !== customer.phone) createCustomerSession(event, updated.phone);

  return {
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
    silentCut: updated.silentCut,
    favoriteBarberId: updated.favoriteBarberId,
    seniorMode: updated.seniorMode,
    fontScale: updated.fontScale,
    theme: updated.theme,
  };
});
