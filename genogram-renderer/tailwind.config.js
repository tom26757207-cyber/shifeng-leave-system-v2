/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cis: {
          bg: '#f7f9fb',
          primary: '#7591A2',
          gold: '#C9A96E',
          male: '#eef2f5',
          female: '#f7f0e4',
          deceased: '#e2e8f0',
          deceasedX: '#9b3828',
          mildBg: '#edf7f1',
          mildFg: '#2d7a50',
          moderateBg: '#fff4e8',
          moderateFg: '#8a4a15',
          severeBg: '#fdf0ee',
          severeFg: '#9b3828',
        },
      },
      fontFamily: {
        zh: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
        num: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
