<script setup lang="ts">
const route = useRoute();
type Method = "PIX" | "CREDITO" | "DEBITO";
const method = ref<Method>("PIX");
const installments = ref(1);
const status = ref("PENDENTE");
const total = ref(0);
const busy = ref(false);
const confirmed = ref(false);
const errorMessage = ref("");
const routeId = computed(() => String(route.params.id ?? ""));
const isPlan = computed(() => routeId.value.startsWith("plan-"));

const { data: plans } = await useFetch<Array<{ id: string; name: string; price: number }>>(
  () => isPlan.value ? "/api/plans" : "",
);

const selectedPlan = computed(() =>
  plans.value?.find((item) => item.id === routeId.value),
);

if (isPlan.value) {
  total.value = selectedPlan.value?.price ?? 0;
}
watch(selectedPlan, (value) => {
  total.value = value?.price ?? 0;
});

async function confirm(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/payments/checkout", {
      method: "POST",
      body: {
        appointmentId: !isPlan.value && routeId.value !== "novo" ? routeId.value : undefined,
        planId: isPlan.value ? routeId.value : undefined,
        method: method.value,
        timing: "LIQUIDADO_AGORA",
        grossAmount: isPlan.value ? total.value : undefined,
        installments: installments.value,
        gatewayProvider: "MERCADO_PAGO",
      },
    });
    status.value = "CONFIRMADO";
    confirmed.value = true;
  } catch (error: unknown) {
    status.value = "PENDENTE";
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.";
  } finally {
    busy.value = false;
  }
}

function sendWhatsApp(): void {
  const message = `Olá! Meu pagamento foi confirmado. Código da operação: ${route.params.id}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-4xl font-black">Pagamento seguro</h1>
      <p class="mt-3">Os dados completos do cartão são enviados diretamente ao gateway. O sistema guarda apenas o status e o identificador da transação.</p>
      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <fieldset><legend class="font-black">Escolha a forma de pagamento</legend><div class="mt-3 grid gap-3 sm:grid-cols-3">
            <button v-for="option in (['PIX','CREDITO','DEBITO'] as Method[])" :key="option" type="button" class="min-h-14 border-2 border-(--border) font-black" :class="method === option ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="method = option">{{ option === 'CREDITO' ? 'Cartão de crédito' : option === 'DEBITO' ? 'Cartão de débito' : 'PIX' }}</button>
          </div></fieldset>
          <div v-if="method === 'PIX'" class="mt-6 border-2 border-(--border) p-5 text-center">
            <div class="mx-auto grid h-52 w-52 place-items-center border-2 border-(--border) bg-(--muted-bg) font-black">QR CODE PIX</div>
            <button type="button" class="mt-4 min-h-12 border-2 border-(--border) px-4 font-black" :disabled="busy" @click="confirm">{{ busy ? "Validando..." : "Confirmar PIX copiado" }}</button>
          </div>
          <div v-else class="mt-6 grid gap-4">
            <p class="border-2 border-(--border) p-4 font-bold">O formulário tokenizado do gateway será exibido aqui em produção. Nunca digite ou envie os dados completos do cartão a este servidor.</p>
            <label v-if="method === 'CREDITO'" class="font-black">Parcelas
              <select v-model.number="installments" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3"><option v-for="value in 12" :key="value" :value="value">{{ value }}x</option></select>
            </label>
          </div>
        </section>
        <aside class="h-fit border-2 border-(--border) bg-[#09090B] p-5 text-white shadow-[8px_8px_0px_#F59E0B]">
          <h2 class="text-2xl font-black">Resumo</h2>
          <p v-if="selectedPlan" class="mt-4">{{ selectedPlan.name }}</p>
          <p v-if="isPlan" class="mt-2 text-2xl font-black">R$ {{ total.toFixed(2) }}</p>
          <p class="mt-4">Status: <strong>{{ status }}</strong></p>
          <p v-if="errorMessage" role="alert" class="mt-4 border-2 border-white bg-[#EA580C] p-3 font-black text-white">{{ errorMessage }}</p>
          <button v-if="method !== 'PIX'" type="button" class="mt-6 min-h-14 w-full border-2 border-white bg-[#F59E0B] px-4 font-black text-[#09090B]" :disabled="busy" @click="confirm">{{ busy ? "Validando..." : "Confirmar pagamento" }}</button>
          <button type="button" class="mt-4 min-h-14 w-full border-2 border-[#FACC15] bg-[#18181B] px-4 font-black text-white disabled:opacity-50" :disabled="!confirmed" @click="sendWhatsApp">Abrir WhatsApp</button>
        </aside>
      </div>
    </div>
  </main>
</template>
