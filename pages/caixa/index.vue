<script setup lang="ts">
definePageMeta({ middleware: "admin" });
type PaymentMethod = "PIX" | "CREDITO" | "DEBITO" | "DINHEIRO";

interface AppointmentItem {
  id: string;
  customer: { name: string };
  status: string;
  services: Array<{ unitPrice: number; service: { name: string } }>;
}

const { data: appointments } = await useFetch<AppointmentItem[]>("/api/appointments");
const pending = computed(() =>
  (appointments.value ?? []).filter((appointment) => ["AGENDADO", "EM_ATENDIMENTO"].includes(appointment.status)),
);

const appointmentId = ref("");
const method = ref<PaymentMethod>("PIX");
const installments = ref(1);
const amountReceived = ref<number | null>(null);
const grossAmount = ref(0);
const busy = ref(false);
const timing = ref<"PRESENCIAL_BALCAO" | "LIQUIDADO_AGORA">("LIQUIDADO_AGORA");
const pixKey = ref("00020126330014br.gov.bcb.pix");
const message = ref("");

const selectedAppointment = computed(() =>
  pending.value.find((appointment) => appointment.id === appointmentId.value),
);

watch(selectedAppointment, (appointment) => {
  grossAmount.value = appointment?.services.reduce(
    (sum, item) => sum + Number(item.unitPrice),
    0,
  ) ?? grossAmount.value;
});

const feeRate = computed(() =>
  method.value === "CREDITO"
    ? installments.value > 1 ? 0.0399 : 0.0299
    : method.value === "DEBITO" ? 0.0199 : 0,
);
const fee = computed(() => grossAmount.value * feeRate.value);
const net = computed(() => grossAmount.value - fee.value);
const change = computed(() =>
  method.value === "DINHEIRO" && amountReceived.value !== null
    ? amountReceived.value - grossAmount.value
    : 0,
);

async function confirmPayment(): Promise<void> {
  message.value = "";
  if (grossAmount.value <= 0) {
    message.value = "Informe um valor maior que zero.";
    return;
  }
  if (method.value === "DINHEIRO" && (amountReceived.value ?? 0) < grossAmount.value) {
    message.value = "Valor recebido insuficiente.";
    return;
  }
  if (busy.value) return;
  busy.value = true;
  try {
    await $fetch("/api/payments/checkout", {
      method: "POST",
      body: {
        appointmentId: appointmentId.value || undefined,
        method: method.value,
        timing: timing.value,
        grossAmount: grossAmount.value,
        installments: installments.value,
        amountReceived: amountReceived.value ?? undefined,
        pixKey: method.value === "PIX" ? pixKey.value : undefined,
      },
    });
    message.value = "Pagamento confirmado e comanda baixada.";
    await refreshNuxtData();
  } catch (error: unknown) {
    message.value = error instanceof Error ? error.message : "Não foi possível registrar o pagamento.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#F4F4F5] px-4 pb-12 pt-32 sm:pt-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <h1 class="text-4xl font-black">PAGAMENTO &amp; FECHAMENTO</h1>
      <div class="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section class="border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
          <label class="block font-black">COMANDA OU AGENDAMENTO
            <select v-model="appointmentId" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
              <option value="">Venda avulsa</option>
              <option v-for="appointment in pending" :key="appointment.id" :value="appointment.id">
                {{ appointment.customer.name }} - {{ appointment.id.slice(-6).toUpperCase() }}
              </option>
            </select>
          </label>

          <label class="mt-5 block font-black">VALOR BRUTO
            <input v-model.number="grossAmount" type="number" min="0" step="0.01" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
          </label>

          <fieldset class="mt-6">
            <legend class="font-black">MÉTODO DE PAGAMENTO</legend>
            <div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
              <button v-for="option in (['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO'] as PaymentMethod[])" :key="option" type="button" class="min-h-12 border-2 border-[#09090B] font-black" :class="method === option ? 'bg-[#F59E0B]' : 'bg-white'" @click="method = option">
                {{ option === "CREDITO" ? "CRÉDITO" : option }}
              </button>
            </div>
          </fieldset>

          <div v-if="method === 'PIX'" class="mt-6 border-2 border-[#09090B] p-4">
            <p class="font-black">CHAVE PIX</p>
            <label class="mt-2 block"><input v-model="pixKey" type="text" class="min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <div class="mx-auto mt-4 grid h-40 w-40 place-items-center border-2 border-[#09090B] bg-[#F4F4F5] font-black">QR PIX</div>
            <p class="mt-3 text-center font-bold">Confirme após receber a notificação do banco.</p>
          </div>

          <div v-if="method === 'CREDITO'" class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="font-black">PARCELAS
              <select v-model.number="installments" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
                <option v-for="parcelas in 12" :key="parcelas" :value="parcelas">{{ parcelas }}x</option>
              </select>
            </label>
            <p class="border-2 border-[#09090B] p-3"><strong>Taxa:</strong> R$ {{ fee.toFixed(2) }}</p>
          </div>

          <div v-if="method === 'DEBITO'" class="mt-6 border-2 border-[#09090B] p-4">
            Taxa registrada: R$ {{ fee.toFixed(2) }}
          </div>

          <div v-if="method === 'DINHEIRO'" class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="font-black">VALOR RECEBIDO
              <input v-model.number="amountReceived" type="number" min="0" step="0.01" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
            </label>
            <div class="border-2 border-[#09090B] p-3">
              <strong>TROCO</strong>
              <p class="text-3xl font-black" :class="change >= 0 ? 'text-[#EA580C]' : 'text-[#09090B]'">R$ {{ change.toFixed(2) }}</p>
            </div>
          </div>

          <fieldset class="mt-6">
            <legend class="font-black">LOCAL DA LIQUIDAÇÃO</legend>
            <div class="mt-2 grid gap-3 sm:grid-cols-2">
              <label class="min-h-12 border-2 border-[#09090B] p-3" :class="timing === 'PRESENCIAL_BALCAO' ? 'bg-[#F59E0B]' : 'bg-white'"><input v-model="timing" type="radio" value="PRESENCIAL_BALCAO" class="mr-2"> Presencial no Balcão</label>
              <label class="min-h-12 border-2 border-[#09090B] p-3" :class="timing === 'LIQUIDADO_AGORA' ? 'bg-[#F59E0B]' : 'bg-white'"><input v-model="timing" type="radio" value="LIQUIDADO_AGORA" class="mr-2"> Liquidado Agora</label>
            </div>
          </fieldset>
        </section>

        <aside class="h-fit border-2 border-[#09090B] bg-[#09090B] p-5 text-white shadow-[8px_8px_0px_#F59E0B]">
          <h2 class="text-2xl font-black">RESUMO</h2>
          <p class="mt-5 flex justify-between"><span>Bruto</span><strong>R$ {{ grossAmount.toFixed(2) }}</strong></p>
          <p class="mt-3 flex justify-between"><span>Taxas</span><strong>R$ {{ fee.toFixed(2) }}</strong></p>
          <p class="mt-3 flex justify-between border-t-2 border-white pt-3"><span>Líquido</span><strong>R$ {{ net.toFixed(2) }}</strong></p>
          <p v-if="method === 'DINHEIRO'" class="mt-3 flex justify-between"><span>Troco</span><strong>R$ {{ change.toFixed(2) }}</strong></p>
          <button type="button" class="mt-6 min-h-14 w-full border-2 border-white bg-[#F59E0B] px-4 font-black text-[#09090B] shadow-[4px_4px_0px_#FFFFFF]" :disabled="busy" @click="confirmPayment">
            {{ busy ? "PROCESSANDO..." : "CONFIRMAR PAGAMENTO" }}
          </button>
          <p v-if="message" role="status" class="mt-4 border-2 border-white bg-[#18181B] p-3 font-bold">{{ message }}</p>
        </aside>
      </div>
    </div>
  </main>
</template>
