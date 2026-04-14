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
const STATIC_FILTERS = ['Price', 'Review', 'Color', 'Material', 'Offer', 'All Filters']
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' as const },
  { label: 'Price: Low to High', value: 'price_asc' as const },
  { label: 'Price: High to Low', value: 'price_desc' as const },
]

const SORT_LABELS: Record<FilterState['sortBy'], string> = {
  relevance: 'Sort by: Relevance',
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
        label={filter.category ?? 'Categories'}
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

      {STATIC_FILTERS.map((label) => (
        <button
          key={label}
          type="button"
          className="inline-flex min-h-10 items-center gap-1 rounded-pill bg-[#E7E7E7] px-4 text-sm font-medium text-primary-text"
        >
          <span>{label}</span>
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}

      <FilterPill
        label={SORT_LABELS[filter.sortBy]}
        active={filter.sortBy !== 'relevance'}
        onClick={() => toggleDropdown('sort')}
        className="md:ml-auto"
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
