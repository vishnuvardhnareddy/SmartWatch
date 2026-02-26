/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981', // Emerald-500
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                secondary: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    500: '#f97316', // Orange-500
                    600: '#ea580c',
                },
                dark: {
                    800: '#1e293b', // Slate-800
                    900: '#0f172a', // Slate-900
                }
            },
        },
    },
    plugins: [],
}
