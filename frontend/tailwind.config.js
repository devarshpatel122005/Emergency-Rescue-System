/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f6f8',
          100: '#dde9ee',
          500: '#1f6f8b',
          700: '#145066',
          900: '#0e3442'
        },
        alert: {
          low: '#22c55e',
          medium: '#eab308',
          high: '#f97316',
          critical: '#dc2626'
        }
      }
    }
  },
  plugins: []
};
