export default function Banner() {
  return (
    <section className="mb-7 overflow-hidden rounded-card bg-surface-tint" aria-label="Featured deal">
      <div className="grid gap-4 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-10">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary/70">
            Limited Offer
          </p>
          <h1 className="m-0 max-w-[16ch] text-3xl font-bold leading-tight text-primary-text md:text-5xl">
            Grab up to 50% OFF on selected products
          </h1>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-pill bg-accent-primary px-6 text-sm font-semibold text-white"
          >
            Buy Now
          </button>
        </div>

        <div className="flex min-h-[170px] items-center justify-center md:min-h-[240px]">
          <svg
            viewBox="0 0 24 24"
            className="h-24 w-24 text-brand-primary md:h-32 md:w-32"
            fill="none"
            aria-hidden
          >
            <path
              d="M7 7h10l-1 12H8L7 7zm2-2a3 3 0 016 0"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
