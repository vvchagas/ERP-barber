<script setup lang="ts">
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  cutCredits: number;
  beardCredits: number;
}

const { data: plans } = await useFetch<Plan[]>("/api/plans");
const { customer, refreshSession } = useCustomerAuth();
const activeSubscriptions = computed(() => customer.value?.subscriptions.filter((subscription) =>
  subscription.active && subscription.remainingCredits > 0 && new Date(subscription.expiresAt).getTime() > Date.now(),
) ?? []);
const availableCredits = computed(() => activeSubscriptions.value.reduce((sum, subscription) => sum + subscription.remainingCredits, 0));
const nextExpiry = computed(() => activeSubscriptions.value[0]?.expiresAt);

onMounted(() => refreshSession());

function planLink(planId: string): string {
  return customer.value ? `/pagamento/${planId}` : `/login?redirect=${encodeURIComponent(`/pagamento/${planId}`)}`;
}
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-7xl">
      <h1 class="text-4xl font-black">Planos mensais VIP</h1>
      <aside class="mt-6 border-2 border-(--border) bg-[#F59E0B] p-4 text-[#09090B]">
        <strong>Regras:</strong> créditos válidos por 30 dias • atendimento de segunda a sábado, das 08h às 19h • cancelamento até 2h antes para não perder crédito.
      </aside>
      <aside v-if="availableCredits > 0" class="mt-5 border-2 border-[#09090B] bg-[#16A34A] p-4 font-black text-white shadow-[4px_4px_0px_#09090B]" role="status">
        Você possui {{ availableCredits }} créditos ativos no seu Plano{{ nextExpiry ? ` — válidos até ${new Date(nextExpiry).toLocaleDateString("pt-BR")}` : "" }}.
        <NuxtLink to="/agendamento" class="ml-2 underline">Agendar atendimento</NuxtLink>
      </aside>
      <div class="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <article v-for="plan in plans" :key="plan.id" class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">{{ plan.name }}</h2>
          <p class="mt-3 min-h-12">{{ plan.description }}</p>
          <p class="mt-4 font-black">{{ plan.cutCredits ? `${plan.cutCredits} cortes` : "" }} {{ plan.cutCredits && plan.beardCredits ? "+" : "" }} {{ plan.beardCredits ? `${plan.beardCredits} barbas` : "" }}</p>
          <p class="mt-4 text-3xl font-black text-[#EA580C]">R$ {{ plan.price }}<span class="text-base">/mês</span></p>
          <p class="mt-3 border-t-2 border-(--border) pt-3 text-sm font-bold">Créditos válidos por 30 dias.</p>
          <NuxtLink :to="planLink(plan.id)" class="mt-5 flex min-h-14 items-center justify-center border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]">Assinar plano</NuxtLink>
        </article>
      </div>
    </div>
  </main>
</template>
