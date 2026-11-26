<script setup lang="ts">
withDefaults(defineProps<{
  variant?: "card" | "list-item" | "slot-grid";
  count?: number;
}>(), {
  variant: "card",
  count: 1,
});
</script>

<template>
  <div
    class="grid gap-4"
    :class="variant === 'slot-grid' ? 'grid-cols-3 sm:grid-cols-6' : variant === 'card' ? 'sm:grid-cols-2' : 'grid-cols-1'"
    aria-hidden="true"
  >
    <div
      v-for="item in count"
      :key="item"
      class="animate-pulse border-2 border-[#09090B] bg-zinc-200 p-4 shadow-[4px_4px_0px_#09090B] dark:border-[#F59E0B] dark:bg-zinc-800"
      :class="variant === 'slot-grid' ? 'min-h-12' : variant === 'list-item' ? 'min-h-24' : 'min-h-36'"
    >
      <template v-if="variant === 'card'">
        <div class="h-5 w-2/3 bg-zinc-300 dark:bg-zinc-700" />
        <div class="mt-4 h-4 w-full bg-zinc-300 dark:bg-zinc-700" />
        <div class="mt-2 h-4 w-4/5 bg-zinc-300 dark:bg-zinc-700" />
        <div class="mt-5 h-7 w-1/3 bg-zinc-300 dark:bg-zinc-700" />
      </template>
      <div v-else-if="variant === 'list-item'" class="flex items-center gap-4">
        <div class="h-16 w-16 shrink-0 bg-zinc-300 dark:bg-zinc-700" />
        <div class="flex-1">
          <div class="h-5 w-2/3 bg-zinc-300 dark:bg-zinc-700" />
          <div class="mt-3 h-4 w-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  </div>
</template>
