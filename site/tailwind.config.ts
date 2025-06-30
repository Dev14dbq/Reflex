import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      height: {
        viewportStable: "var(--tg-viewport-stable-height)",
        viewport: "var(--tg-viewport-height)",
      },
      colors: {
        // Telegram theme colors
        background: "var(--tg-theme-bg-color)",
        text: "var(--tg-theme-text-color)",
        hint: "var(--tg-theme-hint-color)",
        link: "var(--tg-theme-link-color)",
        button: "var(--tg-theme-button-color)",
        buttonText: "var(--tg-theme-button-text-color)",
        secondaryBg: "var(--tg-theme-secondary-bg-color)",
        
        // Neumorphism colors
        neu: {
          bg: {
            primary: "var(--neu-bg-primary)",
            secondary: "var(--neu-bg-secondary)",
            tertiary: "var(--neu-bg-tertiary)",
          },
          text: {
            primary: "var(--neu-text-primary)",
            secondary: "var(--neu-text-secondary)",
            muted: "var(--neu-text-muted)",
          },
          accent: {
            primary: "var(--neu-accent-primary)",
            secondary: "var(--neu-accent-secondary)",
          },
          success: "var(--neu-success)",
          warning: "var(--neu-warning)",
          danger: "var(--neu-danger)",
        },
      },
      spacing: {
        'neu-xs': 'var(--neu-space-xs)',
        'neu-sm': 'var(--neu-space-sm)',
        'neu-md': 'var(--neu-space-md)',
        'neu-lg': 'var(--neu-space-lg)',
        'neu-xl': 'var(--neu-space-xl)',
        'neu-2xl': 'var(--neu-space-2xl)',
      },
      borderRadius: {
        'neu-sm': 'var(--neu-radius-sm)',
        'neu-md': 'var(--neu-radius-md)',
        'neu-lg': 'var(--neu-radius-lg)',
        'neu-xl': 'var(--neu-radius-xl)',
        'neu-full': 'var(--neu-radius-full)',
      },
      boxShadow: {
        'neu-inset': 'var(--neu-shadow-inset)',
        'neu-outset': 'var(--neu-shadow-outset)',
        'neu-pressed': 'var(--neu-shadow-pressed)',
        'neu-hover': 'var(--neu-shadow-hover)',
        'neu-subtle': 'var(--neu-shadow-subtle)',
      },
      opacity: {
        15: "0.15",
      },
      backdropBlur: {
        'neu': '20px',
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        
        neuFloat: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        neuPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        neuSlideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        neuSlideIn: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        neuScale: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        neuGlow: {
          "0%, 100%": { boxShadow: "var(--neu-shadow-outset)" },
          "50%": { boxShadow: "var(--neu-shadow-hover)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        
        "neu-float": "neuFloat 6s ease-in-out infinite",
        "neu-pulse": "neuPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "neu-slide-up": "neuSlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "neu-slide-in": "neuSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "neu-scale": "neuScale 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "neu-glow": "neuGlow 2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        'neu': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'neu': '300ms',
      },
    },
  },
  plugins: [],
} as Config;
