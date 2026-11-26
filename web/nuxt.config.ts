import tailwindcss from "@tailwindcss/vite";

const configuredSiteUrl = process.env.NUXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
const siteUrl = new URL(configuredSiteUrl).hostname === "localhost"
  ? "http://127.0.0.1:3000"
  : configuredSiteUrl;
if (siteUrl !== configuredSiteUrl) process.env.NUXT_PUBLIC_SITE_URL = siteUrl;

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
    typeCheck: false,
  },

  runtimeConfig: {
    public: {
      siteUrl,
      barberShopName: "NAVALHA & CORTE",
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      appleClientId: process.env.APPLE_CLIENT_ID || "",
      pixKey: process.env.NUXT_PUBLIC_PIX_KEY || "",
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
    build: {
      chunkSizeWarningLimit: 510,
    },
  },

  site: {
    url: siteUrl,
    name: "NAVALHA & CORTE",
  },

  robots: {
    groups: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
  },

  routeRules: {
    "/admin/**": { robots: false },
    "/caixa": { redirect: { to: "/admin?tab=caixa", statusCode: 302 } },
  },
});
