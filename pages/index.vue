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
  { name: "CLUBE VIP MENSAL", description: "2 cortes por mes + barba", price: 149 },
  { name: "CLUBE VIP PREMIUM", description: "4 cortes por mes + barba", price: 249 },
];
</script>

<template>
  <main class="pt-32 sm:pt-[72px]">
    <section class="border-b-2 border-[#09090B] bg-[#F4F4F5] px-4 py-10">
      <div class="mx-auto grid max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p class="mb-3 inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-2 font-black shadow-[4px_4px_0px_#09090B]">
            CORTE CERTO. TODAS AS IDADES.
          </p>
          <h1 class="mt-5 text-5xl font-black leading-none sm:text-7xl">NAVALHA &amp; CORTE</h1>
          <p class="mt-6 max-w-xl text-lg font-bold sm:text-xl">
            Seu horario, seu barbeiro e um atendimento feito para voce.
          </p>
          <dl class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B]">
              <dt class="font-black">HORARIO</dt>
              <dd>Seg-Sab, 9h as 19h</dd>
            </div>
            <div class="border-2 border-[#09090B] bg-white p-4 shadow-[4px_4px_0px_#09090B]">
              <dt class="font-black">ENDERECO</dt>
              <dd>Rua das Barbearias, 100</dd>
            </div>
          </dl>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <p class="border-2 border-[#09090B] bg-white p-3 font-bold">ACESSO FACIL</p>
            <p class="border-2 border-[#09090B] bg-white p-3 font-bold">WI-FI</p>
            <p class="border-2 border-[#09090B] bg-white p-3 font-bold">FAMILIA</p>
          </div>
          <NuxtLink
            to="/agendamento"
            class="mt-8 flex min-h-16 w-full items-center justify-center border-2 border-[#09090B] bg-[#F59E0B] px-6 text-xl font-black shadow-[8px_8px_0px_#09090B] sm:w-auto"
          >
            AGENDAR AGORA
          </NuxtLink>
        </div>
        <div class="border-2 border-[#09090B] bg-white shadow-[8px_8px_0px_#09090B]">
          <BarberPoleThree />
        </div>
      </div>
    </section>

    <section class="px-4 py-12">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-4xl font-black">SERVICOS</h2>
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
            <p class="mt-2 min-h-12">Consulte duracao e preco no agendamento.</p>
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
            <p class="mt-4 text-3xl font-black">R$ {{ plan.price }}/MES</p>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>
