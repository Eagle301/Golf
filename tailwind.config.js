/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#1B3B2B',
        background: '#EBF0E6',
        'background-dark': '#121614',
        surface: '#F5F7F2',
        'surface-dark': '#1E2621',
        'text-primary': '#111827',
        'text-primary-dark': '#F3F4F6',
        'text-secondary': '#4B5563',
        'text-secondary-dark': '#9CA3AF',
        accent: '#34D399',
        'accent-blue': '#1D4ED8',
        'accent-gold': '#EAB308',
        'accent-gold-dark': '#F59E0B',
        border: '#2D3A32',
      },
    },
  },
  plugins: [],
};
