export default defineNuxtPlugin(() => {
  const notifyOffline = () => window.dispatchEvent(new CustomEvent("navalha:network-offline"));
  const notifyOnline = () => window.dispatchEvent(new CustomEvent("navalha:network-online"));
  window.addEventListener("offline", notifyOffline);
  window.addEventListener("online", notifyOnline);
});
