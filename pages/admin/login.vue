<script setup lang="ts">
const username = ref("");
const password = ref("");
const magicKey = ref("");
const errorMessage = ref("");
const busy = ref(false);

async function login(): Promise<void> {
  busy.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/admin/login", {
      method: "POST",
      body: { username: username.value, password: password.value, magicKey: magicKey.value },
    });
    await navigateTo("/admin");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Falha no login.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[#18181B] px-4 pt-32 sm:pt-18">
    <form class="w-full max-w-md border-2 border-[#09090B] bg-white p-6 shadow-[8px_8px_0px_#F59E0B]" @submit.prevent="login">
      <h1 class="text-3xl font-black">ACESSO ADMINISTRATIVO</h1>
      <label class="mt-6 block font-black">USUÁRIO
        <input v-model="username" type="text" autocomplete="username" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
      </label>
      <label class="mt-4 block font-black">SENHA
        <input v-model="password" type="password" autocomplete="current-password" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
      </label>
      <label class="mt-4 block font-black">MAGIC KEY
        <input v-model="magicKey" type="password" autocomplete="off" class="mt-2 min-h-12 w-full border-2 border-[#09090B] px-3">
      </label>
      <p v-if="errorMessage" role="alert" class="mt-4 border-2 border-[#09090B] bg-[#EA580C] p-3 font-black text-white">{{ errorMessage }}</p>
      <button type="submit" class="mt-6 min-h-12 w-full border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black shadow-[4px_4px_0px_#09090B]" :disabled="busy">
        {{ busy ? "ENTRANDO..." : "ENTRAR" }}
      </button>
    </form>
  </main>
</template>
