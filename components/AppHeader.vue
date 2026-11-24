<script setup lang="ts">
type Theme = "light" | "dark" | "high-contrast";
const route = useRoute();
const menuOpen = ref(false);
const theme = ref<Theme>("light");

const links = [
  { label: "Início", to: "/" },
  { label: "Agendar", to: "/agendamento" },
  { label: "Planos VIP", to: "/planos" },
  { label: "Caixa", to: "/caixa" },
  { label: "Configurações", to: "/configuracoes" },
];

function applyTheme(value: Theme): void {
  theme.value = value;
  const root = document.documentElement;
  root.classList.remove("light", "dark", "high-contrast");
  root.classList.add(value);
  root.dataset.theme = value;
  localStorage.setItem("navalha-theme", value);
}

function toggleTheme(): void {
  applyTheme(theme.value === "light" ? "dark" : theme.value === "dark" ? "high-contrast" : "light");
}

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onMounted(() => {
  const saved = localStorage.getItem("navalha-theme");
  applyTheme(saved === "dark" || saved === "high-contrast" ? saved : "light");
  const senior = localStorage.getItem("navalha-senior") === "true";
  document.documentElement.classList.toggle("senior-mode", senior);
});

onBeforeUnmount(() => { document.body.style.overflow = ""; });
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50 border-b-2 border-[#09090B] bg-(--surface-bg) text-(--fg)">
    <nav class="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Navegação principal">
      <NuxtLink to="/" class="flex h-11 items-center" aria-label="NAVALHA & CORTE - Início">
        <img src="/favicon.ico" alt="NAVALHA & CORTE" class="h-11 w-auto">
      </NuxtLink>
      <div class="hidden items-center gap-2 lg:flex">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to"
          class="flex min-h-12 items-center border-2 px-3 font-black"
          :class="route.path === link.to ? 'border-[#09090B] bg-[#F59E0B] text-[#09090B] shadow-[4px_4px_0px_#09090B]' : 'border-(--border) bg-(--surface-bg) text-(--fg)'">
          {{ link.label }}
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/login" class="hidden min-h-12 items-center border-2 border-(--border) bg-(--surface-bg) px-4 font-black sm:flex">Entrar / Conta</NuxtLink>
        <button type="button" class="min-h-12 min-w-12 border-2 border-(--border) bg-[#F59E0B] px-3 font-black text-[#09090B]" :aria-label="`Tema atual: ${theme}`" @click="toggleTheme">
          {{ theme === "light" ? "CL" : theme === "dark" ? "EC" : "AA" }}
        </button>
        <button type="button" class="min-h-12 min-w-12 border-2 border-(--border) bg-(--surface-bg) px-3 text-xl font-black lg:hidden" :aria-expanded="menuOpen" aria-controls="mobile-menu" @click="menuOpen = !menuOpen">
          {{ menuOpen ? "X" : "☰" }}
        </button>
      </div>
    </nav>
    <div v-if="menuOpen" id="mobile-menu" class="fixed inset-x-0 top-18 bottom-0 overflow-y-auto border-t-2 border-(--border) bg-(--page-bg) p-4 lg:hidden">
      <div class="grid gap-3">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="flex min-h-14 items-center border-2 border-(--border) px-4 font-black" :class="route.path === link.to ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg) text-(--fg)'" @click="menuOpen = false">
          {{ link.label }}
        </NuxtLink>
        <NuxtLink to="/login" class="flex min-h-14 items-center border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="menuOpen = false">Entrar / Conta</NuxtLink>
      </div>
    </div>
  </header>
</template>
