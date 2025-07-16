/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Scans your main HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // Scans all JS, TS, JSX, TSX files in src/ for Tailwind classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
