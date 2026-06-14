/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          DEFAULT: '#0B0F19',
          50: '#0F1521',
          100: '#131B2A',
          200: '#1A2438',
          300: '#222E47',
          400: '#2A3856',
          500: '#334265',
          600: '#3C4D74',
        },
        cyan: {
          DEFAULT: '#00F0FF',
          50: '#00D4E6',
          100: '#00B8CC',
          200: '#00A0B3',
          300: '#008899',
          400: '#007080',
          500: '#005866',
          600: '#00404D',
        },
        coral: {
          DEFAULT: '#FF6B6B',
          50: '#FF5252',
          100: '#FF3838',
          200: '#FF1F1F',
          300: '#FF0505',
          400: '#EB0000',
          500: '#CC0000',
          600: '#AD0000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'gradient-mesh': 'gradientMesh 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        gradientMesh: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
