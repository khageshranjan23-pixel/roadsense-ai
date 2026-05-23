/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#050D1A',     // deep navy
        darkSurface: '#0D1B2E', // card backgrounds
        primary: '#2563EB',     // electric blue
        secondary: '#7C3AED',   // violet
        accent: '#F59E0B',      // amber - warnings
        success: '#10B981',     // green
        danger: '#EF4444',      // red
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
