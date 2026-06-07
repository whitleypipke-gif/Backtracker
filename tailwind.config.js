/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], // Scans all JSX & TSX files
  theme: {
    extend: {
      colors: {
        primary: "#F9531E", // Custom color example
        secondary: "#1a1a1a",
        customBlack: "#121212",
      },
      fontFamily: {
        'mulish': ['"Mulish"', 'sans-serif'], 
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
