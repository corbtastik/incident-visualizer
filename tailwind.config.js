/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: { panel: { dark: "#111318", light: "#ffffff" } }
    }
  },
  plugins: []
};
