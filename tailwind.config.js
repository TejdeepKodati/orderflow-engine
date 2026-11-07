/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        trading: {
          bg: '#020617',
          surface: '#0B1120',
          card: '#0E172A',
          border: '#1E293B',
          bid: '#10B981',
          bidBg: 'rgba(16, 185, 129, 0.12)',
          ask: '#EF4444',
          askBg: 'rgba(239, 68, 68, 0.12)',
          cyan: '#38BDF8',
          amber: '#F59E0B'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
