import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          950: "#0a0c10",
          900: "#0e1117",
          800: "#151922",
          700: "#1d2430",
          600: "#2a3342",
        },
        signal: {
          for: "#22c55e",
          against: "#f43f5e",
          idle: "#64748b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
