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
const customerName = ref("");
const customerPhone = ref("");
const customerEmail = ref("");
const lgpdConsent = ref(false);
const paymentTiming = ref<"PRESENCIAL_BALCAO" | "LIQUIDADO_AGORA" | "PLANO">("PRESENCIAL_BALCAO");
const slots = ref<string[]>([]);
const busy = ref(false);
const errorMessage = ref("");
const today = new Date();
today.setHours(0, 0, 0, 0);
const calendarCursor = ref(new Date(today.getFullYear(), today.getMonth(), 1));

const selectedServices = computed(() => (services.value ?? []).filter((item) => selectedServiceIds.value.includes(item.id)));
const total = computed(() => selectedServices.value.reduce((sum, item) => sum + item.price, 0));
const duration = computed(() => selectedServices.value.reduce((sum, item) => sum + item.durationMin, 0));

const calendarDays = computed(() => {
  const cursor = calendarCursor.value;
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
});

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function canChooseDate(date: Date): boolean {
  return date >= today && date.getDay() !== 0;
}

function selectDate(date: Date): void {
  if (!canChooseDate(date)) return;
  selectedDate.value = dateKey(date);
  void loadSlots();
}

async function loadSlots(): Promise<void> {
  selectedTime.value = "";
  if (!selectedBarberId.value || !selectedDate.value) return;
  slots.value = await $fetch<string[]>("/api/appointments/availability", { query: { barberId: selectedBarberId.value, date: selectedDate.value, duration: duration.value || 30 } });
}

function changeMonth(amount: number): void {
  calendarCursor.value = new Date(calendarCursor.value.getFullYear(), calendarCursor.value.getMonth() + amount, 1);
  selectedDate.value = "";
  selectedTime.value = "";
  slots.value = [];
}

async function finish(): Promise<void> {
  errorMessage.value = "";
  if (!lgpdConsent.value) {
    errorMessage.value = "Confirme a autorização LGPD para continuar.";
    return;
  }
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
        noConversation: noConversation.value || localStorage.getItem("navalha-silent") === "true",
        notes: observations.value,
        paymentTiming: paymentTiming.value === "PLANO" ? "PRESENCIAL_BALCAO" : paymentTiming.value,
        lgpdConsent: true,
        usePlanCredit: paymentTiming.value === "PLANO",
      },
    });
    if (paymentTiming.value === "LIQUIDADO_AGORA") {
      await navigateTo(`/pagamento/${appointment.id}`);
      return;
    }
    const barber = barbers.value?.find((item) => item.id === selectedBarberId.value);
    const message = [
      "Olá! Confirmo meu agendamento na NAVALHA & CORTE.",
      `Código: ${appointment.id}`,
      `Data/hora: ${new Date(appointment.scheduledAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      `Barbeiro: ${barber?.name ?? "A confirmar"}`,
      `Serviços: ${selectedServices.value.map((item) => item.name).join(", ")}`,
      paymentTiming.value === "PLANO" ? "Pagamento: crédito do plano" : `Total: R$ ${total.value.toFixed(2)}`,
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
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-6xl">
      <div class="grid grid-cols-3 border-2 border-(--border) bg-(--surface-bg)">
        <p v-for="number in 3" :key="number" class="min-h-12 py-3 text-center font-black" :class="step >= number ? 'bg-[#F59E0B] text-[#09090B]' : ''">{{ number }}</p>
      </div>
      <section v-if="step === 1" class="mt-6 border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">1. Escolha o serviço</h1>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label v-for="service in services" :key="service.id" class="flex min-h-32 cursor-pointer gap-3 border-2 border-(--border) p-4" :class="selectedServiceIds.includes(service.id) ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'">
            <input v-model="selectedServiceIds" type="checkbox" :value="service.id" class="mt-1 h-6 w-6">
            <span><strong class="block text-xl">{{ service.name }}</strong><span class="block">{{ service.description }}</span><span class="mt-2 block font-black">R$ {{ service.price.toFixed(2) }} · {{ service.durationMin }} min</span></span>
          </label>
        </div>
        <button type="button" class="mt-6 min-h-14 w-full border-2 border-[#09090B] bg-[#F59E0B] px-6 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]" :disabled="!selectedServiceIds.length" @click="step = 2">Continuar</button>
      </section>
      <section v-else-if="step === 2" class="mt-6 border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">2. Data e profissional</h1>
        <fieldset class="mt-5">
          <legend class="font-black">Escolha o barbeiro</legend>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <button v-for="barber in barbers" :key="barber.id" type="button" class="flex min-h-20 items-center gap-3 border-2 border-(--border) p-3 text-left" :class="selectedBarberId === barber.id ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="selectedBarberId = barber.id; loadSlots()">
              <span class="grid h-12 w-12 place-items-center border-2 border-(--border) bg-(--muted-bg) font-black">{{ barber.name.slice(0, 2).toUpperCase() }}</span>
              <strong>{{ barber.name }}</strong>
            </button>
          </div>
        </fieldset>
        <div class="mt-6 border-2 border-(--border) p-4">
          <div class="flex items-center justify-between">
            <button type="button" class="min-h-12 border-2 border-(--border) px-4 font-black" @click="changeMonth(-1)">Anterior</button>
            <h2 class="text-xl font-black">{{ calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) }}</h2>
            <button type="button" class="min-h-12 border-2 border-(--border) px-4 font-black" @click="changeMonth(1)">Próximo</button>
          </div>
          <div class="mt-4 grid grid-cols-7 gap-1">
            <span v-for="dayName in ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']" :key="dayName" class="text-center text-sm font-black">{{ dayName }}</span>
            <button v-for="date in calendarDays" :key="dateKey(date)" type="button" class="min-h-12 border-2 border-(--border) text-sm font-black" :disabled="!canChooseDate(date)" :class="[date.getMonth() !== calendarCursor.getMonth() ? 'opacity-40' : '', selectedDate === dateKey(date) ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)']" @click="selectDate(date)">{{ date.getDate() }}</button>
          </div>
        </div>
        <fieldset class="mt-6">
          <legend class="font-black">Horários livres — 08h às 19h</legend>
          <div class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <button v-for="slot in slots" :key="slot" type="button" class="min-h-12 border-2 border-(--border) font-black" :class="selectedTime === slot ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="selectedTime = slot">{{ new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) }}</button>
          </div>
          <p v-if="selectedBarberId && selectedDate && !slots.length" class="mt-3 border-2 border-(--border) bg-(--muted-bg) p-3 font-bold">Nenhum horário disponível nesta data.</p>
        </fieldset>
        <div class="mt-6 flex gap-3"><button type="button" class="min-h-14 flex-1 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="step = 1">Voltar</button><button type="button" class="min-h-14 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black" :disabled="!selectedTime" @click="step = 3">Continuar</button></div>
      </section>
      <section v-else class="mt-6 border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">3. Confirmar agendamento</h1>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <label class="font-bold">Seu nome<input v-model="customerName" type="text" autocomplete="name" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3"></label>
          <label class="font-bold">Telefone<input v-model="customerPhone" type="tel" autocomplete="tel" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3"></label>
          <label class="font-bold md:col-span-2">E-mail opcional<input v-model="customerEmail" type="email" autocomplete="email" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3"></label>
        </div>
        <div class="mt-5 border-2 border-(--border) bg-(--muted-bg) p-4">
          <p><strong>Data:</strong> {{ new Date(selectedTime).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }}</p>
          <p><strong>Serviços:</strong> {{ selectedServices.map((item) => item.name).join(", ") }}</p>
          <p class="text-2xl font-black">Total: R$ {{ total.toFixed(2) }}</p>
        </div>
        <label class="mt-5 flex min-h-14 items-center gap-3 border-2 border-(--border) p-3 font-bold"><input v-model="noConversation" type="checkbox" class="h-6 w-6"> Não quero conversar durante o atendimento</label>
        <label class="mt-4 block font-bold">Observações<textarea v-model="observations" class="mt-2 min-h-24 w-full border-2 border-(--border) p-3"></textarea></label>
        <fieldset class="mt-5"><legend class="font-black">Forma de pagamento</legend><div class="mt-2 grid gap-3 sm:grid-cols-3">
          <label class="min-h-14 border-2 border-(--border) p-3" :class="paymentTiming === 'PRESENCIAL_BALCAO' ? 'bg-[#F59E0B] text-[#09090B]' : ''"><input v-model="paymentTiming" type="radio" value="PRESENCIAL_BALCAO" class="mr-2"> Pagar no balcão</label>
          <label class="min-h-14 border-2 border-(--border) p-3" :class="paymentTiming === 'LIQUIDADO_AGORA' ? 'bg-[#F59E0B] text-[#09090B]' : ''"><input v-model="paymentTiming" type="radio" value="LIQUIDADO_AGORA" class="mr-2"> Pagar online agora</label>
          <label class="min-h-14 border-2 border-(--border) p-3" :class="paymentTiming === 'PLANO' ? 'bg-[#F59E0B] text-[#09090B]' : ''"><input v-model="paymentTiming" type="radio" value="PLANO" class="mr-2"> Usar crédito do plano</label>
        </div></fieldset>
        <label class="mt-5 flex min-h-14 items-start gap-3 border-2 border-(--border) p-3 font-bold"><input v-model="lgpdConsent" type="checkbox" required class="mt-1 h-6 w-6"><span>Autorizo o tratamento dos meus dados para agendamento e lembretes, conforme a <NuxtLink to="/privacidade" class="underline">Política de Privacidade</NuxtLink>.</span></label>
        <p v-if="errorMessage" role="alert" class="mt-4 border-2 border-(--border) bg-[#EA580C] p-3 font-black text-white">{{ errorMessage }}</p>
        <div class="mt-6 flex gap-3"><button type="button" class="min-h-14 flex-1 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="step = 2">Voltar</button><button type="button" class="min-h-14 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black" :disabled="busy" @click="finish">{{ busy ? "Salvando..." : "Confirmar agendamento" }}</button></div>
      </section>
    </div>
  </main>
</template>
