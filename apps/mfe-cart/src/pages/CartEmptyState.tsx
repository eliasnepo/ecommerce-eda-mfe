import { Link } from 'react-router-dom'

export default function CartEmptyState() {
  return (
    <section
      className="rounded-card border border-border bg-surface px-6 py-10 text-center"
      aria-live="polite"
    >
      <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-text-secondary" fill="none">
          <path
            d="M6 8h12l-1 11H7L6 8zm3-2a3 3 0 016 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="m-0 text-2xl font-bold text-text-primary">Your cart is empty</h2>
      <p className="mb-6 mt-2 text-text-secondary">Add products to continue checkout.</p>
      <Link
        to="/catalog"
        className="inline-flex min-h-11 items-center justify-center rounded-pill bg-brand-primary px-6 text-sm font-semibold text-white no-underline"
      >
        Continue shopping
      </Link>
    </section>
  )
}
