/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./overlay.html", "./editor.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--background)",
          dark: "#09090b",
        },
        foreground: {
          DEFAULT: "var(--foreground)",
          dark: "#fafafa",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          dark: "#09090b",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
          dark: "#27272a",
        },
        border: {
          DEFAULT: "var(--border)",
          dark: "#27272a",
        },
        input: {
          DEFAULT: "var(--input)",
          dark: "#27272a",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          dark: "#18181b",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          dark: "#fafafa",
        },
        ring: {
          DEFAULT: "var(--ring)",
          dark: "#fafafa",
        },
        destructive: "var(--destructive)",
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
}
