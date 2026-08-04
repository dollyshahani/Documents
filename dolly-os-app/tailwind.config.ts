import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // calm, no-guilt palette
        ink: "#1c1917",
        paper: "#faf9f7",
        moss: "#3f6212",
        mossbg: "#ecfccb",
        stone: "#a8a29e",
      },
    },
  },
  plugins: [],
};
export default config;
