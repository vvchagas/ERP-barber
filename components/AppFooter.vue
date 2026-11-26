<template>
  <footer class="border-t-2 border-[#09090B] bg-[#09090B] px-4 py-10 text-white">
    <div class="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4">
      <section>
        <img src="/logo-navalha-corte.svg" alt="NAVALHA & CORTE" class="h-11 w-auto">
        <p class="mt-4 max-w-xs">Corte certo, atendimento claro e agendamento simples.</p>
      </section>
      <section>
        <h2 class="text-xl font-black">Endereço</h2>
        <address class="mt-3 not-italic">Rua das Barbearias, 100<br>Centro — São Paulo/SP</address>
      </section>
      <section>
        <h2 class="text-xl font-black">Horário</h2>
        <p class="mt-3">Segunda a sábado<br>08h às 19h</p>
      </section>
      <section>
        <h2 class="text-xl font-black">Links rápidos</h2>
        <nav class="mt-3 grid gap-1" aria-label="Links do rodapé">
          <NuxtLink to="/agendamento">Agendar</NuxtLink>
          <NuxtLink to="/planos">Planos VIP</NuxtLink>
          <NuxtLink to="/privacidade">Privacidade</NuxtLink>
          <NuxtLink to="/termos">Termos</NuxtLink>
        </nav>
        <p class="mt-4 border-2 border-[#F59E0B] px-3 py-2 text-sm font-black">LGPD • Dados protegidos</p>
      </section>
    </div>
  </footer>
</template>
