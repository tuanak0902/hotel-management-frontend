/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'radial-blue-strong': 'radial-gradient(125% 125% at 50% 10%, #e0ecff 25%, #3b82f6 55%, #1e3a8a 100%)',
      },
    },
  },
  plugins: [],
}

