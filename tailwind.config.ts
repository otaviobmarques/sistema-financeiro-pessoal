import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        floresta: "#0B4F3A", sobbra: "#19C37D", menta: "#D7F5E6",
        ambar: "#FFB020", grafite: "#1F2A2E", coral: "#E5484D", noite: "#0E1A17",
      },
      fontFamily: { sans: ["Inter", "Verdana", "system-ui", "sans-serif"], marca: ["Poppins", "Inter", "sans-serif"] },
    },
  },
} satisfies Config;
