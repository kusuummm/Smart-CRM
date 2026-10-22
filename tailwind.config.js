/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        inter: [
          'Inter',
          '"Plus Jakarta Sans"',
          'sans-serif',
        ],
      },
      colors: {
        primary: {
          50: 'var(--color-primary-50, #f0f4fa)',
          100: 'var(--color-primary-100, #e2ebf6)',
          200: 'var(--color-primary-200, #c7d7ed)',
          300: 'var(--color-primary-300, #9fb9df)',
          400: 'var(--color-primary-400, #658fca)',
          500: 'var(--color-primary-500, #2b498a)',
          600: 'var(--color-primary-600, #1f346c)',
          700: 'var(--color-primary-700, #182955)',
          800: 'var(--color-primary-800, #121f42)',
          900: 'var(--color-primary-900, #0c142c)',
        },
        dark: {
          50: '#fafbfd',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64758f',
          600: '#475569',
          700: '#2a3a5e',
          800: '#182647',
          900: '#10192e',
          950: '#0a1020',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
