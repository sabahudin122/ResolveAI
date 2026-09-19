/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102033',
        ocean: '#164a6f',
        mist: '#eef4f8',
        pine: '#13795b',
        marigold: '#b7791f',
        rosewood: '#b42318',
      },
      boxShadow: {
        panel: '0 10px 30px rgba(15, 31, 48, 0.08)',
      },
    },
  },
  plugins: [],
};
