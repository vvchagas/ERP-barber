<script setup lang="ts">
type Theme = "light" | "dark" | "high-contrast";
const { customer, refreshSession } = useCustomerAuth();
const theme = ref<Theme>("light");
const seniorMode = ref(false);
const fontScale = ref("100");
const silentCut = ref(false);
const favoriteBarber = ref("");
const barbers = ref<Array<{ id: string; name: string }>>([]);
const profile = reactive({ name: "", phone: "", email: "", currentPassword: "", newPassword: "" });
const avatarUrl = ref<string | null>(null);
const savingProfile = ref(false);
const savingPreferences = ref(false);
const uploadingAvatar = ref(false);
const errorMessage = ref("");
const statusMessage = ref("");
const confirmDelete = ref(false);

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

function applyPreferences(): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "high-contrast");
  root.classList.add(theme.value);
  root.classList.toggle("senior-mode", seniorMode.value);
  root.style.fontSize = `${Number(fontScale.value) * (seniorMode.value ? 1.25 : 1)}%`;
  localStorage.setItem("navalha-theme", theme.value);
  localStorage.setItem("navalha-senior", String(seniorMode.value));
  localStorage.setItem("navalha-font-scale", fontScale.value);
  localStorage.setItem("navalha-silent", String(silentCut.value));
  localStorage.setItem("navalha-favorite-barber", favoriteBarber.value);
}

async function savePreferences(): Promise<void> {
  applyPreferences();
  if (!customer.value) return;
  errorMessage.value = "";
  savingPreferences.value = true;
  try {
    await $fetch("/api/customer/me", {
      method: "PATCH",
      body: {
        silentCut: silentCut.value,
        favoriteBarberId: favoriteBarber.value || null,
        seniorMode: seniorMode.value,
        fontScale: fontScale.value,
        theme: theme.value,
      },
    });
    await refreshSession();
    statusMessage.value = "Preferências atualizadas.";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível salvar as preferências.";
  } finally {
    savingPreferences.value = false;
  }
}

async function saveProfile(): Promise<void> {
  errorMessage.value = "";
  statusMessage.value = "";
  savingProfile.value = true;
  try {
    await $fetch("/api/customer/me", {
      method: "PATCH",
      body: {
        name: profile.name,
        phone: profile.phone,
        email: profile.email || null,
        avatarUrl: avatarUrl.value,
        currentPassword: profile.currentPassword || undefined,
        newPassword: profile.newPassword || undefined,
      },
    });
    profile.currentPassword = "";
    profile.newPassword = "";
    await refreshSession();
    statusMessage.value = "Perfil salvo com sucesso.";
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível salvar o perfil.";
  } finally {
    savingProfile.value = false;
  }
}

async function compressAvatar(file: File): Promise<string> {
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 150;
  canvas.height = 150;
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("Não foi possível processar a imagem neste navegador.");
  }
  const cropSize = Math.min(image.width, image.height);
  context.drawImage(
    image,
    (image.width - cropSize) / 2,
    (image.height - cropSize) / 2,
    cropSize,
    cropSize,
    0,
    0,
    150,
    150,
  );
  image.close();

  let blob: Blob | null = null;
  for (let quality = 0.9; quality >= 0.35; quality -= 0.1) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob?.type === "image/webp" && blob.size <= 20 * 1024) break;
  }
  if (!blob || blob.type !== "image/webp" || blob.size > 20 * 1024) {
    throw new Error("Não foi possível comprimir a foto para WebP de até 20 KB.");
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Falha ao ler o avatar."));
    reader.onerror = () => reject(new Error("Falha ao ler o avatar."));
    reader.readAsDataURL(blob);
  });
}

async function selectAvatar(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    errorMessage.value = "Selecione um arquivo de imagem.";
    input.value = "";
    return;
  }
  uploadingAvatar.value = true;
  errorMessage.value = "";
  try {
    avatarUrl.value = await compressAvatar(file);
    await saveProfile();
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível atualizar a foto.";
  } finally {
    uploadingAvatar.value = false;
    input.value = "";
  }
}

async function deleteAccount(): Promise<void> {
  confirmDelete.value = false;
  errorMessage.value = "";
  try {
    await $fetch("/api/customer/me", { method: "DELETE" });
    await refreshSession();
    await navigateTo("/");
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível excluir a conta.";
  }
}

onMounted(async () => {
  await refreshSession();
  if (customer.value) {
    profile.name = customer.value.name;
    profile.phone = customer.value.phone;
    profile.email = customer.value.email ?? "";
    avatarUrl.value = customer.value.avatarUrl;
    theme.value = customer.value.theme as Theme;
    seniorMode.value = customer.value.seniorMode;
    fontScale.value = customer.value.fontScale;
    silentCut.value = customer.value.silentCut;
    favoriteBarber.value = customer.value.favoriteBarberId ?? "";
  } else {
    theme.value = (localStorage.getItem("navalha-theme") as Theme) || "light";
    seniorMode.value = localStorage.getItem("navalha-senior") === "true";
    fontScale.value = localStorage.getItem("navalha-font-scale") || "100";
    silentCut.value = localStorage.getItem("navalha-silent") === "true";
    favoriteBarber.value = localStorage.getItem("navalha-favorite-barber") || "";
  }
  applyPreferences();
  try {
    const response = await fetch("/api/barbers");
    if (!response.ok) throw new Error("Não foi possível carregar os barbeiros.");
    barbers.value = await response.json() as Array<{ id: string; name: string }>;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível carregar os barbeiros.";
  }
});
</script>

<template>
  <main class="min-h-screen bg-(--muted-bg) px-4 pb-12 pt-24">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-4xl font-black">Minha conta e acessibilidade</h1>
      <p v-if="!customer" class="mt-4 border-2 border-(--border) bg-(--surface-bg) p-4 font-bold">Entre para editar seu perfil e sincronizar preferências. As opções de acessibilidade ainda podem ser usadas neste aparelho.</p>
      <div class="mt-6 grid gap-6">
        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Meu perfil</h2>
          <div class="mt-5 flex flex-wrap items-center gap-5">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Foto do perfil" class="h-24 w-24 border-2 border-(--border) object-cover">
            <span v-else class="grid h-24 w-24 place-items-center border-2 border-(--border) bg-[#F59E0B] text-3xl font-black text-[#09090B]">{{ initials(profile.name || customer?.name || "NC") }}</span>
            <label class="inline-flex min-h-14 cursor-pointer items-center border-2 border-[#09090B] bg-[#F59E0B] px-4 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]">
              {{ uploadingAvatar ? "Processando foto..." : "Enviar foto de perfil" }}
              <input type="file" accept="image/*" class="sr-only" :disabled="uploadingAvatar || !customer" @change="selectAvatar">
            </label>
            <p class="max-w-sm text-sm font-bold">A foto é recortada em 150 × 150 px, convertida para WebP e comprimida para até 20 KB.</p>
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label class="font-black">Nome completo<input v-model="profile.name" autocomplete="name" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3" :disabled="!customer"></label>
            <label class="font-black">Telefone<input v-model="profile.phone" autocomplete="tel" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3" :disabled="!customer"></label>
            <label class="font-black md:col-span-2">E-mail<input v-model="profile.email" type="email" autocomplete="email" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3" :disabled="!customer"></label>
            <label class="font-black">Senha atual<input v-model="profile.currentPassword" type="password" autocomplete="current-password" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3" :disabled="!customer"></label>
            <label class="font-black">Nova senha<input v-model="profile.newPassword" type="password" autocomplete="new-password" minlength="8" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3" :disabled="!customer"></label>
          </div>
          <button type="button" class="mt-5 min-h-14 border-2 border-[#09090B] bg-[#F59E0B] px-5 font-black text-[#09090B] shadow-[4px_4px_0px_#09090B]" :disabled="savingProfile || !customer" @click="saveProfile">{{ savingProfile ? "Salvando..." : "Salvar perfil" }}</button>
        </section>

        <section class="border-2 border-(--border) bg-(--surface-bg) p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Acessibilidade e temas</h2>
          <label class="mt-4 flex min-h-14 items-center gap-3 border-2 border-(--border) p-3 font-black">
            <input v-model="seniorMode" type="checkbox" class="h-7 w-7" @change="savePreferences">
            Ativar Modo Idoso: texto ampliado em 25%, controles de 60 px e menos movimento
          </label>
          <div class="mt-5 grid gap-5 md:grid-cols-2">
            <fieldset>
              <legend class="font-black">Tamanho da fonte</legend>
              <div class="mt-3 grid gap-2">
                <button v-for="size in ['100','115','130']" :key="size" type="button" class="min-h-14 border-2 border-(--border) px-3 font-black" :class="fontScale === size ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="fontScale = size; savePreferences">{{ size }}%</button>
              </div>
            </fieldset>
            <fieldset>
              <legend class="font-black">Tema</legend>
              <div class="mt-3 grid gap-2">
                <button v-for="item in ([['light','Claro'],['dark','Escuro'],['high-contrast','Ultra-contraste']] as [Theme,string][])" :key="item[0]" type="button" class="min-h-14 border-2 border-(--border) px-3 font-black" :class="theme === item[0] ? 'bg-[#F59E0B] text-[#09090B]' : 'bg-(--surface-bg)'" @click="theme = item[0]; savePreferences">{{ item[1] }}</button>
              </div>
            </fieldset>
          </div>
          <label class="mt-5 flex min-h-14 items-center gap-3 border-2 border-(--border) p-3 font-bold">
            <input v-model="silentCut" type="checkbox" class="h-6 w-6" @change="savePreferences"> Prefiro corte em silêncio
          </label>
          <label class="mt-4 block font-black">Barbeiro favorito
            <select v-model="favoriteBarber" class="mt-2 min-h-14 w-full border-2 border-(--border) bg-(--surface-bg) px-3" @change="savePreferences">
              <option value="">Sem preferência</option>
              <option v-for="barber in barbers" :key="barber.id" :value="barber.id">{{ barber.name }}</option>
            </select>
          </label>
          <p role="status" class="mt-4 border-2 border-(--border) bg-[#16A34A] p-3 font-black text-white">{{ savingPreferences ? "Salvando preferências..." : "Preferências salvas neste aparelho e no perfil quando conectado." }}</p>
        </section>

        <section class="border-2 border-[#09090B] bg-[#FFFFFF] p-5 shadow-[8px_8px_0px_#09090B]">
          <h2 class="text-2xl font-black">Privacidade e LGPD</h2>
          <p class="mt-2">Você pode solicitar a anonimização irreversível dos dados pessoais da sua conta.</p>
          <button type="button" class="mt-5 min-h-14 border-2 border-[#09090B] bg-[#DC2626] px-5 font-black text-white shadow-[4px_4px_0px_#09090B] disabled:opacity-50" :disabled="!customer" @click="confirmDelete = true">Excluir Minha Conta e Anonimizar Meus Dados</button>
        </section>
      </div>
      <p v-if="errorMessage" role="alert" class="mt-5 border-2 border-[#09090B] bg-[#DC2626] p-4 font-black text-white">{{ errorMessage }}</p>
      <p v-if="statusMessage" role="status" class="mt-5 border-2 border-[#09090B] bg-[#16A34A] p-4 font-black text-white">{{ statusMessage }}</p>
    </div>
    <ConfirmModal
      :open="confirmDelete"
      title="confirm-delete-title"
      description="Esta ação é irreversível. Seus dados pessoais serão anonimizados e as observações pessoais dos agendamentos serão removidas."
      confirm-label="Excluir e anonimizar"
      @cancel="confirmDelete = false"
      @confirm="deleteAccount"
    />
  </main>
</template>
