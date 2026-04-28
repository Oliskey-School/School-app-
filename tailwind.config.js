/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1d4ed8', // blue-700
                'primary-dark': '#1e40af', // blue-800
                'primary-light': '#3b82f6', // blue-500
            },
            screens: {
                'xs': '480px',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
