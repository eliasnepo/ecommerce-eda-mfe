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
      <h2 id="results-heading" className="mb-5 text-2xl font-bold text-primary-text md:text-3xl">
        Products for you!
      </h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            className="rounded-pill border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-secondary-text">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="rounded-pill border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
