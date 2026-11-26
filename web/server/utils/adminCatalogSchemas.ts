import { z } from "zod";

const photoUrlSchema = z.string().max(40_000).nullable().optional().refine((value) => {
  if (!value) return true;
  if (value.startsWith("data:image/webp;base64,")) return value.length <= 30_000;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use uma URL HTTPS ou uma imagem WebP de até 30 KB");

const barberBaseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  specialty: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1000),
  photoUrl: photoUrlSchema,
}).strict();

export const barberCreateSchema = barberBaseSchema.extend({
  bio: z.string().trim().max(1000).default(""),
  active: z.boolean().default(true),
}).strict();

export const barberPatchSchema = barberBaseSchema.extend({
  active: z.boolean(),
}).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "Informe ao menos um campo",
);

const moneySchema = z.number().finite().min(0).max(100_000);
const promoPriceSchema = moneySchema.nullable().optional();

const serviceBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  price: moneySchema,
  promoPrice: promoPriceSchema,
  promoLabel: z.string().trim().max(40).nullable().optional(),
  durationMin: z.number().int().min(5).max(480),
}).strict();

export const serviceCreateSchema = serviceBaseSchema.extend({
  description: z.string().trim().max(1000).default(""),
  active: z.boolean().default(true),
}).strict();

export const servicePatchSchema = serviceBaseSchema.extend({
  active: z.boolean(),
}).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "Informe ao menos um campo",
);

const planBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  price: moneySchema,
  promoPrice: promoPriceSchema,
  promoLabel: z.string().trim().max(40).nullable().optional(),
  cutCredits: z.number().int().min(0).max(100),
  beardCredits: z.number().int().min(0).max(100),
  rules: z.string().trim().max(2000),
}).strict();

export const planCreateSchema = planBaseSchema.extend({
  description: z.string().trim().max(1000).default(""),
  rules: z.string().trim().max(2000).default(""),
  active: z.boolean().default(true),
}).strict().refine((value) => value.cutCredits + value.beardCredits > 0, {
  message: "O plano precisa incluir ao menos um crédito",
});

export const planPatchSchema = planBaseSchema.extend({
  active: z.boolean(),
}).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "Informe ao menos um campo",
);

export function isValidPromo(price: number, promoPrice: number | null | undefined): boolean {
  return promoPrice == null || Math.round(promoPrice * 100) < Math.round(price * 100);
}
