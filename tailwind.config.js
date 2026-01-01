/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ewu: {
          red: '#A4232E',
          'red-dark': '#8A1D26',
          'red-light': '#C64D55',
          black: '#1A1A1A',
        },
        subject: {
          cscd: '#2563EB',
          cybr: '#A4232E',
          math: '#059669',
        },
        delivery: {
          f2f: '#2563EB',
          online: '#7C3AED',
          hybrid: '#0891B2',
          arranged: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
