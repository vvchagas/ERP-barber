<script setup lang="ts">
type Theme = "light" | "dark" | "high-contrast";
const theme = ref<Theme>("light");
const seniorMode = ref(false);
const fontScale = ref(100);
const silentPreference = ref(false);
const favoriteBarber = ref("");
const barbers = ref<Array<{ id: string; name: string }>>([]);

function applyPreferences(): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "high-contrast");
  root.classList.add(theme.value);
  root.classList.toggle("senior-mode", seniorMode.value);
  root.style.fontSize = `${fontScale.value * (seniorMode.value ? 1.25 : 1)}%`;
  localStorage.setItem("navalha-theme", theme.value);
  localStorage.setItem("navalha-senior", String(seniorMode.value));
  localStorage.setItem("navalha-font-scale", String(fontScale.value));
  localStorage.setItem("navalha-silent", String(silentPreference.value));
  localStorage.setItem("navalha-favorite-barber", favoriteBarber.value);
}

onMounted(async () => {
  theme.value = (localStorage.getItem("navalha-theme") as Theme) || "light";
  seniorMode.value = localStorage.getItem("navalha-senior") === "true";
  fontScale.value = Number(localStorage.getItem("navalha-font-scale") || "100");
  silentPreference.value = localStorage.getItem("navalha-silent") === "true";
  favoriteBarber.value = localStorage.getItem("navalha-favorite-barber") || "";
  const response = await fetch("/api/barbers");
  barbers.value = await response.json() as Array<{ id: string; name: string }>;
  applyPreferences();
});
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-4xl font-black">Configurações e acessibilidade</h1>
      <div class="mt-6 grid gap-6 md:grid-cols-2">
        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Modo Idoso</h2>
          <p class="mt-2">Aumenta o texto em 25%, amplia controles e pausa animações automáticas.</p>
          <label class="mt-5 flex min-h-14 items-center gap-3 border-2 border-(--border) p-3 font-black">
            <input v-model="seniorMode" type="checkbox" class="h-7 w-7" @change="applyPreferences">
            Ativar Modo Idoso
          </label>
        </section>
        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Tamanho do texto</h2>
          <div class="mt-4 grid gap-3">
            <button v-for="size in [100, 115, 130]" :key="size" type="button" class="min-h-14 border-2 border-(--border) font-black" :class="fontScale === size ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="fontScale = size; applyPreferences">
              {{ size === 100 ? "Padrão 100%" : size === 115 ? "Grande 115%" : "Extra grande 130%" }}
            </button>
          </div>
        </section>
        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Tema</h2>
          <div class="mt-4 grid gap-3">
            <button v-for="option in ([['light','Claro'],['dark','Escuro'],['high-contrast','Ultra-contraste']] as [Theme,string][])" :key="option[0]" type="button" class="min-h-14 border-2 border-(--border) px-4 font-black" :class="theme === option[0] ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="theme = option[0]; applyPreferences">
              {{ option[1] }}
            </button>
          </div>
        </section>
        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Preferências de atendimento</h2>
          <label class="mt-4 flex min-h-14 items-center gap-3 border-2 border-(--border) p-3 font-bold">
            <input v-model="silentPreference" type="checkbox" class="h-6 w-6" @change="applyPreferences">
            Prefiro corte em silêncio
          </label>
          <label class="mt-4 block font-black">Barbeiro favorito
            <select v-model="favoriteBarber" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3" @change="applyPreferences">
              <option value="">Sem preferência</option>
              <option v-for="barber in barbers" :key="barber.id" :value="barber.id">{{ barber.name }}</option>
            </select>
          </label>
        </section>
      </div>
      <p role="status" class="mt-6 border-2 border-(--border) bg-[#F59E0B] p-4 font-black text-[#09090B]">Preferências salvas neste aparelho.</p>
    </div>
  </main>
</template>
