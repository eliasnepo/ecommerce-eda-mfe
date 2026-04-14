import { Link, useParams } from 'react-router-dom'

export default function CartConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>()

  return (
    <section
      className="mx-auto mt-6 max-w-[640px] rounded-card border border-border bg-surface px-6 py-10 text-center"
      aria-live="polite"
    >
      <div
        className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-success"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path
            d="M6 12l4 4 8-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="m-0 text-3xl font-bold text-text-primary">Order placed successfully</h1>
      <p className="m-0 mt-2 font-semibold text-text-primary">Order ID: {orderId ?? 'N/A'}</p>
      <p className="mb-6 mt-2 text-text-secondary">
        We received your order and will process it shortly.
      </p>

      <Link
        to="/catalog"
        className="inline-flex min-h-11 items-center justify-center rounded-pill bg-brand-primary px-6 text-sm font-semibold text-white no-underline"
      >
        Continue shopping
      </Link>
    </section>
  )
}
