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
        obsidian: '#090D16',
        panel: '#111827',
        'panel-light': '#1A2333',
        cyan: {
          400: '#22d3ee',
          500: '#00F0FF',
          600: '#0891b2',
        },
        emerald: {
          400: '#34d399',
          500: '#10B981',
        },
        crimson: {
          500: '#EF4444',
          600: '#DC2626',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        blue: {
          500: '#3B82F6',
          600: '#2563EB',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glowCyan 2s infinite alternate',
      },
      keyframes: {
        glowCyan: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
