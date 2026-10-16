/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Herbal earthy palette
        cream: '#FAF6EE',
        beige: '#F1E8D7',
        sand: '#E7D9BE',
        leaf: {
          50: '#f2f7f0',
          100: '#e0eddc',
          200: '#c2dbb9',
          300: '#99c28d',
          400: '#6da35f',
          500: '#4d8743',
          600: '#3a6b34',
          700: '#30562c',
          800: '#294626',
          900: '#233b21',
        },
        bark: {
          DEFAULT: '#6B4A2F',
          dark: '#4A3220',
          light: '#8A6A4D',
        },
      },
      fontFamily: {
        serif: ['"Palatino Linotype"', '"Book Antiqua"', 'Georgia', '"Times New Roman"', 'Merriweather', 'serif'],
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 14px rgba(74, 50, 32, 0.10)',
        'card-hover': '0 14px 32px rgba(74, 50, 32, 0.16)',
      },
    },
  },
  plugins: [],
};
