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

            /* ====================================================================
             * DESIGN TOKENS
             *
             * Named aliases onto values already in use, so nothing renders
             * differently today — but new and refactored code has ONE name to
             * reach for instead of picking from the 6 radius steps, 8 shadow
             * steps and 10 padding steps currently live in the codebase.
             * ================================================================== */

            /* Three steps only: a control, a card, a sheet. */
            borderRadius: {
                'control': '0.75rem',  // rounded-xl  — buttons, inputs, chips
                'card': '1rem',        // rounded-2xl — cards, list rows, panels
                'sheet': '1.5rem',     // rounded-3xl — modals, sheets, drawers
            },

            /* Four elevation steps. Bigger surfaces read as thicker: a full-width
             * sheet gets a deeper shadow than a chip. */
            boxShadow: {
                'e1': '0 1px 2px 0 rgb(15 23 42 / 0.05)',
                'e2': '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.05)',
                'e3': '0 10px 30px -10px rgb(2 6 23 / 0.12), 0 2px 6px -2px rgb(2 6 23 / 0.08)',
                'e4': '0 24px 48px -16px rgb(2 6 23 / 0.20), 0 8px 16px -8px rgb(2 6 23 / 0.12)',
            },

            /* Size-specific tracking. Letters read too far apart as type grows, so
             * display sizes tighten and body sits at zero — a single global
             * letter-spacing value is always wrong at one end of the scale. */
            letterSpacing: {
                'display': '-0.022em',
                'title': '-0.014em',
                'body': '0em',
                'label': '0.006em',
            },

            /* Leading tracks size inversely: tight on headings, open on body. */
            lineHeight: {
                'display': '1.05',
                'title': '1.2',
                'body': '1.55',
                'dense': '1.35',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
