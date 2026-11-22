export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", (error, context) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Nitro request error", context.event?.path || "unknown");
      return;
    }
    console.error("Request failed", context.event?.path || "unknown", error.name);
  });
});
