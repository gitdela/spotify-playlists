/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./docs/**/*.{html,js}'],
  theme: {
    screens: {
      xxs: '315px',
      xs: '350px',
      sm: '400px',
      md: '530px',
      lg: '750px',
      xl: '900px',
      '2xl': '1536px',
    },
    extend: {},
  },
  plugins: [],
};
