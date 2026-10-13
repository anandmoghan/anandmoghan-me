import type { Config } from "tailwindcss";

// Colours point at CSS variables so utility classes follow the shared tokens
// (public/global/styles/tokens.css) and the light/dark theme.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./common/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--fg)",
        surface: "var(--surface)",
        subtle: "var(--subtle)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--fg)",
        },
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--bg)",
        },
        warn: "var(--warn)",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--bg)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--bg)",
        },
      },
      fontFamily: {
        sans: ['var(--font-ui)'],
        serif: ['var(--font-prose)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        float: "var(--shadow-float)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
      },
    },
  },
  plugins: [],
};

export default config;
