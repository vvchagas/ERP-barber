<script setup lang="ts">
type Theme = "light" | "dark" | "high-contrast";
const route = useRoute();
const menuOpen = ref(false);
const theme = ref<Theme>("light");
const { customer, refresh, logout } = useCustomerAuth();
const firstName = computed(() => customer.value?.name.split(/\s+/)[0] ?? "");
const hasVip = computed(() => (customer.value?.subscriptions.length ?? 0) > 0);
const initials = computed(() => customer.value?.name
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join("") ?? "");

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
  void refresh();
});

async function signOut(): Promise<void> {
  await logout();
  await navigateTo("/");
}

onBeforeUnmount(() => { document.body.style.overflow = ""; });
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50 border-b-2 border-[#09090B] bg-(--surface-bg) text-(--fg)">
    <nav class="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Navegação principal">
      <NuxtLink to="/" class="flex h-11 items-center" aria-label="NAVALHA & CORTE - Início">
        <img src="/logo-navalha-corte.svg" alt="NAVALHA & CORTE" class="h-11 w-auto">
      </NuxtLink>
      <div class="hidden items-center gap-2 lg:flex">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to"
          class="flex min-h-12 items-center border-2 px-3 font-black"
          :class="route.path === link.to ? 'border-[#09090B] bg-[#F59E0B] text-[#09090B] shadow-[4px_4px_0px_#09090B]' : 'border-(--border) bg-(--surface-bg) text-(--fg)'">
          {{ link.label }}
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink v-if="customer" to="/configuracoes" class="hidden min-h-12 items-center gap-2 border-2 border-(--border) bg-(--surface-bg) px-3 font-black sm:flex">
          <img v-if="customer.avatarUrl" :src="customer.avatarUrl" alt="" class="h-9 w-9 border-2 border-(--border) object-cover">
          <span v-else class="grid h-9 w-9 place-items-center border-2 border-(--border) bg-[#F59E0B] text-[#09090B]">{{ initials }}</span>
          <span>{{ firstName }}</span>
          <span v-if="hasVip" class="border-2 border-[#09090B] bg-[#16A34A] px-2 py-1 text-xs text-white">VIP</span>
        </NuxtLink>
        <button v-if="customer" type="button" class="hidden min-h-12 border-2 border-(--border) bg-(--surface-bg) px-3 font-black sm:block" @click="signOut">Sair</button>
        <NuxtLink v-else to="/login" class="hidden min-h-12 items-center border-2 border-(--border) bg-(--surface-bg) px-4 font-black sm:flex">Entrar / Criar Conta</NuxtLink>
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
        <NuxtLink v-if="customer" to="/configuracoes" class="flex min-h-14 items-center gap-3 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="menuOpen = false">
          <span class="grid h-10 w-10 place-items-center border-2 border-(--border) bg-[#F59E0B] text-[#09090B]">{{ initials }}</span>
          {{ firstName }}
          <span v-if="hasVip" class="ml-auto border-2 border-[#09090B] bg-[#16A34A] px-2 py-1 text-xs text-white">VIP</span>
        </NuxtLink>
        <button v-if="customer" type="button" class="min-h-14 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="signOut">Sair</button>
        <NuxtLink v-else to="/login" class="flex min-h-14 items-center border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="menuOpen = false">Entrar / Criar Conta</NuxtLink>
      </div>
    </div>
  </header>
</template>
