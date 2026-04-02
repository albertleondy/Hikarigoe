import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        daisyui,
    ],
    daisyui: {
        themes: [
            {
                darkPurple: {
                    "primary": "#7f5af0",
                    "primary-focus": "#6641db",
                    "primary-content": "#ffffff",
                    "secondary": "#2cb67d",
                    "secondary-focus": "#249666",
                    "secondary-content": "#ffffff",
                    "accent": "#ff8906",
                    "neutral": "#24243e",
                    "base-100": "#0f0c29",
                    "base-200": "#161338",
                    "base-300": "#1d1947",
                    "base-content": "#ffffff",
                    "info": "#3abff8",
                    "success": "#36d399",
                    "warning": "#fbbd23",
                    "error": "#f87272",
                },
            },
        ],
    },
}
