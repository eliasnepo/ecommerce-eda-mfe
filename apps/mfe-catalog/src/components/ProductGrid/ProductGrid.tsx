import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

interface Props {
  products: Product[]
  totalPages: number
  currentPage: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

export default function ProductGrid({
  products,
  totalPages,
  currentPage,
  isLoading,
  onPageChange,
}: Props) {
  return (
    <section aria-labelledby="results-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="results-heading" className="text-xl font-bold text-primary-text">
          Result
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : products.map((product) => (
              <Link key={product.id} to={`product/${product.id}`} className="block h-full">
                <ProductCard product={product} />
              </Link>
            ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="rounded-pill border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-secondary-text">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="rounded-pill border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
