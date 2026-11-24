import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["@/assets/css/main.css"],
  future: { compatibilityVersion: 4 },

  modules: [
    "@nuxt/a11y",
    "@nuxt/fonts",
    "@vueuse/motion/nuxt",
    "@nuxtjs/robots",
    "@nuxtjs/sitemap",
  ],

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000",
      barberShopName: "NAVALHA & CORTE",
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      appleClientId: process.env.APPLE_CLIENT_ID || "",
    },
  },

  app: {
    head: {
      title: "NAVALHA & CORTE",
      titleTemplate: "%s | NAVALHA & CORTE",
      htmlAttrs: { lang: "pt-BR" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#F59E0B" },
        { name: "description", content: "Agendamento e gestão da barbearia NAVALHA & CORTE." },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/logo-navalha-corte.svg" }],
    },
  },

  nitro: {
    externals: {
      inline: ["@prisma/client-runtime-utils", "@prisma/adapter-pg", "postgres-array", "pg"],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000",
    name: "NAVALHA & CORTE",
  },

  robots: {
    groups: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
  },

  routeRules: {
    "/admin/**": { robots: false },
  },
});
