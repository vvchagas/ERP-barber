<script setup lang="ts">
interface Service { id: string; name: string; description: string; durationMin: number; price: number; promoPrice: number | null; promoLabel: string | null }
interface Barber { id: string; name: string; specialty?: string; photoUrl?: string | null }

const { data: services, pending: servicesPending } = await useFetch<Service[]>("/api/services");
const { data: barbers, pending: barbersPending } = await useFetch<Barber[]>("/api/barbers");
const step = ref(1);
const selectedServiceIds = ref<string[]>([]);
const selectedBarberId = ref("");
const selectedDate = ref("");
const selectedTime = ref("");
const noConversation = ref(false);
const observations = ref("");
const lgpdConsent = ref(false);
const paymentTiming = ref<"PRESENCIAL_BALCAO" | "LIQUIDADO_AGORA" | "PLANO">("PRESENCIAL_BALCAO");
const slots = ref<string[]>([]);
const busy = ref(false);
const errorMessage = ref("");
const { customer, refreshSession } = useCustomerAuth();
const { reveal } = useScrollReveal();
const slotsPending = ref(false);
const todayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const todayValues = {
  year: todayParts.find((part) => part.type === "year")?.value ?? "2000",
  month: todayParts.find((part) => part.type === "month")?.value ?? "01",
  day: todayParts.find((part) => part.type === "day")?.value ?? "01",
};
const todayKey = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;
const calendarCursor = ref(new Date(Number(todayValues.year), Number(todayValues.month) - 1, 1));

const selectedServices = computed(() => (services.value ?? []).filter((item) => selectedServiceIds.value.includes(item.id)));
function effectivePrice(service: Service): number {
  return service.promoPrice !== null && service.promoPrice < service.price ? service.promoPrice : service.price;
}
function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
const total = computed(() => selectedServices.value.reduce((sum, item) => sum + effectivePrice(item), 0));
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
  return date.getFullYear() === calendarCursor.value.getFullYear()
    && date.getMonth() === calendarCursor.value.getMonth()
    && dateKey(date) >= todayKey
    && date.getDay() !== 0;
}

const isCurrentMonth = computed(() =>
  calendarCursor.value.getFullYear() === Number(todayValues.year)
  && calendarCursor.value.getMonth() === Number(todayValues.month) - 1,
);
const activeSubscriptions = computed(() => customer.value?.subscriptions.filter((subscription) =>
  subscription.active && subscription.remainingCredits > 0 && new Date(subscription.expiresAt).getTime() > Date.now(),
) ?? []);
const availableCredits = computed(() => activeSubscriptions.value.reduce((sum, subscription) => sum + subscription.remainingCredits, 0));
const nearestExpiry = computed(() => activeSubscriptions.value[0]?.expiresAt);

function selectDate(date: Date): void {
  if (!canChooseDate(date)) return;
  selectedDate.value = dateKey(date);
  void loadSlots();
}

async function loadSlots(): Promise<void> {
  selectedTime.value = "";
  if (!selectedBarberId.value || !selectedDate.value) return;
  slotsPending.value = true;
  try {
    slots.value = await $fetch<string[]>("/api/appointments/availability", { query: { barberId: selectedBarberId.value, date: selectedDate.value, duration: duration.value || 30 } });
  } finally {
    slotsPending.value = false;
  }
}

function changeMonth(amount: number): void {
  calendarCursor.value = new Date(calendarCursor.value.getFullYear(), calendarCursor.value.getMonth() + amount, 1);
  selectedDate.value = "";
  selectedTime.value = "";
  slots.value = [];
}

async function finish(): Promise<void> {
  errorMessage.value = "";
  if (!customer.value) {
    errorMessage.value = "Entre ou crie uma conta para confirmar o agendamento.";
    return;
  }
  if (!lgpdConsent.value) {
    errorMessage.value = "Confirme a autorização LGPD para continuar.";
    return;
  }
  busy.value = true;
  try {
    const appointment = await $fetch<{ id: string; scheduledAt: string }>("/api/appointments", {
      method: "POST",
      body: {
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
      paymentTiming.value === "PLANO" ? "Pagamento: crédito do plano" :       `Total: ${formatPrice(total.value)}`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível concluir o agendamento.";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  await refreshSession();
  if (!customer.value) return;
  noConversation.value = customer.value.silentCut;
  if (customer.value.favoriteBarberId) selectedBarberId.value = customer.value.favoriteBarberId;
});
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-6xl">
      <aside v-if="availableCredits > 0" class="mb-5 border-2 border-[#09090B] bg-[#16A34A] p-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]" role="status">
        Você possui {{ availableCredits }} créditos ativos no seu Plano{{ nearestExpiry ? ` — válidos até ${new Date(nearestExpiry).toLocaleDateString("pt-BR")}` : "" }}.
      </aside>
      <div class="grid grid-cols-3 border-2 border-(--border) bg-(--surface-bg)">
        <p v-for="number in 3" :key="number" class="min-h-12 py-3 text-center font-black" :class="step >= number ? 'bg-[#F59E0B] text-[#09090B]' : ''">{{ number }}</p>
      </div>
      <section v-if="step === 1" :ref="reveal" class="mt-6 border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">1. Escolha o serviço</h1>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <BrutalSkeleton v-if="servicesPending" variant="card" :count="4" class="md:col-span-2" />
          <label v-for="service in services" :key="service.id" :ref="reveal" class="relative flex min-h-32 cursor-pointer gap-3 border-2 border-(--border) p-4" :class="selectedServiceIds.includes(service.id) ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'">
            <input v-model="selectedServiceIds" type="checkbox" :value="service.id" class="mt-1 h-6 w-6">
            <span class="pr-16"><strong class="block text-xl">{{ service.name }}</strong><span class="block">{{ service.description }}</span><span class="mt-2 flex flex-wrap items-baseline gap-2 font-black"><span v-if="effectivePrice(service) < service.price" class="font-bold line-through opacity-60">{{ formatPrice(service.price) }}</span><span>{{ formatPrice(effectivePrice(service)) }}</span><span>· {{ service.durationMin }} min</span></span></span>
            <span v-if="effectivePrice(service) < service.price" class="absolute right-2 top-2 border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs font-black uppercase tracking-wider text-white">{{ service.promoLabel || "PROMOÇÃO" }}</span>
          </label>
        </div>
        <button type="button" class="mt-6 min-h-14 w-full border-2 border-[#09090B] bg-[#F59E0B] px-6 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]" :disabled="!selectedServiceIds.length" @click="step = 2">Continuar</button>
      </section>
      <section v-else-if="step === 2" :ref="reveal" class="mt-6 border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">2. Data e profissional</h1>
        <fieldset class="mt-5">
          <legend class="font-black">Escolha o barbeiro</legend>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <BrutalSkeleton v-if="barbersPending" variant="list-item" :count="4" class="sm:col-span-2" />
            <button v-for="barber in barbers" :key="barber.id" :ref="reveal" type="button" class="flex min-h-24 items-center gap-3 border-2 border-(--border) p-3 text-left" :class="selectedBarberId === barber.id ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="selectedBarberId = barber.id; loadSlots()">
              <img v-if="barber.photoUrl" :src="barber.photoUrl" :alt="`Retrato de ${barber.name}`" class="h-16 w-16 border-2 border-(--border) object-cover" loading="lazy" decoding="async">
              <span v-else class="grid h-16 w-16 place-items-center border-2 border-(--border) bg-(--muted-bg) font-black">{{ barber.name.slice(0, 2).toUpperCase() }}</span>
              <span><strong class="block">{{ barber.name }}</strong><span class="block text-sm">{{ barber.specialty }}</span></span>
            </button>
          </div>
        </fieldset>
        <div class="mt-6 border-2 border-(--border) p-4">
          <div class="flex items-center justify-between">
            <button v-if="!isCurrentMonth" type="button" class="min-h-12 border-2 border-(--border) px-4 font-black" @click="changeMonth(-1)">Anterior</button>
            <span v-else class="min-h-12" aria-hidden="true"></span>
            <h2 class="text-xl font-black">{{ calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) }}</h2>
            <button type="button" class="min-h-12 border-2 border-(--border) px-4 font-black" @click="changeMonth(1)">Próximo</button>
          </div>
          <div class="mt-4 grid grid-cols-7 gap-1">
            <span v-for="dayName in ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']" :key="dayName" class="text-center text-sm font-black">{{ dayName }}</span>
            <button v-for="date in calendarDays" :key="dateKey(date)" type="button" class="min-h-12 border-2 border-(--border) text-sm font-black disabled:cursor-not-allowed disabled:opacity-30" :disabled="!canChooseDate(date)" :aria-label="date.toLocaleDateString('pt-BR')" :class="selectedDate === dateKey(date) ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="selectDate(date)">{{ date.getDate() }}</button>
          </div>
        </div>
        <fieldset class="mt-6">
          <legend class="font-black">Horários livres — 08h às 19h</legend>
          <div class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <BrutalSkeleton v-if="slotsPending" variant="slot-grid" :count="12" class="col-span-3 sm:col-span-6" />
            <button v-for="slot in slots" :key="slot" type="button" class="min-h-12 border-2 border-(--border) font-black" :class="selectedTime === slot ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="selectedTime = slot">{{ new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) }}</button>
          </div>
          <p v-if="selectedBarberId && selectedDate && !slots.length" class="mt-3 border-2 border-(--border) bg-(--muted-bg) p-3 font-bold">Nenhum horário disponível nesta data.</p>
        </fieldset>
        <div class="mt-6 flex gap-3"><button type="button" class="min-h-14 flex-1 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="step = 1">Voltar</button><button type="button" class="min-h-14 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black" :disabled="!selectedTime" @click="step = 3">Continuar</button></div>
      </section>
      <section v-else :ref="reveal" class="mt-6 border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
        <h1 class="text-3xl font-black">3. Confirmar agendamento</h1>
        <div v-if="customer" class="mt-5 grid gap-5 border-2 border-(--border) bg-(--muted-bg) p-4 md:grid-cols-2">
          <p><strong>Cliente:</strong> {{ customer.name }}</p>
          <p><strong>Telefone:</strong> {{ customer.phone }}</p>
          <p v-if="customer.email" class="md:col-span-2"><strong>E-mail:</strong> {{ customer.email }}</p>
        </div>
        <div v-else class="mt-5 border-2 border-(--border) bg-(--muted-bg) p-4 font-bold">
          <p>Entre na sua conta ou crie uma conta para confirmar este agendamento.</p>
          <NuxtLink to="/login?redirect=/agendamento" class="mt-3 inline-flex min-h-12 items-center border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black text-[#09090B]">Entrar ou criar conta</NuxtLink>
        </div>
        <div class="mt-5 border-2 border-(--border) bg-(--muted-bg) p-4">
          <p><strong>Data:</strong> {{ new Date(selectedTime).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }}</p>
          <p><strong>Serviços:</strong> {{ selectedServices.map((item) => item.name).join(", ") }}</p>
          <p class="text-2xl font-black">Total: {{ formatPrice(total) }}</p>
        </div>
        <label class="mt-5 flex min-h-14 items-center gap-3 border-2 border-(--border) p-3 font-bold"><input v-model="noConversation" type="checkbox" class="h-6 w-6"> Não quero conversar durante o atendimento</label>
        <label class="mt-4 block font-bold">Observações<textarea v-model="observations" class="mt-2 min-h-24 w-full border-2 border-(--border) p-3"></textarea></label>
        <fieldset class="mt-5"><legend class="font-black">Forma de pagamento</legend><div class="mt-2 grid gap-3 sm:grid-cols-3">
          <label class="min-h-14 border-2 border-(--border) p-3" :class="paymentTiming === 'PRESENCIAL_BALCAO' ? 'bg-[#F59E0B] text-[#09090B]' : ''"><input v-model="paymentTiming" type="radio" value="PRESENCIAL_BALCAO" class="mr-2"> Pagar no balcão</label>
          <label class="min-h-14 border-2 border-(--border) p-3" :class="paymentTiming === 'LIQUIDADO_AGORA' ? 'bg-[#F59E0B] text-[#09090B]' : ''"><input v-model="paymentTiming" type="radio" value="LIQUIDADO_AGORA" class="mr-2"> Pagar online agora</label>
          <label v-if="availableCredits > 0" class="min-h-14 border-2 border-(--border) p-3" :class="paymentTiming === 'PLANO' ? 'bg-[#F59E0B] text-[#09090B]' : ''"><input v-model="paymentTiming" type="radio" value="PLANO" class="mr-2"> Usar crédito do plano</label>
        </div></fieldset>
        <label class="mt-5 flex min-h-14 items-start gap-3 border-2 border-(--border) p-3 font-bold"><input v-model="lgpdConsent" type="checkbox" required class="mt-1 h-6 w-6"><span>Autorizo o tratamento dos meus dados para agendamento e lembretes, conforme a <NuxtLink to="/privacidade" class="underline">Política de Privacidade</NuxtLink>.</span></label>
        <p v-if="errorMessage" role="alert" class="mt-4 border-2 border-(--border) bg-[#EA580C] p-3 font-black text-[#09090B]">{{ errorMessage }}</p>
        <div class="mt-6 flex gap-3"><button type="button" class="min-h-14 flex-1 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="step = 2">Voltar</button><button type="button" class="min-h-14 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black" :disabled="busy" @click="finish">{{ busy ? "Salvando..." : "Confirmar agendamento" }}</button></div>
      </section>
    </div>
  </main>
</template>
