<script setup lang="ts">
const mode = ref<"login" | "create" | "admin">("login");
const showPassword = ref(false);
const busy = ref(false);
const message = ref("");
const form = reactive({ name: "", email: "", phone: "", password: "", magicKey: "" });
const config = useRuntimeConfig();

async function submit(): Promise<void> {
  busy.value = true;
  message.value = "";
  try {
    if (mode.value === "admin") {
      await $fetch("/api/admin/login", { method: "POST", body: { magicKey: form.magicKey, username: form.email, password: form.password } });
      await navigateTo("/admin");
      return;
    }
    if (mode.value === "create") {
      await $fetch("/api/customer/register", {
        method: "POST",
        body: { name: form.name, email: form.email, phone: form.phone, password: form.password, lgpdConsent: true },
      });
      message.value = "Conta criada com sucesso.";
    } else {
      await $fetch("/api/customer/login", { method: "POST", body: { email: form.email, password: form.password } });
      message.value = "Login realizado com sucesso.";
    }
  } catch (error: unknown) {
    message.value = error instanceof Error ? error.message : "Não foi possível concluir.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-(--muted-bg) px-4 pb-10 pt-24">
    <section class="grid w-full max-w-5xl overflow-hidden border-2 border-(--border) bg-(--surface-bg) shadow-[8px_8px_0px_#09090B] lg:grid-cols-2">
      <div class="bg-[#F59E0B] p-6 text-[#09090B] lg:p-10">
        <h1 class="text-4xl font-black">{{ mode === "login" ? "Bem-vindo de volta" : mode === "create" ? "Crie sua conta" : "Acesso da equipe" }}</h1>
        <p class="mt-4 font-bold">Agende mais rápido, guarde preferências e acompanhe seus créditos VIP.</p>
        <div class="mt-8 grid grid-cols-3 gap-2">
          <button type="button" class="min-h-14 border-2 border-[#09090B] px-2 font-black" :class="mode === 'login' ? 'bg-[#09090B] text-white' : 'bg-white'" @click="mode = 'login'">Entrar</button>
          <button type="button" class="min-h-14 border-2 border-[#09090B] px-2 font-black" :class="mode === 'create' ? 'bg-[#09090B] text-white' : 'bg-white'" @click="mode = 'create'">Cadastrar</button>
          <button type="button" class="min-h-14 border-2 border-[#09090B] px-2 font-black" :class="mode === 'admin' ? 'bg-[#09090B] text-white' : 'bg-white'" @click="mode = 'admin'">Equipe</button>
        </div>
      </div>
      <form class="p-6 lg:p-10" @submit.prevent="submit">
        <label v-if="mode === 'create'" class="block font-black">Nome completo
          <input v-model="form.name" required autocomplete="name" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3">
        </label>
        <label class="mt-4 block font-black">{{ mode === "admin" ? "Usuário" : "E-mail" }}
          <input v-model="form.email" :type="mode === 'admin' ? 'text' : 'email'" required autocomplete="username" class="mt-2 min-h-14 w-full border-2 border-(--border)">
        </label>
        <label v-if="mode === 'create'" class="mt-4 block font-black">Telefone / WhatsApp
          <input v-model="form.phone" required type="tel" autocomplete="tel" class="mt-2 min-h-14 w-full border-2 border-(--border) px-3">
        </label>
        <label v-if="mode !== 'admin'" class="mt-4 block font-black">Senha
          <span class="mt-2 flex">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" required autocomplete="current-password" class="min-h-14 w-full border-2 border-r-0 border-(--border)">
            <button type="button" class="min-h-14 border-2 border-(--border) px-3 font-black" @click="showPassword = !showPassword">{{ showPassword ? "Ocultar" : "Ver" }}</button>
          </span>
        </label>
        <label v-if="mode === 'admin'" class="mt-4 block font-black">MAGIC KEY
          <input v-model="form.magicKey" type="password" required class="mt-2 min-h-14 w-full border-2 border-(--border) px-3">
        </label>
        <label v-if="mode === 'admin'" class="mt-4 block font-black">Senha
          <input v-model="form.password" type="password" required class="mt-2 min-h-14 w-full border-2 border-(--border) px-3">
        </label>
        <div v-if="mode !== 'admin'" class="mt-5 grid gap-3">
          <button v-if="config.public.googleClientId" type="button" class="min-h-14 border-2 border-(--border) bg-(--surface-bg) px-4 font-black">Continuar com Google</button>
          <button v-if="config.public.appleClientId" type="button" class="min-h-14 border-2 border-(--border) bg-(--surface-bg) px-4 font-black">Continuar com Apple</button>
        </div>
        <p v-if="message" role="status" class="mt-5 border-2 border-(--border) p-3 font-bold">{{ message }}</p>
        <button type="submit" class="mt-6 min-h-14 w-full border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black shadow-[4px_4px_0px_#09090B]" :disabled="busy">
          {{ busy ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "create" ? "Criar conta" : "Acessar painel" }}
        </button>
      </form>
    </section>
  </main>
</template>
