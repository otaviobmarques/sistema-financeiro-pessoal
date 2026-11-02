import type { Config } from "tailwindcss";
// Design System "Sobbra Respiro" (v1.0, nov/2026). Os nomes antigos das classes apontam para os tokens novos:
// floresta/sobbra = forest (acao e valores), menta = sage, ambar = butter, coral = terracotta, grafite = ink.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        forest: "#123E32", paper: "#F5F2E9", ink: "#1B2822", muted: "#53655B", butter: "#F0D875", terracotta: "#A54632", sage: "#DFE8D6", focus: "#245CCD",
        floresta: "#123E32", sobbra: "#1F6B4F", menta: "#DFE8D6", ambar: "#F0D875", coral: "#A54632", grafite: "#1B2822", noite: "#0F1F1A",
      },
      fontFamily: { sans: ["Arimo", "Liberation Sans", "Arial", "sans-serif"], serif: ["Tinos", "Liberation Serif", "Georgia", "serif"], marca: ["Arimo", "Liberation Sans", "Arial", "sans-serif"] },
      borderRadius: { xl: "16px", "2xl": "24px" },
    },
  },
} satisfies Config;
