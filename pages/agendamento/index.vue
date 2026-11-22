<script setup lang="ts">
interface Service { id: string; name: string; description: string; durationMin: number; price: number }
interface Barber { id: string; name: string }

const { data: services } = await useFetch<Service[]>("/api/services");
const { data: barbers } = await useFetch<Barber[]>("/api/barbers");
const step = ref(1);
const selectedServiceIds = ref<string[]>([]);
const selectedBarberId = ref("");
const selectedDate = ref("");
const selectedTime = ref("");
const noConversation = ref(false);
const observations = ref("");
const paymentTiming = ref<"PRESENCIAL_BALCAO" | "LIQUIDADO_AGORA">("PRESENCIAL_BALCAO");
const customerName = ref("");
const customerPhone = ref("");
const customerEmail = ref("");
const slots = ref<string[]>([]);
const busy = ref(false);
const errorMessage = ref("");

const dates = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + index);
  return date;
});
selectedDate.value = dates[0]?.toISOString().slice(0, 10) ?? "";

const selectedServices = computed(() =>
  (services.value ?? []).filter((service) => selectedServiceIds.value.includes(service.id)),
);
const total = computed(() => selectedServices.value.reduce((sum, service) => sum + service.price, 0));
const duration = computed(() => selectedServices.value.reduce((sum, service) => sum + service.durationMin, 0));

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

async function loadSlots(): Promise<void> {
  selectedTime.value = "";
  if (!selectedBarberId.value || !selectedDate.value) return;
  slots.value = await $fetch<string[]>("/api/appointments/availability", {
    query: { barberId: selectedBarberId.value, date: selectedDate.value, duration: duration.value || 30 },
  });
}

async function finish(): Promise<void> {
  errorMessage.value = "";
  if (!customerName.value.trim() || !customerPhone.value.trim()) {
    errorMessage.value = "Informe nome e telefone.";
    return;
  }
  busy.value = true;
  try {
    const appointment = await $fetch<{ id: string; scheduledAt: string }>("/api/appointments", {
      method: "POST",
      body: {
        customerName: customerName.value,
        customerPhone: customerPhone.value,
        customerEmail: customerEmail.value || undefined,
        barberId: selectedBarberId.value,
        scheduledAt: selectedTime.value,
        serviceIds: selectedServiceIds.value,
        noConversation: noConversation.value,
        notes: observations.value,
        paymentTiming: paymentTiming.value,
      },
    });
    const barber = barbers.value?.find((item) => item.id === selectedBarberId.value);
    const message = [
      "Olá! Confirmo meu agendamento na NAVALHA & CORTE.",
      `Código: ${appointment.id}`,
      `Data/hora: ${new Date(appointment.scheduledAt).toLocaleString("pt-BR")}`,
      `Barbeiro: ${barber?.name ?? "A confirmar"}`,
      `Serviços: ${selectedServices.value.map((service) => service.name).join(", ")}`,
      `Total: R$ ${total.value.toFixed(2)}`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível concluir o agendamento.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#F4F4F5] px-4 pb-12 pt-32 sm:pt-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-3 border-2 border-[#09090B] bg-white">
        <p v-for="number in 3" :key="number" :class="['min-h-12 py-3 text-center font-black', step >= number ? 'bg-[#F59E0B]' : '']">{{ number }}</p>
      </div>

      <section v-if="step === 1" class="mt-6 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">1. ESCOLHA O SERVIÇO</h1>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label v-for="service in services" :key="service.id" class="flex min-h-32 cursor-pointer gap-3 border-2 border-[#09090B] p-4" :class="selectedServiceIds.includes(service.id) ? 'bg-[#F59E0B]' : 'bg-white'">
            <input v-model="selectedServiceIds" type="checkbox" :value="service.id" class="mt-1 h-6 w-6">
            <span>
              <strong class="block text-xl">{{ service.name }}</strong>
              <span class="block">{{ service.description }}</span>
              <span class="mt-2 block font-black">R$ {{ service.price.toFixed(2) }} · {{ service.durationMin }} min</span>
            </span>
          </label>
        </div>
        <button type="button" class="mt-6 min-h-12 w-full border-2 border-[#09090B] bg-[#F59E0B] px-6 font-black shadow-[4px_4px_0px_#09090B]" :disabled="!selectedServiceIds.length" @click="step = 2">
          CONTINUAR
        </button>
      </section>

      <section v-else-if="step === 2" class="mt-6 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">2. DATA E PROFISSIONAL</h1>
        <div class="mt-5 flex gap-3 overflow-x-auto pb-3" aria-label="Datas disponíveis">
          <button v-for="date in dates" :key="date.toISOString()" type="button" class="min-h-16 min-w-32 border-2 border-[#09090B] px-3 font-black" :class="selectedDate === date.toISOString().slice(0, 10) ? 'bg-[#F59E0B]' : 'bg-white'" @click="selectedDate = date.toISOString().slice(0, 10); loadSlots()">
            {{ formatDate(date) }}
          </button>
        </div>
        <label class="mt-5 block font-black">BARBEIRO
          <select v-model="selectedBarberId" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3" @change="loadSlots">
            <option value="">Selecione</option>
            <option v-for="barber in barbers" :key="barber.id" :value="barber.id">{{ barber.name }}</option>
          </select>
        </label>
        <fieldset class="mt-6">
          <legend class="font-black">HORÁRIOS LIVRES</legend>
          <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button v-for="slot in slots" :key="slot" type="button" class="min-h-12 border-2 border-[#09090B] font-black" :class="selectedTime === slot ? 'bg-[#F59E0B]' : 'bg-white'" @click="selectedTime = slot">
              {{ new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }}
            </button>
          </div>
          <p v-if="selectedBarberId && !slots.length" class="mt-3 border-2 border-[#09090B] bg-[#F4F4F5] p-3 font-bold">Nenhum horário disponível nesta data.</p>
        </fieldset>
        <div class="mt-6 flex gap-3">
          <button type="button" class="min-h-12 flex-1 border-2 border-[#09090B] bg-white px-4 font-black" @click="step = 1">VOLTAR</button>
          <button type="button" class="min-h-12 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black" :disabled="!selectedTime" @click="step = 3">CONTINUAR</button>
        </div>
      </section>

      <section v-else class="mt-6 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">3. CONFIRMAR AGENDAMENTO</h1>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <label class="font-bold">SEU NOME<input v-model="customerName" type="text" autocomplete="name" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
          <label class="font-bold">TELEFONE<input v-model="customerPhone" type="tel" autocomplete="tel" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
          <label class="font-bold md:col-span-2">E-MAIL OPCIONAL<input v-model="customerEmail" type="email" autocomplete="email" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
        </div>
        <div class="mt-5 border-2 border-[#09090B] bg-[#F4F4F5] p-4">
          <p><strong>Data:</strong> {{ new Date(selectedTime).toLocaleString("pt-BR") }}</p>
          <p><strong>Serviços:</strong> {{ selectedServices.map((item) => item.name).join(", ") }}</p>
          <p class="text-2xl font-black">TOTAL R$ {{ total.toFixed(2) }}</p>
        </div>
        <label class="mt-5 flex min-h-12 items-center gap-3 border-2 border-[#09090B] p-3 font-bold">
          <input v-model="noConversation" type="checkbox" class="h-6 w-6"> Não quero conversar durante o atendimento
        </label>
        <label class="mt-4 block font-bold">OBSERVAÇÕES<textarea v-model="observations" class="mt-2 min-h-24 w-full border-2 border-[#09090B] p-3"></textarea></label>
        <fieldset class="mt-5">
          <legend class="font-black">FORMA DE PAGAMENTO</legend>
          <div class="mt-2 grid gap-3 sm:grid-cols-2">
            <label class="min-h-12 border-2 border-[#09090B] p-3" :class="paymentTiming === 'PRESENCIAL_BALCAO' ? 'bg-[#F59E0B]' : 'bg-white'"><input v-model="paymentTiming" type="radio" value="PRESENCIAL_BALCAO" class="mr-2"> Pagar no Balcão</label>
            <label class="min-h-12 border-2 border-[#09090B] p-3" :class="paymentTiming === 'LIQUIDADO_AGORA' ? 'bg-[#F59E0B]' : 'bg-white'"><input v-model="paymentTiming" type="radio" value="LIQUIDADO_AGORA" class="mr-2"> Pagar Agora (PIX)</label>
          </div>
        </fieldset>
        <p v-if="errorMessage" role="alert" class="mt-4 border-2 border-[#09090B] bg-[#EA580C] p-3 font-black text-white">{{ errorMessage }}</p>
        <div class="mt-6 flex gap-3">
          <button type="button" class="min-h-12 flex-1 border-2 border-[#09090B] bg-white px-4 font-black" @click="step = 2">VOLTAR</button>
          <button type="button" class="min-h-12 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black" :disabled="busy" @click="finish">{{ busy ? "SALVANDO..." : "CONFIRMAR E CHAMAR NO WHATSAPP" }}</button>
        </div>
      </section>
    </div>
  </main>
</template>
