import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-text': '#111827',
        'secondary-text': '#6B7280',
        link: '#1D4ED8',
        'star-filled': '#F59E0B',
        'star-empty': '#D1D5DB',
        'card-bg': '#FFFFFF',
        'page-bg': '#F0F2F5',
        border: '#D1D5DB',
        'wishlist-icon': '#9CA3AF',
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}

export default config
