/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          DEFAULT: '#F5F0E8',
          light: '#FAF7F2',
        },
        white: '#FFFFFF',
        'powder-blue': {
          DEFAULT: '#7BAFD4',
          light: '#B8D4E8',
          dark: '#4D8FB8',
        },
        'dusty-pink': {
          DEFAULT: '#C8907A',
          light: '#E8C4B4',
          dark: '#A87060',
        },
        charcoal: '#1A1A1A',
        'dark-grey': '#2D2D2D',
        'mid-grey': '#6B6B6B',
        'light-grey': '#D4D0CA',
        border: '#E8E4DC',
        sage: {
          DEFAULT: '#7A9E7E',
          light: '#B4CDB6',
          bg: '#EAF2EA',
        },
        cherry: {
          DEFAULT: '#B5363A',
          light: '#E8AAAC',
          bg: '#FAEAEA',
        },
        amber: {
          DEFAULT: '#C8853A',
          light: '#E8C89A',
          bg: '#FBF2E8',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'editorial': '0 4px 20px -2px rgba(26, 26, 26, 0.05), 0 1px 4px -1px rgba(26, 26, 26, 0.03)',
        'editorial-hover': '0 14px 34px -6px rgba(26, 26, 26, 0.10), 0 4px 12px -2px rgba(26, 26, 26, 0.04)',
      },
      animation: {
        'spin-slow': 'spin 28s linear infinite',
      },
    },
  },
  plugins: [],
}
