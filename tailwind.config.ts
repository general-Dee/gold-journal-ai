import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D10",
        surface: "#14171C",
        raised: "#1B1F26",
        line: "#262B33",
        ink: "#E8E6E1",
        muted: "#8B8F98",
        faint: "#5A5F68",
        gold: {
          DEFAULT: "#C9A227",
          bright: "#E4C455",
          dim: "#8A711E"
        },
        profit: "#3FB27F",
        loss: "#D6524A",
        warn: "#D6A93E"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"]
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)"
      },
      backgroundImage: {
        "gold-fade": "linear-gradient(90deg, rgba(201,162,39,0) 0%, rgba(201,162,39,0.55) 50%, rgba(201,162,39,0) 100%)"
      }
    }
  },
  plugins: []
};

export default config;
