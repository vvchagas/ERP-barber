<script setup lang="ts">
interface ServiceCard {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  promoPrice: number | null;
  promoLabel: string | null;
}
interface BarberCard {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
}

const { data: services, pending: servicesPending } = await useFetch<ServiceCard[]>("/api/services");
const { data: barbers, pending: barbersPending } = await useFetch<BarberCard[]>("/api/barbers");
const { data: plans, pending: plansPending } = await useFetch<Array<{ id: string; name: string; description: string; price: number; promoPrice: number | null; promoLabel: string | null }>>("/api/plans");
const { reveal } = useScrollReveal();

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
</script>

<template>
  <main class="pt-32 sm:pt-18">
    <section class="border-b-2 border-[#09090B] bg-[#F4F4F5] px-4 py-10">
      <div class="mx-auto grid max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p class="mb-3 inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-2 font-black shadow-[4px_4px_0px_#09090B]">
            CORTE CERTO. TODAS AS IDADES.
          </p>
          <h1 class="mt-5 text-5xl font-black leading-none sm:text-7xl">NAVALHA &amp; CORTE</h1>
          <p class="mt-6 max-w-xl text-lg font-bold sm:text-xl">
            Seu horário, seu barbeiro e um atendimento feito para você.
          </p>
          <dl class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B]">
              <dt class="font-black">HORÁRIO</dt>
              <dd>Segunda a sábado, 08h às 19h</dd>
            </div>
            <div class="border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B]">
              <dt class="font-black">ENDEREÇO</dt>
              <dd>Rua das Barbearias, 100</dd>
            </div>
          </dl>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <p class="border-2 border-[#09090B] bg-white p-3 font-bold">ACESSO FÁCIL</p>
            <p class="border-2 border-[#09090B] bg-white p-3 font-bold">WI-FI</p>
            <p class="border-2 border-[#09090B] bg-white p-3 font-bold">FAMÍLIA</p>
          </div>
          <NuxtLink
            to="/agendamento"
            class="mt-8 flex min-h-16 w-full items-center justify-center border-2 border-[#09090B] bg-[#F59E0B] px-6 text-xl font-black shadow-[8px_8px_0px_#09090B] sm:w-auto"
          >
            AGENDAR AGORA
          </NuxtLink>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <figure class="border-2 border-[#09090B] bg-white shadow-[8px_8px_0px_#09090B]">
            <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=85" alt="Interior moderno de barbearia" class="h-90 w-full object-cover" loading="eager" fetchpriority="high" decoding="async">
          </figure>
        </div>
      </div>
    </section>

    <section :ref="reveal" class="border-b-2 border-[#09090B] bg-white px-4 py-14">
      <article class="mx-auto grid max-w-6xl gap-8 border-2 border-[#09090B] bg-[#F4F4F5] p-6 shadow-[8px_8px_0px_#09090B] md:grid-cols-[1fr_0.8fr] md:items-center md:p-10">
        <div>
          <p class="inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-2 font-black">DESDE A FUNDAÇÃO</p>
          <h2 class="mt-4 text-3xl font-black sm:text-4xl">Nossa História &amp; Tradição</h2>
          <p class="mt-4 text-lg leading-relaxed">A NAVALHA &amp; CORTE nasceu para manter viva a tradição da barbearia: conversa acolhedora, técnica cuidadosa e o ritual clássico da toalha quente. Recebemos crianças, jovens, adultos e idosos com respeito e atenção em cada detalhe.</p>
          <NuxtLink to="/agendamento" class="mt-6 inline-flex min-h-14 items-center border-2 border-[#09090B] bg-[#F59E0B] px-5 font-black shadow-[4px_4px_0px_#09090B]">Conheça a barbearia</NuxtLink>
        </div>
        <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=85" alt="Barbeiro preparando uma toalha quente para o atendimento" class="h-72 w-full border-2 border-[#09090B] object-cover" loading="lazy" decoding="async">
      </article>
    </section>

    <section :ref="reveal" class="bg-[#F4F4F5] px-4 py-12">
      <div class="mx-auto max-w-6xl">
        <p class="inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-2 font-black">QUEM CUIDA DO SEU CORTE</p>
        <h2 class="mt-4 text-4xl font-black">Nossa equipe</h2>
        <div class="mt-6 grid gap-5 md:grid-cols-2">
          <BrutalSkeleton v-if="barbersPending" variant="list-item" :count="4" />
          <article v-for="barber in barbers" :key="barber.id" :ref="reveal" class="grid overflow-hidden border-2 border-[#09090B] bg-white shadow-[4px_4px_0px_#09090B] sm:grid-cols-[180px_1fr]">
            <img v-if="barber.photoUrl" :src="barber.photoUrl" :alt="`Retrato de ${barber.name}`" class="h-56 w-full object-cover sm:h-full" loading="lazy" decoding="async">
            <div v-else class="grid min-h-48 place-items-center bg-[#F59E0B] text-5xl font-black">{{ barber.name.slice(0, 1) }}</div>
            <div class="p-5">
              <h3 class="text-2xl font-black">{{ barber.name }}</h3>
              <p class="mt-2 font-black text-[#09090B]">{{ barber.specialty }}</p>
              <p class="mt-3">{{ barber.bio }}</p>
            </div>
          </article>
          <p v-if="!barbersPending && !barbers?.length" class="border-2 border-[#09090B] bg-white p-5 font-bold">Nossa equipe estará disponível em breve.</p>
        </div>
      </div>
    </section>

    <section class="px-4 py-12">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-4xl font-black">SERVIÇOS</h2>
        <div class="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <BrutalSkeleton v-if="servicesPending" variant="card" :count="4" class="md:col-span-2 lg:col-span-4" />
          <article
            v-for="service in services"
            :key="service.id"
            :ref="reveal"
            class="relative border-2 border-[#09090B] bg-white p-5 text-[#09090B] shadow-[4px_4px_0px_#09090B]"
          >
            <span v-if="service.promoPrice !== null && service.promoPrice < service.price" class="absolute right-2 top-2 border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs font-black uppercase tracking-wider text-white">{{ service.promoLabel || "PROMOÇÃO" }}</span>
            <h3 class="text-xl font-black">{{ service.name }}</h3>
            <p class="mt-2 min-h-12">{{ service.description || `${service.durationMin} minutos de atendimento` }}</p>
            <div class="mt-4 flex flex-wrap items-baseline gap-2">
              <span v-if="service.promoPrice !== null && service.promoPrice < service.price" class="font-bold line-through opacity-60">{{ formatPrice(service.price) }}</span>
              <p class="text-2xl font-black">{{ formatPrice(service.promoPrice !== null && service.promoPrice < service.price ? service.promoPrice : service.price) }}</p>
            </div>
            <p class="mt-1 font-bold">{{ service.durationMin }} MIN</p>
          </article>
          <article
            v-for="name in (!services?.length ? ['Corte', 'Barba', 'Combo', 'Platinado'] : [])"
            :key="name"
            class="border-2 border-[#09090B] bg-white p-5 shadow-[4px_4px_0px_#09090B]"
          >
            <h3 class="text-xl font-black">{{ name }}</h3>
            <p class="mt-2 min-h-12">Consulte duração e preço no agendamento.</p>
          </article>
        </div>

        <h2 class="mt-12 text-4xl font-black">CLUBE VIP</h2>
        <div class="mt-6 grid gap-5 md:grid-cols-2">
          <BrutalSkeleton v-if="plansPending" variant="card" :count="4" class="md:col-span-2" />
          <article
            v-for="plan in plans"
            :key="plan.id"
            :ref="reveal"
            class="relative border-2 border-[#09090B] bg-[#F59E0B] p-6 text-[#09090B] shadow-[8px_8px_0px_#09090B]"
          >
            <span v-if="plan.promoPrice !== null && plan.promoPrice < plan.price" class="absolute right-2 top-2 border-2 border-[#09090B] bg-[#DC2626] px-2 py-1 text-xs font-black uppercase tracking-wider text-white">{{ plan.promoLabel || "PROMOÇÃO" }}</span>
            <h3 class="text-2xl font-black">{{ plan.name }}</h3>
            <p class="mt-3">{{ plan.description }}</p>
            <div class="mt-4 flex flex-wrap items-baseline gap-2">
              <span v-if="plan.promoPrice !== null && plan.promoPrice < plan.price" class="font-bold line-through opacity-70">{{ formatPrice(plan.price) }}</span>
              <p class="text-3xl font-black">{{ formatPrice(plan.promoPrice !== null && plan.promoPrice < plan.price ? plan.promoPrice : plan.price) }}/MÊS</p>
            </div>
            <NuxtLink to="/planos" class="mt-5 inline-flex min-h-12 items-center border-2 border-[#09090B] bg-white px-4 font-black shadow-[4px_4px_0px_#09090B]">Ver plano</NuxtLink>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>
