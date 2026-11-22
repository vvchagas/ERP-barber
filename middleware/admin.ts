export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    const cookie = useCookie("admin_session");
    if (!cookie.value) {
      throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
    }
    return;
  }

  const { unlocked } = await $fetch<{ unlocked: boolean }>("/api/admin/status");
  if (!unlocked) {
    throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
  }
});
