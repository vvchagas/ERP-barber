<script setup lang="ts">
const mode = ref<"login" | "create" | "admin">("login");
const showPassword = ref(false);
const busy = ref(false);
const message = ref("");
const form = reactive({ name: "", email: "", phone: "", password: "", magicKey: "" });
const config = useRuntimeConfig();
const { refreshSession } = useCustomerAuth();
const route = useRoute();
const lgpdConsent = ref(false);

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
      if (!lgpdConsent.value) {
        message.value = "Marque o consentimento da Política de Privacidade para criar sua conta.";
        return;
      }
      await $fetch("/api/customer/register", {
        method: "POST",
        body: { name: form.name, email: form.email, phone: form.phone, password: form.password, lgpdConsent: lgpdConsent.value },
      });
      message.value = "Conta criada com sucesso.";
      await refreshSession();
      await navigateTo(safeRedirect());
    } else {
      await $fetch("/api/customer/login", { method: "POST", body: { email: form.email, password: form.password } });
      message.value = "Login realizado com sucesso.";
      await refreshSession();
      await navigateTo(safeRedirect());
    }

  } catch (error: unknown) {
    message.value = error instanceof Error ? error.message : "Não foi possível concluir.";
  } finally {
    busy.value = false;
  }
}

function safeRedirect(): string {
  const redirect = route.query.redirect;
  return typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : "/configuracoes";
}

function explainSocialSetup(provider: string): void {
  message.value = `O acesso com ${provider} precisa ser configurado no provedor de autenticação do servidor. Use seu e-mail e senha enquanto isso.`;
}
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-10 pt-24">
    <section class="mx-auto grid min-h-[620px] w-full max-w-6xl overflow-hidden border-2 border-(--border) bg-(--surface-bg) shadow-[8px_8px_0px_#09090B] lg:grid-cols-2">
      <aside class="relative flex min-h-80 flex-col justify-between overflow-hidden bg-[#09090B] p-7 text-white lg:p-10">
        <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=85" alt="" class="absolute inset-0 h-full w-full object-cover opacity-45">
        <div class="relative">
          <img src="/logo-navalha-corte.svg" alt="NAVALHA & CORTE" class="h-14 w-auto">
          <p class="mt-8 inline-block border-2 border-[#09090B] bg-[#F59E0B] px-3 py-2 font-black text-[#09090B]">TRADIÇÃO EM CADA DETALHE</p>
        </div>
        <div class="relative mt-8">
          <h1 class="max-w-md text-4xl font-black sm:text-5xl">Seu próximo corte começa aqui.</h1>
          <p class="mt-4 max-w-md text-lg font-bold">Agende seu horário, escolha seu barbeiro e acompanhe seus créditos do Clube VIP.</p>
          <ul class="mt-6 grid gap-2 font-black">
            <li class="border-2 border-white bg-[#09090B]/80 p-3">✓ Atendimento para todas as gerações</li>
            <li class="border-2 border-white bg-[#09090B]/80 p-3">✓ Planos com créditos mensais</li>
            <li class="border-2 border-white bg-[#09090B]/80 p-3">✓ Ritual clássico da toalha quente</li>
          </ul>
        </div>
      </aside>
      <div class="p-6 lg:p-10">
        <div class="mb-7 grid grid-cols-3 gap-2">
          <button type="button" class="min-h-14 border-2 border-[#09090B] px-2 font-black" :class="mode === 'login' ? 'bg-[#F59E0B]' : 'bg-(--surface-bg)'" @click="mode = 'login'">Entrar</button>
          <button type="button" class="min-h-14 border-2 border-[#09090B] px-2 font-black" :class="mode === 'create' ? 'bg-[#F59E0B]' : 'bg-(--surface-bg)'" @click="mode = 'create'">Criar conta</button>
          <button type="button" class="min-h-14 border-2 border-[#09090B] px-2 font-black" :class="mode === 'admin' ? 'bg-[#F59E0B]' : 'bg-(--surface-bg)'" @click="mode = 'admin'">Equipe</button>
        </div>
        <h2 class="text-3xl font-black">{{ mode === "login" ? "Entre na sua conta" : mode === "create" ? "Cadastre-se" : "Acesso administrativo" }}</h2>
        <Transition name="login-switch" mode="out-in">
        <form :key="mode" class="mt-5" @submit.prevent="submit">
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
        <label v-if="mode === 'create'" class="mt-5 flex items-start gap-3 font-bold">
          <input v-model="lgpdConsent" type="checkbox" required class="mt-1 h-6 w-6">
          <span>Li e aceito a <NuxtLink to="/privacidade" class="underline">Política de Privacidade</NuxtLink> para uso dos dados no cadastro e atendimento.</span>
        </label>
        <div v-if="mode !== 'admin'" class="mt-5 grid gap-3">
          <button v-if="config.public.googleClientId" type="button" class="min-h-14 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="explainSocialSetup('Google')">Continuar com Google</button>
          <button v-if="config.public.appleClientId" type="button" class="min-h-14 border-2 border-(--border) bg-(--surface-bg) px-4 font-black" @click="explainSocialSetup('Apple')">Continuar com Apple</button>
        </div>
        <p v-if="message" role="status" class="mt-5 border-2 border-(--border) p-3 font-bold">{{ message }}</p>
        <button type="submit" class="mt-6 min-h-14 w-full border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black shadow-[4px_4px_0px_#09090B]" :disabled="busy">
          {{ busy ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "create" ? "Criar conta" : "Acessar painel" }}
        </button>
        </form>
        </Transition>
        <p class="mt-5 text-center text-sm font-bold">Acesso da equipe protegido por MAGIC_KEY e senha administrativa.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-switch-enter-active,
.login-switch-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.login-switch-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.login-switch-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
@media (prefers-reduced-motion: reduce) {
  .login-switch-enter-active,
  .login-switch-leave-active {
    transition: none;
  }
}
</style>
