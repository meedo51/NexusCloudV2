/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyan: '#00F0FF',
        purple: '#A78BFA',
        blue: '#6366F1',
      },
    },
  },
  plugins: [],
};
