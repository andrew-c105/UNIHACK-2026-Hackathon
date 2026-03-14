/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syncopate', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#0a0a0a',
          card: '#111111',
          surface: '#1a1a1a',
        },
        silver: '#e0e0e0',
        track: {
          up: '#22c55e',
          conflict: '#ef4444',
          changed: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
