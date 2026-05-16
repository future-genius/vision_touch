/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        secondary: '#FFFFFF',
        accent: '#E5E7EB',
        success: '#16A34A',
        error: '#DC2626',
        background: '#F8FAFC',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
