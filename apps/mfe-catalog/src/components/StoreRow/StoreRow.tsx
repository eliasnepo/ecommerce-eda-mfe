import { useRef } from 'react'
import type { Store } from '../../types/product'
import StoreCard from './StoreCard'

const MOCK_STORES: Store[] = [
  { id: '1', name: 'Deux par Deux', rating: 4.5, reviewCount: '2.6k' },
  { id: '2', name: 'Paisley & Gray', rating: 4.5, reviewCount: '2.6k' },
  { id: '3', name: 'Ally Fashion', rating: 4.5, reviewCount: '2.6k' },
  { id: '4', name: 'Nike', rating: 4.5, reviewCount: '2.6k' },
]

export default function StoreRow() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="stores-heading" className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="stores-heading" className="text-xl font-bold text-primary-text">
          Store
        </h2>
        <a href="#" className="flex items-center gap-1 text-sm text-link">
          View All
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </a>
      </div>

      <div className="relative flex items-center">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {MOCK_STORES.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>

        <button
          onClick={scrollRight}
          aria-label="Scroll stores right"
          className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card-bg shadow-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </section>
  )
}
