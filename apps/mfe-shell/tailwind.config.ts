import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./public/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#0C513F',
        'accent-primary': '#00553A',
        'page-bg': '#F3F3F3',
        surface: '#FFFFFF',
        'surface-muted': '#EFEFEF',
        'surface-tint': '#EFE6DB',
        'text-primary': '#0F172A',
        'text-secondary': '#6B7280',
        border: '#E5E7EB',
        rating: '#00A63E',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
        popover: '16px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(15, 23, 42, 0.06)',
        popover: '0 20px 44px rgba(17, 24, 39, 0.18)',
      },
      maxWidth: {
        shell: '1320px',
      },
    },
  },
  plugins: [],
}

export default config
