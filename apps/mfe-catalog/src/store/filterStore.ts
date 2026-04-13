import { useStore } from '@tanstack/react-store'
import { Store } from '@tanstack/store'
import type { ProductFilter, ProductSortBy } from '../types/product'

export interface FilterState extends ProductFilter {
  sortBy: ProductSortBy
  page: number
}

const initialState: FilterState = {
  query: '',
  category: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  sortBy: 'relevance',
  page: 0,
}

export const filterStore = new Store<FilterState>(initialState)

export const useFilterState = () => useStore(filterStore)

export function setQuery(query: string) {
  filterStore.setState((state) => ({ ...state, query, page: 0 }))
}

export function setCategory(category: string | undefined) {
  filterStore.setState((state) => ({ ...state, category, page: 0 }))
}

export function setPriceRange(minPrice?: number, maxPrice?: number) {
  filterStore.setState((state) => ({ ...state, minPrice, maxPrice, page: 0 }))
}

export function setSortBy(sortBy: FilterState['sortBy']) {
  filterStore.setState((state) => ({ ...state, sortBy, page: 0 }))
}

export function setPage(page: number) {
  filterStore.setState((state) => ({ ...state, page }))
}

export function resetFilters() {
  filterStore.setState(() => initialState)
}
