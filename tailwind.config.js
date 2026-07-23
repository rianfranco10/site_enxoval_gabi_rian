/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6EF",
        paper: "#FFFFFF",
        warmgray: "#8B8378",
        line: "#E8E1D6",
        ink: "#3D3730",
        olive: {
          light: "#A9B394",
          DEFAULT: "#7D8C6A",
          dark: "#5F6B50",
        },
        terracotta: {
          light: "#E3B7A4",
          DEFAULT: "#C97C5D",
          dark: "#A85F42",
        },
        blush: {
          light: "#EFE0DA",
          DEFAULT: "#D9B8AE",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
