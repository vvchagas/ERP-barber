export default defineNuxtPlugin((nuxtApp) => {
  const loader = useSmartLoader();
  const router = nuxtApp.$router;
  let taskSequence = 0;
  let routeTaskId: string | null = null;

  const updateConnection = () => loader.setSlowConnection(isSlowConnection());
  updateConnection();

  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  connection?.addEventListener("change", updateConnection);

  const finishRouteTask = () => {
    if (!routeTaskId) return;
    loader.finish(routeTaskId);
    routeTaskId = null;
  };

  router.beforeEach((to) => {
    if (routeTaskId) loader.finish(routeTaskId);
    routeTaskId = null;
    if (to.path === "/login" || to.path.startsWith("/login/")) return;
    routeTaskId = `route-${++taskSequence}`;
    loader.begin(routeTaskId, 350);
  });

  router.afterEach(finishRouteTask);

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    let taskId: string | null = null;
    const currentPath = router.currentRoute.value.path;
    const isLoginPage = currentPath === "/login" || currentPath.startsWith("/login/");

    try {
      const requestUrl = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
      const url = new URL(requestUrl, window.location.href);
      if (!isLoginPage && url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
        taskId = `request-${++taskSequence}`;
        loader.begin(taskId, 400);
      }

      const response = await nativeFetch(input, init);
      return response;
    } catch (error) {
      window.dispatchEvent(new CustomEvent("navalha:network-offline"));
      throw error;
    } finally {
      if (taskId) loader.finish(taskId);
    }
  }) as typeof globalThis.fetch;

});
