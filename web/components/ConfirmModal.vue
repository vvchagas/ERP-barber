<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 grid place-items-center bg-[#09090B]/80 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="title"
  >
    <section class="w-full max-w-md border-2 border-[#09090B] bg-white p-6 shadow-[8px_8px_0px_#09090B]">
      <h2 :id="title" class="text-2xl font-black">{{ title }}</h2>
      <p class="mt-3 text-base">{{ description }}</p>
      <div class="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          class="min-h-12 border-2 border-[#09090B] bg-[#F4F4F5] px-5 font-bold shadow-[4px_4px_0px_#09090B]"
          @click="$emit('cancel')"
        >
          {{ cancelLabel || "Cancelar" }}
        </button>
        <button
          type="button"
          class="min-h-12 border-2 border-[#09090B] bg-[#F59E0B] px-5 font-bold shadow-[4px_4px_0px_#09090B]"
          @click="$emit('confirm')"
        >
          {{ confirmLabel || "Confirmar" }}
        </button>
      </div>
    </section>
  </div>
</template>
