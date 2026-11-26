<script setup lang="ts">
definePageMeta({ middleware: "admin" });

type Tab = "caixa" | "agenda" | "equipe" | "catalogo" | "clientes";
type AppointmentStatus = "AGENDADO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "FALTOU" | "CANCELADO";
type PaymentMethod = "PIX" | "CREDITO" | "DEBITO" | "DINHEIRO";
type NotificationType =
  | "APPOINTMENT_NEW"
  | "APPOINTMENT_CANCELED"
  | "APPOINTMENT_COMPLETED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_TEST"
  | "CUSTOMER_NEW"
  | "VIP_SUBSCRIBED"
  | "TEAM_UPDATE";

interface Dashboard {
  gross: number;
  net: number;
  ticketAverage: number;
  absentRate: number;
}
interface AppointmentRow {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  customer: { id: string; name: string };
  barber: { id: string; name: string };
  services: Array<{ unitPrice: number; quantity: number; service: { name: string } }>;
}
interface Barber {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
  active: boolean;
}
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice: number | null;
  promoLabel: string | null;
  durationMin: number;
  active: boolean;
}
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice: number | null;
  promoLabel: string | null;
  cutCredits: number;
  beardCredits: number;
  rules: string;
  active: boolean;
}
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  subscriptions: Array<{ id: string; remainingCredits: number; expiresAt: string; plan: { name: string } }>;
}
interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
interface Catalog {
  barbers: Barber[];
  services: Service[];
  plans: Plan[];
  customers: Customer[];
}
interface NotificationsResponse {
  notifications: AdminNotification[];
  unreadCount: number;
}

const route = useRoute();
const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const appointments = ref<AppointmentRow[]>([]);
const catalog = ref<Catalog>({ barbers: [], services: [], plans: [], customers: [] });
const notifications = ref<AdminNotification[]>([]);
const unreadCount = ref(0);
const selectedCategory = ref("TODAS");
const notificationsOpen = ref(false);
const busy = ref(false);
const busyId = ref("");
const pageMessage = ref("");
const activeTab = computed<Tab>(() => {
  const value = route.query.tab;
  return value === "agenda" || value === "equipe" || value === "catalogo" || value === "clientes"
    ? value
    : "caixa";
});
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "caixa", label: "Frente de caixa" },
  { id: "agenda", label: "Agenda & status" },
  { id: "equipe", label: "Equipe" },
  { id: "catalogo", label: "Serviços, promoções & VIP" },
  { id: "clientes", label: "Clientes & LGPD" },
];

const notificationTypes: Record<string, NotificationType[]> = {
  PAGAMENTOS: ["PAYMENT_CONFIRMED", "PAYMENT_TEST", "VIP_SUBSCRIBED"],
  AGENDAMENTOS: ["APPOINTMENT_NEW", "APPOINTMENT_COMPLETED"],
  CANCELAMENTOS: ["APPOINTMENT_CANCELED"],
  CADASTROS: ["CUSTOMER_NEW"],
  EQUIPE: ["TEAM_UPDATE"],
};
const filteredNotifications = computed(() => notifications.value.filter((item) =>
  selectedCategory.value === "TODAS" || notificationTypes[selectedCategory.value]?.includes(item.type),
));
const pendingAppointments = computed(() =>
  appointments.value.filter((item) => ["AGENDADO", "EM_ATENDIMENTO"].includes(item.status)),
);

const barberForm = reactive({
  name: "",
  specialty: "",
  bio: "",
  photoUrl: null as string | null,
  active: true,
});
const serviceForm = reactive({
  name: "",
  description: "",
  price: 35,
  promoPrice: null as number | null,
  promoLabel: "PROMOÇÃO",
  durationMin: 30,
  active: true,
});
const planForm = reactive({
  name: "",
  description: "",
  price: 99,
  promoPrice: null as number | null,
  promoLabel: "PROMOÇÃO",
  cutCredits: 0,
  beardCredits: 1,
  rules: "Créditos válidos por 30 dias. Atendimento de segunda a sábado, das 08h às 19h. Cancelamento com pelo menos 2 horas de antecedência.",
  active: true,
});
const editingBarberId = ref("");
const editingServiceId = ref("");
const editingPlanId = ref("");
const cashAppointmentId = ref("");
const cashMethod = ref<PaymentMethod>("PIX");
const cashAmount = ref(0);
const cashReceived = ref<number | null>(null);
const cashInstallments = ref(1);
const cashChange = computed(() => cashMethod.value === "DINHEIRO"
  ? Math.max(0, (cashReceived.value ?? 0) - cashAmount.value)
  : 0);

async function loadPanel(): Promise<void> {
  pageMessage.value = "";
  try {
    const [stats, appointmentRows, catalogData, notificationData] = await Promise.all([
      $fetch<Dashboard>("/api/admin/dashboard"),
      $fetch<AppointmentRow[]>("/api/appointments"),
      $fetch<Catalog>("/api/admin/catalog"),
      $fetch<NotificationsResponse>("/api/admin/notifications"),
    ]);
    dashboard.value = stats;
    appointments.value = appointmentRows;
    catalog.value = catalogData;
    notifications.value = notificationData.notifications;
    unreadCount.value = notificationData.unreadCount;
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível carregar o painel.";
  }
}

onMounted(() => { void loadPanel(); });

async function setTab(tab: Tab): Promise<void> {
  await router.replace({ path: "/admin", query: { ...route.query, tab } });
}

async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  busyId.value = id;
  pageMessage.value = "";
  try {
    await $fetch(`/api/appointments/${id}/status`, { method: "PATCH", body: { status } });
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível atualizar o agendamento.";
  } finally {
    busyId.value = "";
  }
}

async function markRead(id?: string): Promise<void> {
  try {
    await $fetch("/api/admin/notifications/read", {
      method: "PATCH",
      body: id ? { id } : { all: true },
    });
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível atualizar as notificações.";
  }
}

async function simulatePaymentTest(): Promise<void> {
  try {
    await $fetch("/api/admin/notifications/test", {
      method: "POST",
      body: { label: "Simulação solicitada no PDV" },
    });
    pageMessage.value = "Teste registrado. Nenhum valor financeiro foi criado.";
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível simular o teste.";
  }
}

async function logout(): Promise<void> {
  await $fetch("/api/admin/logout", { method: "POST" });
  await navigateTo("/admin/login");
}

async function anonymizeCustomer(customerId: string): Promise<void> {
  if (!window.confirm("Anonimizar permanentemente os dados pessoais deste cliente?")) return;
  try {
    await $fetch(`/api/admin/customers/${customerId}/anonymize`, { method: "POST" });
    pageMessage.value = "Dados pessoais anonimizados.";
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível anonimizar os dados.";
  }
}

function resetBarberForm(): void {
  editingBarberId.value = "";
  Object.assign(barberForm, { name: "", specialty: "", bio: "", photoUrl: null, active: true });
}
function editBarber(item: Barber): void {
  editingBarberId.value = item.id;
  Object.assign(barberForm, item);
  void setTab("equipe");
}
function resetServiceForm(): void {
  editingServiceId.value = "";
  Object.assign(serviceForm, { name: "", description: "", price: 35, promoPrice: null, promoLabel: "PROMOÇÃO", durationMin: 30, active: true });
}
function editService(item: Service): void {
  editingServiceId.value = item.id;
  Object.assign(serviceForm, item);
  void setTab("catalogo");
}
function resetPlanForm(): void {
  editingPlanId.value = "";
  Object.assign(planForm, { name: "", description: "", price: 99, promoPrice: null, promoLabel: "PROMOÇÃO", cutCredits: 0, beardCredits: 1, rules: "Créditos válidos por 30 dias. Atendimento de segunda a sábado, das 08h às 19h. Cancelamento com pelo menos 2 horas de antecedência.", active: true });
}
function editPlan(item: Plan): void {
  editingPlanId.value = item.id;
  Object.assign(planForm, item);
  void setTab("catalogo");
}

async function saveBarber(): Promise<void> {
  busy.value = true;
  pageMessage.value = "";
  try {
    const method = editingBarberId.value ? "PATCH" : "POST";
    await $fetch(editingBarberId.value ? `/api/admin/barbers/${editingBarberId.value}` : "/api/admin/barbers", {
      method,
      body: barberForm,
    });
    resetBarberForm();
    pageMessage.value = "Equipe atualizada.";
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível salvar o barbeiro.";
  } finally {
    busy.value = false;
  }
}

async function saveService(): Promise<void> {
  busy.value = true;
  pageMessage.value = "";
  try {
    await $fetch(editingServiceId.value ? `/api/admin/services/${editingServiceId.value}` : "/api/admin/services", {
      method: editingServiceId.value ? "PATCH" : "POST",
      body: { ...serviceForm, promoPrice: serviceForm.promoPrice ?? null, promoLabel: serviceForm.promoPrice !== null ? serviceForm.promoLabel : null },
    });
    resetServiceForm();
    pageMessage.value = "Serviço e promoção atualizados.";
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível salvar o serviço.";
  } finally {
    busy.value = false;
  }
}

async function savePlan(): Promise<void> {
  busy.value = true;
  pageMessage.value = "";
  try {
    await $fetch(editingPlanId.value ? `/api/admin/plans/${editingPlanId.value}` : "/api/admin/plans", {
      method: editingPlanId.value ? "PATCH" : "POST",
      body: { ...planForm, promoPrice: planForm.promoPrice ?? null, promoLabel: planForm.promoPrice !== null ? planForm.promoLabel : null },
    });
    resetPlanForm();
    pageMessage.value = "Plano VIP atualizado.";
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível salvar o plano.";
  } finally {
    busy.value = false;
  }
}

async function deleteResource(kind: "barbers" | "services" | "plans", id: string): Promise<void> {
  if (!window.confirm("Remover este item do catálogo ativo? Registros históricos serão preservados.")) return;
  try {
    const response = await $fetch<{ archived: boolean }>(`/api/admin/${kind}/${id}`, { method: "DELETE" });
    pageMessage.value = response.archived ? "Item arquivado para preservar os registros históricos." : "Item removido.";
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível remover este item.";
  }
}

async function compressPhoto(file: File): Promise<string> {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 150;
    canvas.height = 150;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Seu navegador não conseguiu preparar a foto.");
    const scale = Math.max(150 / image.width, 150 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (150 - width) / 2, (150 - height) / 2, width, height);
    for (let quality = 0.9; quality >= 0.3; quality -= 0.1) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (!blob) continue;
      if (blob.size > 20 * 1024) continue;
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Falha ao ler a foto."));
        reader.onerror = () => reject(new Error("Falha ao ler a foto."));
        reader.readAsDataURL(blob);
      });
    }
    throw new Error("A foto não pôde ser comprimida para menos de 20 KB.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadBarberPhoto(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    barberForm.photoUrl = await compressPhoto(file);
    pageMessage.value = "Foto preparada em WebP 150 × 150.";
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível preparar a foto.";
  }
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function effectiveAppointmentTotal(appointment: AppointmentRow): number {
  return appointment.services.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
}

watch(cashAppointmentId, (id) => {
  const appointment = appointments.value.find((item) => item.id === id);
  if (appointment) cashAmount.value = effectiveAppointmentTotal(appointment);
});

async function closeCash(): Promise<void> {
  pageMessage.value = "";
  if (cashAmount.value <= 0) {
    pageMessage.value = "Informe um valor maior que zero.";
    return;
  }
  if (cashMethod.value === "DINHEIRO" && (cashReceived.value ?? 0) < cashAmount.value) {
    pageMessage.value = "Valor recebido insuficiente.";
    return;
  }
  busy.value = true;
  try {
    await $fetch("/api/payments/checkout", {
      method: "POST",
      body: {
        appointmentId: cashAppointmentId.value || undefined,
        method: cashMethod.value,
        timing: "LIQUIDADO_AGORA",
        grossAmount: cashAmount.value,
        installments: cashInstallments.value,
        amountReceived: cashReceived.value ?? undefined,
      },
    });
    pageMessage.value = "Pagamento registrado.";
    cashAppointmentId.value = "";
    cashAmount.value = 0;
    cashReceived.value = null;
    await loadPanel();
  } catch (error: unknown) {
    pageMessage.value = error instanceof Error ? error.message : "Não foi possível fechar a comanda.";
  } finally {
    busy.value = false;
  }
}

async function refreshPanel(): Promise<void> {
  await loadPanel();
}
</script>

<template>
  <main class="min-h-screen bg-[#F4F4F5] px-4 pb-12 pt-28 text-[#09090B]">
    <div class="mx-auto max-w-7xl">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-1 font-black">ACESSO RESTRITO</p>
          <h1 class="mt-2 text-4xl font-black">PAINEL ADMINISTRATIVO</h1>
        </div>
        <div class="flex gap-2">
          <button type="button" class="relative min-h-12 border-2 border-[#09090B] bg-white px-4 font-black shadow-[4px_4px_0px_#09090B]" :aria-expanded="notificationsOpen" @click="notificationsOpen = !notificationsOpen">
            NOTIFICAÇÕES
            <span v-if="unreadCount" class="ml-2 inline-grid min-h-7 min-w-7 place-items-center border-2 border-[#09090B] bg-[#DC2626] px-1 text-sm text-white">{{ unreadCount }}</span>
          </button>
          <button type="button" class="min-h-12 border-2 border-[#09090B] bg-white px-4 font-black" @click="refreshPanel">ATUALIZAR</button>
          <button type="button" class="min-h-12 border-2 border-[#09090B] bg-[#09090B] px-4 font-black text-white" @click="logout">SAIR</button>
        </div>
      </header>

      <section v-if="notificationsOpen" class="mt-5 border-2 border-[#09090B] bg-white p-4 shadow-[8px_8px_0px_#09090B]" aria-label="Central de notificações">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-2xl font-black">CENTRAL DE NOTIFICAÇÕES</h2>
          <button type="button" class="min-h-11 border-2 border-[#09090B] bg-[#F59E0B] px-3 font-black" :disabled="unreadCount === 0" @click="markRead()">MARCAR TODAS COMO LIDAS</button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button v-for="category in ['TODAS', 'PAGAMENTOS', 'AGENDAMENTOS', 'CANCELAMENTOS', 'CADASTROS', 'EQUIPE']" :key="category" type="button" class="min-h-10 border-2 border-[#09090B] px-3 font-black" :class="selectedCategory === category ? 'bg-[#F59E0B]' : 'bg-white'" @click="selectedCategory = category">{{ category }}</button>
        </div>
        <ul class="mt-4 grid max-h-96 gap-3 overflow-y-auto">
          <li v-for="item in filteredNotifications" :key="item.id" class="flex flex-wrap items-start justify-between gap-3 border-2 border-[#09090B] p-3" :class="item.read ? 'bg-[#F4F4F5]' : 'bg-[#FEF3C7]'">
            <div><p class="font-black">{{ item.title }}</p><p>{{ item.message }}</p><p class="mt-1 text-sm font-bold">{{ item.type }} · {{ new Date(item.createdAt).toLocaleString("pt-BR") }}</p></div>
            <button v-if="!item.read" type="button" class="min-h-10 border-2 border-[#09090B] bg-white px-3 font-black" @click="markRead(item.id)">MARCAR LIDA</button>
          </li>
          <li v-if="!filteredNotifications.length" class="border-2 border-dashed border-[#09090B] p-4 font-bold">Nenhuma notificação nesta categoria.</li>
        </ul>
      </section>

      <section class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo financeiro">
        <article class="border-2 border-[#09090B] bg-[#F59E0B] p-4 shadow-[4px_4px_0px_#09090B]"><p class="font-black">FATURAMENTO BRUTO</p><p class="mt-1 text-2xl font-black">{{ formatPrice(dashboard?.gross ?? 0) }}</p></article>
        <article class="border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B]"><p class="font-black">FATURAMENTO LÍQUIDO</p><p class="mt-1 text-2xl font-black">{{ formatPrice(dashboard?.net ?? 0) }}</p></article>
        <article class="border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B]"><p class="font-black">TICKET MÉDIO</p><p class="mt-1 text-2xl font-black">{{ formatPrice(dashboard?.ticketAverage ?? 0) }}</p></article>
        <article class="border-2 border-[#09090B] bg-[#09090B] p-4 text-white shadow-[4px_4px_0px_#F59E0B]"><p class="font-black">TAXA DE FALTAS</p><p class="mt-1 text-2xl font-black">{{ (dashboard?.absentRate ?? 0).toFixed(1) }}%</p></article>
      </section>

      <nav class="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Seções administrativas">
        <button v-for="item in tabs" :key="item.id" type="button" class="min-h-14 border-2 border-[#09090B] px-3 font-black shadow-[3px_3px_0px_#09090B]" :class="activeTab === item.id ? 'bg-[#F59E0B]' : 'bg-white'" @click="setTab(item.id)">{{ item.label }}</button>
      </nav>

      <p v-if="pageMessage" class="mt-5 border-2 border-[#09090B] bg-[#FEF3C7] p-3 font-bold" role="status">{{ pageMessage }}</p>

      <section v-if="activeTab === 'caixa'" class="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article class="border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">FRENTE DE CAIXA / PDV</h2>
          <label class="mt-5 block font-black">COMANDA / AGENDAMENTO
            <select v-model="cashAppointmentId" class="mt-2 min-h-14 w-full border-2 border-[#09090B] bg-white px-3">
              <option value="">Venda avulsa</option>
              <option v-for="appointment in pendingAppointments" :key="appointment.id" :value="appointment.id">{{ appointment.customer.name }} — {{ appointment.id.slice(-6).toUpperCase() }}</option>
            </select>
          </label>
          <label class="mt-4 block font-black">VALOR DA VENDA
            <input v-model.number="cashAmount" type="number" min="0.01" step="0.01" class="mt-2 min-h-14 w-full border-2 border-[#09090B] px-3">
          </label>
          <fieldset class="mt-5">
            <legend class="font-black">FORMA DE PAGAMENTO</legend>
            <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button v-for="option in (['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO'] as PaymentMethod[])" :key="option" type="button" class="min-h-12 border-2 border-[#09090B] font-black" :class="cashMethod === option ? 'bg-[#F59E0B]' : 'bg-white'" @click="cashMethod = option">{{ option === "CREDITO" ? "CRÉDITO" : option }}</button>
            </div>
          </fieldset>
          <label v-if="cashMethod === 'DINHEIRO'" class="mt-5 block font-black">VALOR RECEBIDO
            <input v-model.number="cashReceived" type="number" min="0" step="0.01" class="mt-2 min-h-14 w-full border-2 border-[#09090B] px-3">
          </label>
          <label v-if="cashMethod === 'CREDITO'" class="mt-5 block font-black">PARCELAS
            <select v-model.number="cashInstallments" class="mt-2 min-h-14 w-full border-2 border-[#09090B] px-3"><option v-for="count in 12" :key="count" :value="count">{{ count }}x</option></select>
          </label>
          <p v-if="cashMethod === 'DINHEIRO'" class="mt-4 border-2 border-[#09090B] bg-[#F4F4F5] p-3 text-xl font-black">TROCO: {{ formatPrice(cashChange) }}</p>
          <p class="mt-4 text-sm font-bold">Confirme o PIX após verificar o recebimento no aplicativo bancário.</p>
          <button type="button" class="mt-5 min-h-14 w-full border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black shadow-[4px_4px_0px_#09090B]" :disabled="busy" @click="closeCash">{{ busy ? "PROCESSANDO…" : "REGISTRAR PAGAMENTO" }}</button>
          <button type="button" class="mt-4 min-h-12 w-full border-2 border-[#09090B] bg-white px-4 font-black" @click="simulatePaymentTest">SIMULAR CONFIRMAÇÃO DE PAGAMENTO TESTE</button>
        </article>
        <aside class="h-fit border-2 border-[#09090B] bg-[#09090B] p-5 text-white shadow-[8px_8px_0px_#F59E0B]">
          <h2 class="text-2xl font-black">RESUMO DO CAIXA</h2>
          <p class="mt-5 flex justify-between"><span>Total</span><strong>{{ formatPrice(cashAmount) }}</strong></p>
          <p v-if="cashMethod === 'DINHEIRO'" class="mt-3 flex justify-between border-t-2 border-white pt-3"><span>Troco</span><strong>{{ formatPrice(cashChange) }}</strong></p>
          <p class="mt-5 border-2 border-white p-3 font-bold">Valores de comandas são recalculados no servidor. A simulação de teste não cria transação nem altera o caixa.</p>
        </aside>
      </section>

      <section v-else-if="activeTab === 'agenda'" class="mt-6 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h2 class="text-2xl font-black">AGENDA &amp; STATUS</h2>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[800px] border-collapse text-left">
            <thead><tr class="border-b-2 border-[#09090B]"><th class="p-3">Cliente</th><th class="p-3">Barbeiro</th><th class="p-3">Data</th><th class="p-3">Status</th><th class="p-3">Ações</th></tr></thead>
            <tbody><tr v-for="item in appointments" :key="item.id" class="border-b-2 border-[#09090B]">
              <td class="p-3 font-bold">{{ item.customer.name }}</td><td class="p-3">{{ item.barber.name }}</td>
              <td class="p-3">{{ new Date(item.scheduledAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }}</td>
              <td class="p-3 font-black">{{ item.status }}</td>
              <td class="p-3"><div class="flex flex-wrap gap-2">
                <button type="button" class="min-h-11 border-2 border-[#09090B] bg-[#16A34A] px-3 font-black text-white" :disabled="busyId === item.id || item.status === 'CONCLUIDO'" @click="setAppointmentStatus(item.id, 'CONCLUIDO')">CONCLUÍDO</button>
                <button type="button" class="min-h-11 border-2 border-[#09090B] bg-[#DC2626] px-3 font-black text-white" :disabled="busyId === item.id || item.status === 'CANCELADO'" @click="setAppointmentStatus(item.id, 'CANCELADO')">CANCELAR</button>
              </div></td>
            </tr></tbody>
          </table>
          <p v-if="!appointments.length" class="p-4 font-bold">Nenhum agendamento cadastrado.</p>
        </div>
      </section>

      <section v-else-if="activeTab === 'equipe'" class="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form class="h-fit border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]" @submit.prevent="saveBarber">
          <h2 class="text-2xl font-black">{{ editingBarberId ? "EDITAR BARBEIRO" : "CADASTRAR BARBEIRO" }}</h2>
          <label class="mt-4 block font-black">NOME<input v-model="barberForm.name" required maxlength="100" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
          <label class="mt-4 block font-black">ESPECIALIDADE<input v-model="barberForm.specialty" required maxlength="120" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
          <label class="mt-4 block font-black">BIO<textarea v-model="barberForm.bio" maxlength="1000" class="mt-2 min-h-24 w-full border-2 border-[#09090B] p-3"></textarea></label>
          <label class="mt-4 block font-black">FOTO WEBP (150 × 150, até 20 KB)<input type="file" accept="image/*" class="mt-2 block w-full border-2 border-[#09090B] p-2" @change="uploadBarberPhoto"></label>
          <img v-if="barberForm.photoUrl" :src="barberForm.photoUrl" alt="Prévia da foto do barbeiro" class="mt-3 h-24 w-24 border-2 border-[#09090B] object-cover">
          <label class="mt-4 flex min-h-12 items-center gap-2 font-bold"><input v-model="barberForm.active" type="checkbox" class="h-5 w-5"> Ativo no site e nos agendamentos</label>
          <div class="mt-4 flex gap-2"><button type="submit" class="min-h-12 flex-1 border-2 border-[#09090B] bg-[#F59E0B] px-3 font-black" :disabled="busy">{{ busy ? "SALVANDO…" : editingBarberId ? "SALVAR" : "CADASTRAR" }}</button><button v-if="editingBarberId" type="button" class="min-h-12 border-2 border-[#09090B] px-3 font-black" @click="resetBarberForm">CANCELAR</button></div>
        </form>
        <div class="grid content-start gap-4">
          <article v-for="item in catalog.barbers" :key="item.id" class="grid gap-4 border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B] sm:grid-cols-[100px_1fr]">
            <img v-if="item.photoUrl" :src="item.photoUrl" :alt="`Retrato de ${item.name}`" class="h-24 w-24 border-2 border-[#09090B] object-cover">
            <div v-else class="grid h-24 w-24 place-items-center border-2 border-[#09090B] bg-[#F59E0B] text-3xl font-black">{{ item.name.slice(0, 1) }}</div>
            <div><h3 class="text-xl font-black">{{ item.name }} <span v-if="!item.active" class="text-sm">· INATIVO</span></h3><p class="font-bold">{{ item.specialty }}</p><p class="mt-1">{{ item.bio }}</p><div class="mt-3 flex gap-2"><button type="button" class="min-h-10 border-2 border-[#09090B] bg-[#F59E0B] px-3 font-black" @click="editBarber(item)">EDITAR</button><button type="button" class="min-h-10 border-2 border-[#09090B] bg-white px-3 font-black" @click="deleteResource('barbers', item.id)">REMOVER</button></div></div>
          </article>
        </div>
      </section>

      <section v-else-if="activeTab === 'catalogo'" class="mt-6 grid gap-6 xl:grid-cols-2">
        <form class="border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]" @submit.prevent="saveService">
          <h2 class="text-2xl font-black">{{ editingServiceId ? "EDITAR SERVIÇO" : "NOVO SERVIÇO" }}</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <label class="font-black">NOME<input v-model="serviceForm.name" required maxlength="120" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">DURAÇÃO (MIN)<input v-model.number="serviceForm.durationMin" required type="number" min="5" max="480" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">PREÇO ORIGINAL<input v-model.number="serviceForm.price" required type="number" min="0" step="0.01" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">PREÇO PROMOCIONAL (opcional)<input v-model.number="serviceForm.promoPrice" type="number" min="0" step="0.01" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black sm:col-span-2">TEXTO DO SELO<input v-model="serviceForm.promoLabel" maxlength="40" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black sm:col-span-2">DESCRIÇÃO<textarea v-model="serviceForm.description" maxlength="1000" class="mt-2 min-h-20 w-full border-2 border-[#09090B] p-3"></textarea></label>
          </div>
          <label class="mt-3 flex min-h-12 items-center gap-2 font-bold"><input v-model="serviceForm.active" type="checkbox" class="h-5 w-5"> Ativo</label>
          <div class="mt-3 flex gap-2"><button type="submit" class="min-h-12 flex-1 border-2 border-[#09090B] bg-[#F59E0B] font-black" :disabled="busy">{{ editingServiceId ? "SALVAR SERVIÇO" : "CRIAR SERVIÇO" }}</button><button v-if="editingServiceId" type="button" class="min-h-12 border-2 border-[#09090B] px-3 font-black" @click="resetServiceForm">CANCELAR</button></div>
          <div class="mt-5 grid gap-3">
            <article v-for="item in catalog.services" :key="item.id" class="border-2 border-[#09090B] p-3">
              <p class="font-black">{{ item.name }} <span v-if="!item.active">· INATIVO</span></p><p>{{ item.description }}</p>
              <p class="font-bold"><span v-if="item.promoPrice !== null && item.promoPrice < item.price" class="line-through opacity-60">{{ formatPrice(item.price) }}</span> {{ formatPrice(item.promoPrice !== null && item.promoPrice < item.price ? item.promoPrice : item.price) }} <span v-if="item.promoPrice !== null && item.promoPrice < item.price" class="ml-2 border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs font-black text-white">{{ item.promoLabel || "PROMOÇÃO" }}</span></p>
              <div class="mt-2 flex gap-2"><button type="button" class="min-h-10 border-2 border-[#09090B] bg-[#F59E0B] px-3 font-black" @click="editService(item)">EDITAR</button><button type="button" class="min-h-10 border-2 border-[#09090B] px-3 font-black" @click="deleteResource('services', item.id)">REMOVER</button></div>
            </article>
          </div>
        </form>

        <form class="border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]" @submit.prevent="savePlan">
          <h2 class="text-2xl font-black">{{ editingPlanId ? "EDITAR PLANO VIP" : "NOVO PLANO VIP" }}</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <label class="font-black sm:col-span-2">NOME<input v-model="planForm.name" required maxlength="120" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">PREÇO ORIGINAL<input v-model.number="planForm.price" required type="number" min="0" step="0.01" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">PREÇO PROMOCIONAL<input v-model.number="planForm.promoPrice" type="number" min="0" step="0.01" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">CRÉDITOS DE CORTE<input v-model.number="planForm.cutCredits" type="number" min="0" max="100" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black">CRÉDITOS DE BARBA<input v-model.number="planForm.beardCredits" type="number" min="0" max="100" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black sm:col-span-2">TEXTO DO SELO<input v-model="planForm.promoLabel" maxlength="40" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3"></label>
            <label class="font-black sm:col-span-2">DESCRIÇÃO<textarea v-model="planForm.description" maxlength="1000" class="mt-2 min-h-20 w-full border-2 border-[#09090B] p-3"></textarea></label>
            <label class="font-black sm:col-span-2">REGRAS<textarea v-model="planForm.rules" maxlength="2000" class="mt-2 min-h-20 w-full border-2 border-[#09090B] p-3"></textarea></label>
          </div>
          <label class="mt-3 flex min-h-12 items-center gap-2 font-bold"><input v-model="planForm.active" type="checkbox" class="h-5 w-5"> Ativo</label>
          <div class="mt-3 flex gap-2"><button type="submit" class="min-h-12 flex-1 border-2 border-[#09090B] bg-[#F59E0B] font-black" :disabled="busy">{{ editingPlanId ? "SALVAR PLANO" : "CRIAR PLANO" }}</button><button v-if="editingPlanId" type="button" class="min-h-12 border-2 border-[#09090B] px-3 font-black" @click="resetPlanForm">CANCELAR</button></div>
          <div class="mt-5 grid gap-3">
            <article v-for="item in catalog.plans" :key="item.id" class="border-2 border-[#09090B] p-3">
              <p class="font-black">{{ item.name }} <span v-if="!item.active">· INATIVO</span></p><p>{{ item.description }} · {{ item.cutCredits }} cortes / {{ item.beardCredits }} barbas</p>
              <p class="font-bold"><span v-if="item.promoPrice !== null && item.promoPrice < item.price" class="line-through opacity-60">{{ formatPrice(item.price) }}</span> {{ formatPrice(item.promoPrice !== null && item.promoPrice < item.price ? item.promoPrice : item.price) }} <span v-if="item.promoPrice !== null && item.promoPrice < item.price" class="ml-2 border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs font-black text-white">{{ item.promoLabel || "PROMOÇÃO" }}</span></p>
              <div class="mt-2 flex gap-2"><button type="button" class="min-h-10 border-2 border-[#09090B] bg-[#F59E0B] px-3 font-black" @click="editPlan(item)">EDITAR</button><button type="button" class="min-h-10 border-2 border-[#09090B] px-3 font-black" @click="deleteResource('plans', item.id)">REMOVER</button></div>
            </article>
          </div>
        </form>
      </section>

      <section v-else class="mt-6 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h2 class="text-2xl font-black">CLIENTES &amp; LGPD</h2>
        <p class="mt-2">Clientes recentes e créditos ativos. A anonimização preserva registros de caixa e remove dados pessoais.</p>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse text-left">
            <thead><tr class="border-b-2 border-[#09090B]"><th class="p-3">Cliente</th><th class="p-3">Contato</th><th class="p-3">Créditos VIP</th><th class="p-3">Cadastro</th><th class="p-3">Ação LGPD</th></tr></thead>
            <tbody><tr v-for="item in catalog.customers" :key="item.id" class="border-b-2 border-[#09090B]">
              <td class="p-3 font-bold">{{ item.name }}</td><td class="p-3">{{ item.phone }}<br>{{ item.email || "Sem e-mail" }}</td>
              <td class="p-3"><span v-if="item.subscriptions.length">{{ item.subscriptions.map((sub) => `${sub.plan.name}: ${sub.remainingCredits}`).join(" · ") }}</span><span v-else>Sem plano ativo</span></td>
              <td class="p-3">{{ new Date(item.createdAt).toLocaleDateString("pt-BR") }}</td>
              <td class="p-3"><button type="button" class="min-h-11 border-2 border-[#09090B] bg-[#DC2626] px-3 font-black text-white" @click="anonymizeCustomer(item.id)">ANONIMIZAR</button></td>
            </tr></tbody>
          </table>
          <p v-if="!catalog.customers.length" class="p-4 font-bold">Nenhum cliente disponível para exibição.</p>
        </div>
      </section>
    </div>
  </main>
</template>
