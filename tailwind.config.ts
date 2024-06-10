import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        btn: "1px 3px 0px 0px #171e42",
        card: "1px 3px 0px 0px #171e42",
        btnpop: "3px 5px 0px 0px #171e42",
      },
      backgroundImage: {
        "arrow-down-blue": "url('/svg/header/arrow-down-my-account.svg')",
        "arrow-up-blue": "url('/svg/header/arrow-up-my-account.svg')",
      },

      fontSize: {
        "7xl": "72px",
        base: "20px",
      },

      lineHeight: {
        regular: "1",
      },
      rotate: {
        "10.2": "10.2deg",
        "9.55": "9.55deg",
        "3.72": "3.72deg",
      },
      maxWidth: {
        "1350": "1350px",
      },

      colors: {
        black: "#2A2A2A",
        gray: "#F4F4F4",
        yellow: "#FFC200",
        dark_blue: "#26326E",
      },

      animation: {
        raiseAndLower: "raiseAndLower 2s infinite",
        cursor: "cursor .6s linear infinite alternate",
        openSlow: "openSlow 1.8s ease-out .8s 1 normal both",
        "type-reverse":
          "openSlow 1.8s ease-out 0s infinite alternate-reverse both",
        "spin-slow": "spin-slow 10s linear infinite",
        scale: "scale 0.5s linear 1 forwards",
      },
      keyframes: {
        openSlow: {
          "0%": { width: "0ch" },
          "5%, 10%": { width: "1ch" },
          "15%, 20%": { width: "2ch" },
          "25%, 30%": { width: "3ch" },
          "35%, 40%": { width: "4ch" },
          "45%, 50%": { width: "5ch" },
          "55%, 60%": { width: "6ch" },
          "65%, 70%": { width: "7ch" },
          "75%, 80%": { width: "8ch" },
          "85%, 90%": { width: "9ch" },
          "95%": { width: "10ch" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        scale: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.2)" },
        },
        raiseAndLower: {
          "0%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      fontFamily: {
        saira: ["Saira", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },

  plugins: [
    require("daisyui"),
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar"),
  ],
} satisfies Config;
