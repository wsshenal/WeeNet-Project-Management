/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary-light': '#B0D287',
                'primary': '#96BD68',
                'primary-dark': '#6A953F',
                'accent': '#4D6F2F',
                'dark-bg': '#0A1F2E',
            },
        },
    },
    plugins: [],
}
