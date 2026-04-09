/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        blue: {
          50: 'rgb(var(--theme-primary) / 0.1)',
          100: 'rgb(var(--theme-primary) / 0.2)',
          200: 'rgb(var(--theme-primary) / 0.3)',
          300: 'rgb(var(--theme-primary) / 0.4)',
          400: 'rgb(var(--theme-primary) / 0.8)',
          500: 'rgb(var(--theme-primary) / 1)',
          600: 'rgb(var(--theme-primary) / 0.9)',
          700: 'rgb(var(--theme-primary) / 0.8)',
          800: 'rgb(var(--theme-primary) / 0.7)',
          900: 'rgb(var(--theme-primary) / 0.6)',
          950: 'rgb(var(--theme-primary) / 0.5)',
        },
        emerald: {
          50: 'rgb(var(--theme-secondary) / 0.1)',
          100: 'rgb(var(--theme-secondary) / 0.2)',
          200: 'rgb(var(--theme-secondary) / 0.3)',
          300: 'rgb(var(--theme-secondary) / 0.4)',
          400: 'rgb(var(--theme-secondary) / 0.8)',
          500: 'rgb(var(--theme-secondary) / 1)',
          600: 'rgb(var(--theme-secondary) / 0.9)',
          700: 'rgb(var(--theme-secondary) / 0.8)',
          800: 'rgb(var(--theme-secondary) / 0.7)',
          900: 'rgb(var(--theme-secondary) / 0.6)',
          950: 'rgb(var(--theme-secondary) / 0.5)',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};
