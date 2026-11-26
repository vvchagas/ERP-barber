<script setup lang="ts">
type Method = "PIX" | "CREDITO" | "DEBITO";
interface Plan { id: string; name: string; price: number; promoPrice: number | null; promoLabel: string | null; description: string }
interface AppointmentDetails {
  id: string;
  scheduledAt: string;
  status: string;
  barber: { name: string; specialty: string; photoUrl: string | null };
  services: Array<{ name: string; quantity: number; unitPrice: number }>;
  total: number;
  paymentStatus: string | null;
}

const route = useRoute();
const config = useRuntimeConfig();
const routeId = String(route.params.id ?? "");
const isPlanRoute = routeId.startsWith("plan-");
const method = ref<Method>("PIX");
const installments = ref(1);
const selectedPlanId = ref(isPlanRoute ? routeId : "");
const plans = ref<Plan[]>([]);
const appointment = ref<AppointmentDetails | null>(null);
const busy = ref(false);
const copied = ref(false);
const errorMessage = ref("");
const paymentStatus = ref("");
const { customer, refreshSession } = useCustomerAuth();

const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value) ?? null);
const isSubscription = computed(() => Boolean(selectedPlan.value));
const amount = computed(() => isSubscription.value
  ? effectivePlanPrice(selectedPlan.value)
  : appointment.value?.total ?? 0);
const confirmed = computed(() => paymentStatus.value === "CONFIRMADO");
const pending = computed(() => paymentStatus.value === "PENDENTE");

async function copyPixKey(): Promise<void> {
  if (!config.public.pixKey) return;
  await navigator.clipboard.writeText(config.public.pixKey);
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 2500);
}

async function startCheckout(): Promise<void> {
  if (busy.value) return;
  if (!customer.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent(`/pagamento/${routeId}`)}`);
    return;
  }
  if (method.value !== "PIX") {
    errorMessage.value = "O checkout tokenizado de cartão ainda não está configurado. Nenhum dado de cartão deve ser enviado por este formulário.";
    return;
  }
  busy.value = true;
  errorMessage.value = "";
  try {
    const result = await $fetch<{ id: string; status: string }>("/api/payments/checkout", {
      method: "POST",
      body: {
        appointmentId: !isSubscription.value ? routeId : undefined,
        planId: selectedPlanId.value || undefined,
        method: method.value,
        timing: "LIQUIDADO_AGORA",
        installments: installments.value,
      },
    });
    paymentStatus.value = result.status;
    if (result.status === "CONFIRMADO") {
      await refreshSession();
    } else {
      paymentStatus.value = "PENDENTE";
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
  } finally {
    busy.value = false;
  }
}

function sendWhatsApp(): void {
  if (!confirmed.value) return;
  const message = `Olá! Meu pagamento foi confirmado. Código: ${routeId}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function effectivePlanPrice(plan: Plan | null): number {
  if (!plan) return 0;
  return plan.promoPrice !== null && plan.promoPrice < plan.price ? plan.promoPrice : plan.price;
}
function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

onMounted(async () => {
  await refreshSession();
  const plansResponse = await fetch("/api/plans");
  if (!plansResponse.ok) throw new Error("Não foi possível carregar os planos.");
  plans.value = await plansResponse.json() as Plan[];
  if (!isPlanRoute) {
    const response = await fetch(`/api/appointments/${encodeURIComponent(routeId)}`);
    if (!response.ok) {
      const body = await response.json() as { statusMessage?: string };
      errorMessage.value = body.statusMessage ?? "Não foi possível carregar o agendamento.";
      return;
    }
    appointment.value = await response.json() as AppointmentDetails;
    if (appointment.value.paymentStatus) paymentStatus.value = appointment.value.paymentStatus;
  }
});
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-5xl">
      <section v-if="confirmed" class="mx-auto max-w-2xl border-2 border-[#09090B] bg-[#16A34A] p-8 text-center text-white shadow-[8px_8px_0px_#09090B]" role="status">
        <p class="text-6xl" aria-hidden="true">✓</p>
        <h1 class="mt-4 text-4xl font-black">Pagamento confirmado!</h1>
        <p class="mt-3 text-lg font-bold">Seu comprovante foi validado. Agora você pode confirmar o atendimento com a equipe.</p>
        <button type="button" class="mt-6 min-h-14 border-2 border-white bg-[#F59E0B] px-6 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]" @click="sendWhatsApp">Continuar pelo WhatsApp</button>
      </section>
      <template v-else>
        <h1 class="text-4xl font-black">Sua comanda</h1>
        <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section class="overflow-hidden border-2 border-(--border) bg-(--surface-bg) shadow-[8px_8px_0px_#09090B]">
            <header class="border-b-2 border-dashed border-(--border) bg-[#F59E0B] p-5 text-[#09090B]">
              <p class="text-sm font-black tracking-widest">NAVALHA &amp; CORTE • TICKET DE PAGAMENTO</p>
              <h2 class="mt-2 text-2xl font-black">Resumo da comanda</h2>
            </header>
            <div class="p-5">
              <div v-if="appointment" class="flex items-center gap-4 border-b-2 border-dashed border-(--border) pb-5">
                <img v-if="appointment.barber.photoUrl" :src="appointment.barber.photoUrl" :alt="`Retrato de ${appointment.barber.name}`" class="h-20 w-20 border-2 border-(--border) object-cover">
                <div>
                  <p class="font-black">Seu barbeiro</p>
                  <p class="text-xl font-black">{{ appointment.barber.name }}</p>
                  <p>{{ appointment.barber.specialty }}</p>
                  <p>{{ new Date(appointment.scheduledAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }}</p>
                </div>
              </div>
              <div v-if="appointment" class="mt-5 space-y-3">
                <div v-for="service in appointment.services" :key="service.name" class="flex justify-between gap-3 border-b border-(--border) pb-2">
                  <span>{{ service.quantity }}× {{ service.name }}</span><strong>R$ {{ (service.unitPrice * service.quantity).toFixed(2) }}</strong>
                </div>
              </div>
              <label class="mt-5 block font-black">Ou inclua um Plano VIP
                <select v-model="selectedPlanId" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3">
                  <option value="">Não incluir plano</option>
                  <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }} — {{ formatPrice(effectivePlanPrice(plan)) }}</option>
                </select>
              </label>
              <p v-if="selectedPlan" class="mt-3 border-2 border-(--border) bg-[#F4F4F5] p-3 font-bold">{{ selectedPlan.description }}</p>
              <p v-if="selectedPlan && selectedPlan.promoPrice !== null && selectedPlan.promoPrice < selectedPlan.price" class="mt-3 border-2 border-[#09090B] bg-[#FEF3C7] p-3 font-black text-[#09090B]">
                <span class="border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs uppercase tracking-wider text-white">{{ selectedPlan.promoLabel || "PROMOÇÃO" }}</span>
                <span class="ml-2 line-through opacity-60">{{ formatPrice(selectedPlan.price) }}</span>
                <span class="ml-2">{{ formatPrice(selectedPlan.promoPrice) }}</span>
              </p>
            </div>
            <footer class="border-t-2 border-dashed border-(--border) bg-(--muted-bg) p-5">
              <p class="flex justify-between text-xl font-black"><span>Total</span><span>{{ formatPrice(amount) }}</span></p>
            </footer>
          </section>
          <aside class="h-fit border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
            <h2 class="text-2xl font-black">Forma de pagamento</h2>
            <div class="mt-4 grid gap-3">
              <button v-for="option in ([['PIX','PIX'],['CREDITO','Cartão de crédito'],['DEBITO','Cartão de débito']] as [Method,string][])" :key="option[0]" type="button" class="min-h-14 border-2 border-(--border) px-3 text-left font-black" :class="method === option[0] ? 'bg-[#F59E0B] text-[#09090B] shadow-[4px_4px_0px_#09090B]' : 'bg-(--surface-bg)'" @click="method = option[0]">{{ option[1] }}</button>
            </div>
            <label v-if="method === 'CREDITO'" class="mt-4 block font-black">Parcelas
              <select v-model.number="installments" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3"><option v-for="n in 12" :key="n" :value="n">{{ n }}×</option></select>
            </label>
            <div v-if="method === 'PIX'" class="mt-4 border-2 border-(--border) bg-(--muted-bg) p-4">
              <div class="grid min-h-36 place-items-center border-2 border-dashed border-(--border) bg-(--surface-bg) p-4 text-center">
                <span v-if="config.public.pixKey" class="break-all font-mono text-sm">{{ config.public.pixKey }}</span>
                <span v-else class="font-bold">QR Code e código Copia e Cola serão fornecidos pelo gateway quando configurado.</span>
              </div>
              <button v-if="config.public.pixKey" type="button" class="mt-3 min-h-12 w-full border-2 border-(--border) px-3 font-black" :class="copied ? 'bg-[#16A34A] text-white' : 'bg-(--surface-bg)'" @click="copyPixKey">{{ copied ? "Chave PIX copiada!" : "Copiar chave PIX" }}</button>
            </div>
            <p v-if="method !== 'PIX'" class="mt-4 border-2 border-(--border) p-3 text-sm font-bold">O SDK tokenizado de cartão não está configurado. Não informe número, validade ou CVV nesta página.</p>
            <p v-if="pending" class="mt-4 border-2 border-[#09090B] bg-[#F59E0B] p-3 font-black text-[#09090B]" role="status">Pagamento pendente de confirmação segura pelo provedor. O plano e o WhatsApp só serão liberados após confirmação.</p>
            <p v-if="errorMessage" class="mt-4 border-2 border-(--border) bg-[#DC2626] p-3 font-black text-white" role="alert">{{ errorMessage }}</p>
            <button type="button" class="mt-5 min-h-14 w-full border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B] disabled:opacity-50" :disabled="busy || pending" @click="startCheckout">{{ busy ? "Preparando pagamento..." : pending ? "Aguardando confirmação" : method === "PIX" ? "Solicitar cobrança PIX" : "Continuar" }}</button>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
