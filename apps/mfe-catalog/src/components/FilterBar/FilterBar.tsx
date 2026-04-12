import { useState } from 'react'
import {
  setCategory,
  setSortBy,
  type FilterState,
  useFilterState,
} from '../../store/filterStore'
import FilterDropdown from './FilterDropdown'
import FilterPill from './FilterPill'

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports']
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' as const },
  { label: 'Price: Low to High', value: 'price_asc' as const },
  { label: 'Price: High to Low', value: 'price_desc' as const },
]

const SORT_LABELS: Record<FilterState['sortBy'], string> = {
  relevance: 'Sort by',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
}

export default function FilterBar() {
  const filter = useFilterState()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggleDropdown = (key: string) => {
    setOpenDropdown((previous) => (previous === key ? null : key))
  }

  return (
    <div
      role="toolbar"
      aria-label="Product filters"
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      <FilterPill
        label={filter.category ?? 'Category'}
        active={Boolean(filter.category)}
        onClick={() => toggleDropdown('category')}
      >
        {openDropdown === 'category' && (
          <FilterDropdown
            options={CATEGORIES.map((category) => ({
              label: category,
              value: category,
            }))}
            selected={filter.category ?? null}
            onSelect={(value) => {
              setCategory(value ?? undefined)
              setOpenDropdown(null)
            }}
          />
        )}
      </FilterPill>

      <FilterPill
        label={SORT_LABELS[filter.sortBy]}
        active={filter.sortBy !== 'relevance'}
        onClick={() => toggleDropdown('sort')}
      >
        {openDropdown === 'sort' && (
          <FilterDropdown
            options={SORT_OPTIONS}
            selected={filter.sortBy}
            onSelect={(value) => {
              if (value) {
                setSortBy(value as FilterState['sortBy'])
              }
              setOpenDropdown(null)
            }}
          />
        )}
      </FilterPill>
    </div>
  )
}
