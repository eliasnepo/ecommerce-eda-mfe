import { useEffect } from 'react'
import Banner from './Banner/Banner'
import FilterBar from './FilterBar/FilterBar'
import ProductGrid from './ProductGrid/ProductGrid'
import { useProducts } from '../hooks/useProducts'
import {
  requestSearchQueryState,
  subscribeToSearchQuery,
} from '../integration/searchChannel'
import { setPage, setQuery, useFilterState } from '../store/filterStore'

export default function CatalogPage() {
  const filter = useFilterState()
  const { data, isFetching } = useProducts(filter, filter.page)

  useEffect(() => {
    const unsubscribe = subscribeToSearchQuery((query) => {
      setQuery(query)
    })

    requestSearchQueryState()

    return unsubscribe
  }, [])

  return (
    <div className="min-h-screen bg-page-bg px-4 py-6">
      <div className="mx-auto w-full max-w-[1320px]">
        <Banner />
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
