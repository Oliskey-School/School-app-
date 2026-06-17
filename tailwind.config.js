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
                // The app's ACCENT (indigo-*) is variable-driven so the Appearance
                // control can re-theme every accent across the whole app at once.
                // Defaults (in index.css :root) are the original indigo, so nothing
                // changes until the user picks a colour.
                indigo: {
                    50: 'rgb(var(--accent-50) / <alpha-value>)',
                    100: 'rgb(var(--accent-100) / <alpha-value>)',
                    200: 'rgb(var(--accent-200) / <alpha-value>)',
                    300: 'rgb(var(--accent-300) / <alpha-value>)',
                    400: 'rgb(var(--accent-400) / <alpha-value>)',
                    500: 'rgb(var(--accent-500) / <alpha-value>)',
                    600: 'rgb(var(--accent-600) / <alpha-value>)',
                    700: 'rgb(var(--accent-700) / <alpha-value>)',
                    800: 'rgb(var(--accent-800) / <alpha-value>)',
                    900: 'rgb(var(--accent-900) / <alpha-value>)',
                    950: 'rgb(var(--accent-950) / <alpha-value>)',
                },
            },
            screens: {
                'xs': '480px',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
