export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch();
  const { unlocked } = await requestFetch<{ unlocked: boolean }>("/api/admin/status");
  if (!unlocked) {
    return navigateTo("/admin/login", { replace: true });
  }
});
