import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./public/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#00553A',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        surface: '#FFFFFF',
        'surface-muted': '#F3F4F6',
        border: '#E5E7EB',
        success: '#00A63E',
        danger: '#991B1B',
        'danger-bg': '#FEF2F2',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        pill: '999px',
      },
      maxWidth: {
        cart: '1320px',
      },
    },
  },
  plugins: [],
}

export default config
