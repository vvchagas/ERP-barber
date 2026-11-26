export default defineNuxtPlugin((nuxtApp) => {
  const router = nuxtApp.$router;
  let routeLoaderId = 0;

  router.beforeEach((to) => {
    window.clearTimeout(routeLoaderId);
    if (to.path === "/login") {
      window.dispatchEvent(new CustomEvent("navalha:loading-hide"));
      return;
    }
    routeLoaderId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("navalha:loading-show"));
    }, 40);
  });

  router.afterEach((to) => {
    window.clearTimeout(routeLoaderId);
    window.dispatchEvent(new CustomEvent("navalha:loading-hide"));
    if (to.path === "/login") {
      window.dispatchEvent(new CustomEvent("navalha:loading-hide"));
    }
  });

  const nativeFetch = window.fetch.bind(window);
  let activeRequests = 0;
  let hasVisibleRequest = false;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const isLoginPage = router.currentRoute.value.path === "/login";
    activeRequests += 1;
    let slowTimer = 0;
    if (!isLoginPage) {
      slowTimer = window.setTimeout(() => {
        hasVisibleRequest = true;
        window.dispatchEvent(new CustomEvent("navalha:loading-show", { detail: { slow: true } }));
      }, 600);
    }
    try {
      const response = await nativeFetch(input, init);
      return response;
    } catch (error) {
      window.dispatchEvent(new CustomEvent("navalha:network-offline"));
      throw error;
    } finally {
      window.clearTimeout(slowTimer);
      activeRequests = Math.max(0, activeRequests - 1);
      if (activeRequests === 0 && hasVisibleRequest) {
        hasVisibleRequest = false;
        window.dispatchEvent(new CustomEvent("navalha:loading-hide"));
      }
    }
  }) as typeof window.fetch;
});
