import type { Config } from "tailwindcss";

// Colours point at CSS variables so utility classes follow the shared tokens
// (public/global/styles/tokens.css) and the light/dark theme.
// Wraps a CSS variable so opacity modifiers (bg-background/80, hover:bg-muted/20)
// work; Tailwind 3 cannot apply them to a bare var().
const withAlpha = (variable: string) =>
  `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./common/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: withAlpha("--bg"),
        foreground: withAlpha("--fg"),
        surface: withAlpha("--surface"),
        subtle: withAlpha("--subtle"),
        muted: {
          DEFAULT: withAlpha("--muted"),
          foreground: withAlpha("--fg"),
        },
        border: withAlpha("--border"),
        accent: {
          DEFAULT: withAlpha("--accent"),
          foreground: withAlpha("--bg"),
        },
        warn: withAlpha("--warn"),
        destructive: {
          DEFAULT: withAlpha("--destructive"),
          foreground: withAlpha("--bg"),
        },
        success: {
          DEFAULT: withAlpha("--success"),
          foreground: withAlpha("--bg"),
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
        // One slight radius for every card-like surface (global tokens.css).
        md: "var(--radius)",
        lg: "var(--radius)",
        xl: "var(--radius-card)",
        "2xl": "var(--radius-card)",
        "3xl": "var(--radius-card)",
      },
    },
  },
  plugins: [],
};

export default config;
