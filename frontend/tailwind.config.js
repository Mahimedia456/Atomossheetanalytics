export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        atomos: {
          bg: "#030712",
          panel: "#07111f",
          card: "#0b1628",
          cyan: "#00dcc5",
          cyanSoft: "rgba(0,220,197,0.12)",
          border: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};