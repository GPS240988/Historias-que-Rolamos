/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medieval: {
          charcoal: "var(--color-medieval-charcoal)",
          stone: "var(--color-medieval-stone)",
          gold: "var(--color-medieval-gold)",
          brightGold: "var(--color-medieval-brightGold)",
          wine: "var(--color-medieval-wine)",
          parchment: "var(--color-medieval-parchment)",
          silver: "var(--color-medieval-silver)",
          accent: "var(--color-medieval-accent)",
        }
      },
      fontFamily: {
        medieval: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 15px rgba(197, 168, 128, 0.15)',
        goldFocus: '0 0 25px rgba(197, 168, 128, 0.35)',
      }
    },
  },
  plugins: [],
}
