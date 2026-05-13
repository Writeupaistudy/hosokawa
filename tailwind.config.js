/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"DotGothic16"', '"Press Start 2P"', "monospace"],
        body: ['"M PLUS Rounded 1c"', "system-ui", "sans-serif"],
      },
      colors: {
        bird: {
          sky: "#7cd6ff",
          deep: "#0b1b4d",
          night: "#06122e",
          yellow: "#ffd24a",
          pink: "#ff6fa3",
          green: "#5ee27a",
        },
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(0,0,0,0.85)",
        "pixel-sm": "2px 2px 0 0 rgba(0,0,0,0.85)",
      },
      keyframes: {
        bob: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        blink: {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        sparkle: {
          "0%,100%": { transform: "scale(1) rotate(0)", opacity: "0.8" },
          "50%": { transform: "scale(1.3) rotate(20deg)", opacity: "1" },
        },
      },
      animation: {
        bob: "bob 2.4s ease-in-out infinite",
        blink: "blink 1s steps(1) infinite",
        pop: "pop 0.4s ease-out both",
        sparkle: "sparkle 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
