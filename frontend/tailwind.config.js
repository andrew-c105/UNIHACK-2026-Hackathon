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
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#0d1117',
          card: '#141b2d',
          surface: '#1a2332',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
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
