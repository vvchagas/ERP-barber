<script setup lang="ts">
interface ServiceCard {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
}

const { data: services } = await useFetch<ServiceCard[]>("/api/services");
const plans = [
  { name: "CLUBE VIP MENSAL", description: "2 cortes por mês", price: 149 },
  { name: "CLUBE VIP PREMIUM", description: "4 cortes + 4 barbas por mês", price: 249 },
];
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
            <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=85" alt="Interior moderno de barbearia" class="h-90 w-full object-cover">
          </figure>
          <div class="border-2 border-[#09090B] bg-white shadow-[8px_8px_0px_#09090B]">
            <BarberPoleThree />
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-12">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-4xl font-black">SERVIÇOS</h2>
        <div class="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <article
            v-for="service in services"
            :key="service.id"
            class="border-2 border-[#09090B] bg-white p-5 shadow-[4px_4px_0px_#09090B]"
          >
            <h3 class="text-xl font-black">{{ service.name }}</h3>
            <p class="mt-2 min-h-12">{{ service.description || `${service.durationMin} minutos de atendimento` }}</p>
            <p class="mt-4 text-2xl font-black text-[#EA580C]">R$ {{ service.price.toFixed(2) }}</p>
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
          <article
            v-for="plan in plans"
            :key="plan.name"
            class="border-2 border-[#09090B] bg-[#F59E0B] p-6 shadow-[8px_8px_0px_#09090B]"
          >
            <h3 class="text-2xl font-black">{{ plan.name }}</h3>
            <p class="mt-3">{{ plan.description }}</p>
            <p class="mt-4 text-3xl font-black">R$ {{ plan.price }}/MÊS</p>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>
