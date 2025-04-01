/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        press: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(2px)' },
          '100%': { transform: 'translateY(0)' }
        }
      },
      animation: {
        press: 'press 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)'
      }
    },
  },
  plugins: [],
  safelist: [
    'keyboard-button',
    'keyboard-button-primary',
    'keyboard-button-success',
    'keyboard-button-danger',
    'animate-press'
  ]
};
