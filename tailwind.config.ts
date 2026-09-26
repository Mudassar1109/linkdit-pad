import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// LinkDit Pad Design System
// Fluent + Apple inspired, glassmorphism, 14px radius, soft shadows.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))", // #2563EB
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))", // #06B6D4
          foreground: "hsl(var(--accent-foreground))",
        },
        accent2: {
          DEFAULT: "hsl(var(--accent2))", // #8B5CF6
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "hsl(var(--success))", // #10B981
        warning: "hsl(var(--warning))", // #F59E0B
        danger: "hsl(var(--danger))", // #EF4444
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
        },
        sidebar: "hsl(var(--sidebar))",
        toolbar: "hsl(var(--toolbar))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        "accent-hover": "hsl(var(--accent-hover))",
        "accent-active": "hsl(var(--accent-active))",
      },
      borderRadius: {
        lg: "14px", // LinkDit Pad standard radius
        md: "10px",
        sm: "6px",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "sans-serif"],
        editor: ["var(--font-editor)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        urdu: ["var(--font-urdu)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px -2px rgb(0 0 0 / 0.08)",
        panel: "0 8px 30px -8px rgb(0 0 0 / 0.15)",
        glow: "0 0 26px -8px hsl(var(--primary) / 0.55)",
        "glow-sm": "0 0 14px -4px hsl(var(--primary) / 0.5)",
        "glow-accent": "0 0 24px -8px hsl(var(--accent2) / 0.5)",
        "inset-card": "inset 0 1px 0 0 hsl(var(--border) / 0.4)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
