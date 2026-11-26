import { z } from "zod";
import { requireAdminSession } from "../../../utils/adminSession";
import { writeAccessLog } from "../../../utils/accessLog";
import { createAdminNotification } from "../../../utils/adminNotifications";

const bodySchema = z.object({ label: z.string().trim().max(80).default("Teste manual") }).strict();

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Dados de teste inválidos" });
  }
  await createAdminNotification({
    type: "PAYMENT_TEST",
    title: "Simulação de pagamento",
    message: `Evento de teste: ${parsed.data.label}. Nenhum valor financeiro foi registrado.`,
    metadata: { simulated: true, label: parsed.data.label },
  });
  await writeAccessLog(event, true, "payment_test_simulated", "admin-session");
  return { simulated: true };
});
