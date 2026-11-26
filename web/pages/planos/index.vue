<script setup lang="ts">
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice: number | null;
  promoLabel: string | null;
  cutCredits: number;
  beardCredits: number;
}

const { data: plans, pending: plansPending } = await useFetch<Plan[]>("/api/plans");
const { customer, refreshSession } = useCustomerAuth();
const { reveal } = useScrollReveal();
const activeSubscriptions = computed(() => customer.value?.subscriptions.filter((subscription) =>
  subscription.active && subscription.remainingCredits > 0 && new Date(subscription.expiresAt).getTime() > Date.now(),
) ?? []);
const availableCredits = computed(() => activeSubscriptions.value.reduce((sum, subscription) => sum + subscription.remainingCredits, 0));
const nextExpiry = computed(() => activeSubscriptions.value[0]?.expiresAt);

onMounted(() => refreshSession());

function planLink(planId: string): string {
  return customer.value ? `/pagamento/${planId}` : `/login?redirect=${encodeURIComponent(`/pagamento/${planId}`)}`;
}
function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-7xl">
      <h1 class="text-4xl font-black">Planos mensais VIP</h1>
      <aside class="mt-6 border-2 border-(--border) bg-[#F59E0B] p-4 text-[#09090B]">
        <strong>Regras:</strong> créditos válidos por 30 dias • atendimento de segunda a sábado, das 08h às 19h • cancelamento até 2h antes para não perder crédito.
      </aside>
      <aside v-if="availableCredits > 0" class="mt-5 border-2 border-[#09090B] bg-[#16A34A] p-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]" role="status">
        Você possui {{ availableCredits }} créditos ativos no seu Plano{{ nextExpiry ? ` — válidos até ${new Date(nextExpiry).toLocaleDateString("pt-BR")}` : "" }}.
        <NuxtLink to="/agendamento" class="ml-2 underline">Agendar atendimento</NuxtLink>
      </aside>
      <div class="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <BrutalSkeleton v-if="plansPending" variant="card" :count="4" class="md:col-span-2 lg:col-span-4" />
        <article v-for="plan in plans" :key="plan.id" :ref="reveal" class="relative border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <span v-if="plan.promoPrice !== null && plan.promoPrice < plan.price" class="absolute right-2 top-2 border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs font-black uppercase tracking-wider text-white">{{ plan.promoLabel || "PROMOÇÃO" }}</span>
          <h2 class="text-2xl font-black">{{ plan.name }}</h2>
          <p class="mt-3 min-h-12">{{ plan.description }}</p>
          <p class="mt-4 font-black">{{ plan.cutCredits ? `${plan.cutCredits} cortes` : "" }} {{ plan.cutCredits && plan.beardCredits ? "+" : "" }} {{ plan.beardCredits ? `${plan.beardCredits} barbas` : "" }}</p>
          <div class="mt-4 flex flex-wrap items-baseline gap-2">
            <span v-if="plan.promoPrice !== null && plan.promoPrice < plan.price" class="font-bold line-through opacity-60">{{ formatPrice(plan.price) }}</span>
            <p class="text-3xl font-black">{{ formatPrice(plan.promoPrice !== null && plan.promoPrice < plan.price ? plan.promoPrice : plan.price) }}<span class="text-base">/mês</span></p>
          </div>
          <p class="mt-3 border-t-2 border-(--border) pt-3 text-sm font-bold">Créditos válidos por 30 dias.</p>
          <NuxtLink :to="planLink(plan.id)" class="mt-5 flex min-h-14 items-center justify-center border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]">Assinar plano</NuxtLink>
        </article>
      </div>
    </div>
  </main>
</template>
