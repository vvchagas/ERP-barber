export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    const cookie = useCookie("admin_session");
    if (!cookie.value) {
      return navigateTo("/admin/login");
    }
    return;
  }

  const { unlocked } = await $fetch<{ unlocked: boolean }>("/api/admin/status");
  if (!unlocked) {
    return navigateTo("/admin/login");
  }
});
