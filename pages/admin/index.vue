<script setup lang="ts">
definePageMeta({ middleware: "admin" });

interface Dashboard {
  gross: number;
  net: number;
  ticketAverage: number;
  absentRate: number;
  daily: Array<{ date: string; amount: number }>;
  commissionsByBarber: Array<{ barberId: string; name: string; total: number }>;
  paymentByMethod: Record<"PIX" | "CREDITO" | "DEBITO" | "DINHEIRO", number>;
}

interface AppointmentRow {
  id: string;
  scheduledAt: string;
  status: "AGENDADO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "FALTOU" | "CANCELADO";
  customer: { id: string; name: string };
  barber: { name: string };
}

const dashboard = ref<Dashboard | null>(null);
const appointments = ref<AppointmentRow[]>([]);
const busyId = ref("");
await refresh();

async function refresh(): Promise<void> {
  dashboard.value = await $fetch<Dashboard>("/api/admin/dashboard");
  appointments.value = await $fetch<AppointmentRow[]>("/api/appointments");
}

async function setStatus(id: string, status: AppointmentRow["status"]): Promise<void> {
  busyId.value = id;
  await $fetch(`/api/appointments/${id}/status`, { method: "PATCH", body: { status } });
  await refresh();
  busyId.value = "";
}

async function logout(): Promise<void> {
  await $fetch("/api/admin/logout", { method: "POST" });
  await navigateTo("/admin/login");
}

async function anonymizeCustomer(customerId: string): Promise<void> {
  await $fetch(`/api/admin/customers/${customerId}/anonymize`, { method: "POST" });
  await refresh();
}
</script>

<template>
  <main class="min-h-screen bg-[#F4F4F5] px-4 pb-12 pt-32 sm:pt-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-4xl font-black">PAINEL ERP</h1>
        <button type="button" class="min-h-12 border-2 border-[#09090B] bg-white px-4 font-black" @click="logout">SAIR</button>
      </div>

      <section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="border-2 border-[#09090B] bg-[#F59E0B] p-5 shadow-[4px_4px_0px_#09090B]"><p class="font-black">FATURAMENTO BRUTO</p><p class="mt-2 text-3xl font-black">R$ {{ dashboard?.gross.toFixed(2) ?? "0.00" }}</p></article>
        <article class="border-2 border-[#09090B] bg-white p-5 shadow-[4px_4px_0px_#09090B]"><p class="font-black">FATURAMENTO LÍQUIDO</p><p class="mt-2 text-3xl font-black">R$ {{ dashboard?.net.toFixed(2) ?? "0.00" }}</p></article>
        <article class="border-2 border-[#09090B] bg-white p-5 shadow-[4px_4px_0px_#09090B]"><p class="font-black">TICKET MÉDIO</p><p class="mt-2 text-3xl font-black">R$ {{ dashboard?.ticketAverage.toFixed(2) ?? "0.00" }}</p></article>
        <article class="border-2 border-[#09090B] bg-[#EA580C] p-5 text-white shadow-[4px_4px_0px_#09090B]"><p class="font-black">TAXA DE FALTAS</p><p class="mt-2 text-3xl font-black">{{ dashboard?.absentRate.toFixed(1) ?? "0.0" }}%</p></article>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <article class="border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">FATURAMENTO POR DIA</h2>
          <div class="mt-5 flex h-64 items-end gap-3 border-b-2 border-l-2 border-[#09090B] px-3">
            <div v-for="day in dashboard?.daily" :key="day.date" class="flex flex-1 flex-col items-center justify-end">
              <span class="mb-1 font-black">R$ {{ day.amount.toFixed(0) }}</span>
              <div class="w-full min-w-6 border-2 border-[#09090B] bg-[#F59E0B]" :style="{ height: `${Math.max(8, Math.min(220, day.amount))}px` }"></div>
              <span class="mt-2 text-sm">{{ day.date.slice(5) }}</span>
            </div>
          </div>
        </article>
        <article class="border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">POR PAGAMENTO</h2>
          <dl class="mt-4 space-y-3">
            <div v-for="(amount, method) in dashboard?.paymentByMethod" :key="method" class="flex justify-between border-b-2 border-[#09090B] py-2"><dt class="font-black">{{ method }}</dt><dd>R$ {{ amount.toFixed(2) }}</dd></div>
          </dl>
        </article>
      </section>

      <section class="mt-8 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h2 class="text-2xl font-black">COMISSÃO POR BARBEIRO</h2>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead><tr class="border-b-2 border-[#09090B]"><th class="p-3">Barbeiro</th><th class="p-3">Total</th></tr></thead>
            <tbody><tr v-for="commission in dashboard?.commissionsByBarber" :key="commission.barberId" class="border-b-2 border-[#09090B]"><td class="p-3 font-bold">{{ commission.name }}</td><td class="p-3 font-black">R$ {{ commission.total.toFixed(2) }}</td></tr></tbody>
          </table>
        </div>
      </section>

      <section class="mt-8 border-2 border-[#09090B] bg-white p-5 shadow-[8px_8px_0px_#09090B]">
        <h2 class="text-2xl font-black">GESTÃO DA AGENDA</h2>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-190 border-collapse text-left">
            <thead><tr class="border-b-2 border-[#09090B]"><th class="p-3">Cliente</th><th class="p-3">Barbeiro</th><th class="p-3">Data</th><th class="p-3">Status</th><th class="p-3">Ação</th></tr></thead>
            <tbody>
              <tr v-for="appointment in appointments" :key="appointment.id" class="border-b-2 border-[#09090B]">
                <td class="p-3 font-bold">{{ appointment.customer.name }}</td>
                <td class="p-3">{{ appointment.barber.name }}</td>
                <td class="p-3">{{ new Date(appointment.scheduledAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }}</td>
                <td class="p-3 font-black">{{ appointment.status }}</td>
                <td class="p-3">
                  <select class="min-h-12 border-2 border-[#09090B] px-2" :disabled="busyId === appointment.id" :value="appointment.status" @change="setStatus(appointment.id, ($event.target as HTMLSelectElement).value as AppointmentRow['status'])">
                    <option value="AGENDADO">AGENDADO</option>
                    <option value="EM_ATENDIMENTO">EM ATENDIMENTO</option>
                    <option value="CONCLUIDO">CONCLUÍDO</option>
                    <option value="FALTOU">FALTOU</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                  <button type="button" class="mt-2 block min-h-12 border-2 border-[#09090B] bg-white px-3 font-black" @click="anonymizeCustomer(appointment.customer.id)">Anonimizar cliente</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>
