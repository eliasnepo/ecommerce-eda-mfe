import FilterBar from './FilterBar/FilterBar'
import ProductGrid from './ProductGrid/ProductGrid'
import SearchBar from './SearchBar/SearchBar'
import { useProducts } from '../hooks/useProducts'
import { setPage, setQuery, useFilterState } from '../store/filterStore'

export default function CatalogPage() {
  const filter = useFilterState()
  const { data, isFetching } = useProducts(filter, filter.page)

  return (
    <div className="min-h-screen bg-page-bg px-4 py-6">
      <div className="mx-auto w-full max-w-[1320px]">
        <SearchBar value={filter.query ?? ''} onChange={setQuery} />
        <FilterBar />
        <ProductGrid
          products={data?.products.content ?? []}
          totalPages={data?.products.totalPages ?? 0}
          currentPage={filter.page}
          isLoading={isFetching}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
