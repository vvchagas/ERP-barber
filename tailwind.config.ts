import type { Config } from "tailwindcss";

export default {
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.{vue,js,ts}",
    "./pages/**/*.{vue,js,ts}",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        white: "#FFFFFF",
        zinc: {
          50: "#F4F4F5",
          900: "#18181B",
          950: "#09090B",
        },
        amber: {
          brand: "#F59E0B",
        },
        orange: {
          brand: "#EA580C",
        },
      },
      boxShadow: {
        brutal: "4px 4px 0px #09090B",
        "brutal-lg": "8px 8px 0px #09090B",
      },
      borderRadius: {
        none: "0",
        brutal: "8px",
      },
      minHeight: {
        touch: "48px",
      },
      fontSize: {
        base: ["16px", "24px"],
      },
    },
  },
  plugins: [],
} satisfies Config;
