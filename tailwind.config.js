/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#edfdf6',
          100: '#d0f9e7',
          200: '#a3f0d0',
          300: '#6de2b5',
          400: '#38cc97',
          500: '#1aaf7d',
          600: '#118c63',
          700: '#0e7050',
          800: '#0d5840',
          900: '#0b4833',
        },
      },
    },
  },
  plugins: [],
}
