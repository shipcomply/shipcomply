import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "#13131c",
          1: "#1a1a26",
          2: "#22222f",
          3: "#2a2a38",
          4: "#333343",
          5: "#404052",
          6: "#4d4d62",
          7: "#62627a",
          8: "#84849c",
          9: "#a8a8c0",
          10: "#cccce0",
          11: "#f0f0fa",
        },
        mint: {
          3: "#0a2e1f",
          5: "#104d33",
          7: "#2d9e6e",
          9: "#63ffb5",
          11: "#b8ffdf",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        "glow-sm": "0 0 12px rgba(99, 255, 181, 0.12)",
        "glow-md": "0 0 24px rgba(99, 255, 181, 0.18)",
        "glow-lg": "0 0 48px rgba(99, 255, 181, 0.24)",
      },
      transitionTimingFunction: {
        "out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "400ms",
      },
      animation: {
        "fade-in": "fadeIn 250ms cubic-bezier(0.33, 1, 0.68, 1) forwards",
        "slide-up": "slideUp 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "count-up": "countUp 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        countUp: { from: { transform: "scale(0.8)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
