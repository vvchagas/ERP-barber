<script setup lang="ts">
const { visible, slowConnection } = useSmartLoader();
</script>

<template>
  <Transition name="smart-loader">
    <div
      v-if="visible"
      class="fixed inset-0 z-[100] grid place-items-center bg-[blur(10px)] p-4 text-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="w-full max-w-xl border-2  bg-white p-3 text-center text-[#09090B] shadow-[8px_8px_0px_#F59E0B] sm:p-5">
        <img
          src="/loading-tesoura.gif"
          alt="Carregando..."
          class="mx-auto max-h-[55vh] w-full border-2 object-contain"
          width="1366"
          height="768"
          decoding="async"
        >
        <p v-if="slowConnection" class="mt-4 inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-2 text-sm font-black text-[#09090B]">
          CONEXÃO LENTA • CARREGANDO RECURSOS
        </p>
        <p v-else class="mt-4 font-black">Carregando…</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.smart-loader-enter-active,
.smart-loader-leave-active {
  transition: opacity 120ms ease;
}

.smart-loader-enter-from,
.smart-loader-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .smart-loader-enter-active,
  .smart-loader-leave-active {
    transition: none;
  }
}
</style>
