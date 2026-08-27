/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF9F4",
        ink: "#241623",
        coral: "#FF6B5B",
        gold: "#FFB627",
        mint: "#2EC4B6",
        mauve: "#B08D7A",
        sand: "#F3E9DE",
        peach: "#FFF1E4",
        peachline: "#FFE0C2",
        dust: "#D8C4B8",
      },
      fontFamily: {
        display: ["'Baloo 2'", "ui-rounded", "system-ui"],
        body: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
