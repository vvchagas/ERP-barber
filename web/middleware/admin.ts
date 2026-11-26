export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch();
  const key = to.query.key;
  if (typeof key === "string") {
    if (import.meta.server) return;
    try {
      await requestFetch("/api/admin/unlock", {
        method: "POST",
        body: { magicKey: key },
      });
      const query = { ...to.query };
      delete query.key;
      return navigateTo({ path: to.path, query, replace: true });
    } catch {
      return navigateTo({ path: "/admin/login", query: { error: "access" } }, { replace: true });
    }
  }

  const { unlocked } = await requestFetch<{ unlocked: boolean }>("/api/admin/status");
  if (!unlocked) {
    return navigateTo("/admin/login", { replace: true });
  }
});
