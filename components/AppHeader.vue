<script setup lang="ts">
const dark = ref(false);

onMounted(() => {
  dark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark.value ? "dark" : "light";
});

function toggleTheme(): void {
  dark.value = !dark.value;
  document.documentElement.dataset.theme = dark.value ? "dark" : "light";
  document.documentElement.style.background = dark.value ? "#09090B" : "#FFFFFF";
  document.body.style.background = dark.value ? "#09090B" : "#FFFFFF";
}
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 border-b-2 border-[#09090B] px-4 py-3 sm:px-6"
    :class="dark ? 'bg-[#09090B] text-white' : 'bg-white text-[#09090B]'"
  >
    <nav class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4" aria-label="Navegação principal">
      <NuxtLink
        to="/"
        class="mr-auto flex min-h-12 items-center"
        aria-label="NAVALHA & CORTE - Início"
      >
        <img
          src="/favicon.ico"
          alt=""
          width="640"
          height="180"
          class="h-12 w-auto max-w-[180px]"
        >
      </NuxtLink>
      <div class="hidden items-center gap-4 lg:flex">
        <NuxtLink class="flex min-h-12 items-center border-2 border-[#09090B] bg-white px-4 font-black text-[#09090B]" to="/">INÍCIO</NuxtLink>
        <NuxtLink class="flex min-h-12 items-center border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none" to="/agendamento">AGENDAR</NuxtLink>
        <NuxtLink class="flex min-h-12 items-center border-2 border-[#09090B] bg-white px-4 font-black text-[#09090B]" to="/caixa">CAIXA</NuxtLink>
        <NuxtLink class="flex min-h-12 items-center border-2 border-[#09090B] bg-white px-4 font-black text-[#09090B]" to="/admin">ADMIN</NuxtLink>
        <button
          type="button"
          class="min-h-12 min-w-12 border-2 border-[#09090B] bg-[#F4F4F5] px-3 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]"
          :aria-label="dark ? 'Ativar tema claro' : 'Ativar tema escuro'"
          @click="toggleTheme"
        >
          {{ dark ? "CLARO" : "ESCURO" }}
        </button>
      </div>
      <div class="flex items-center gap-2 lg:hidden">
        <NuxtLink class="flex min-h-12 items-center border-2 border-[#09090B] bg-[#F59E0B] px-3 font-black text-[#09090B]" to="/agendamento">AGENDAR</NuxtLink>
        <button
          type="button"
          class="min-h-12 min-w-12 border-2 border-[#09090B] bg-[#F4F4F5] px-2 font-black text-[#09090B]"
          :aria-label="dark ? 'Ativar tema claro' : 'Ativar tema escuro'"
          @click="toggleTheme"
        >
          {{ dark ? "CLARO" : "ESC" }}
        </button>
      </div>
      <div class="grid w-full grid-cols-4 gap-2 lg:hidden">
        <NuxtLink class="flex min-h-12 items-center justify-center border-2 border-[#09090B] bg-white px-1 text-sm font-black text-[#09090B]" to="/">INÍCIO</NuxtLink>
        <NuxtLink class="flex min-h-12 items-center justify-center border-2 border-[#09090B] bg-[#F59E0B] px-1 text-sm font-black text-[#09090B]" to="/agendamento">AGENDAR</NuxtLink>
        <NuxtLink class="flex min-h-12 items-center justify-center border-2 border-[#09090B] bg-white px-1 text-sm font-black text-[#09090B]" to="/caixa">CAIXA</NuxtLink>
        <NuxtLink class="flex min-h-12 items-center justify-center border-2 border-[#09090B] bg-white px-1 text-sm font-black text-[#09090B]" to="/admin">ADMIN</NuxtLink>
      </div>
    </nav>
  </header>
</template>
