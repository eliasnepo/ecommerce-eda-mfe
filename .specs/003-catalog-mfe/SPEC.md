# Implementation Spec — Phase 4 (Catalog MFE)

**Status:** Ready for implementation  
**Design doc:** `docs/DESIGN_DOC.md`  
**UI design:** `docs/search_page_design.json`  
**Last updated:** 2026-04-12

---

## Phase 4 — Catalog MFE

### Goal

Build the Catalog micro-frontend as a **Vite + React 18 + TypeScript** application that is exposed as a **Module Federation remote**. It renders the product search page (filter bar, store row, product grid), a product detail page, and dispatches "add to cart" events to the shell. Data fetching is handled by **TanStack Query** over the existing GraphQL API exposed by the API Gateway. Filter/search state is managed by **TanStack Store**. The visual design matches `docs/search_page_design.json`.

**Tailwind is mandatory in this phase:** implement component styling with Tailwind utility classes and theme tokens from `tailwind.config.ts`; avoid component-scoped CSS files and CSS-in-JS for Catalog MFE UI.

> Note: this phase intentionally standardizes on Vite + TanStack Query/Store + `graphql-request` and supersedes older frontend stack suggestions in `docs/DESIGN_DOC.md` for implementation purposes.

### Location

`apps/mfe-catalog/`

---

## Project structure

```
apps/mfe-catalog/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.ts
├── src/
│   ├── bootstrap.tsx          ← deferred import — required by Module Federation
│   ├── main.tsx               ← thin entry: import('./bootstrap')
│   ├── App.tsx                ← root component exposed via federation
│   ├── index.css              ← Tailwind directives and app-level tokens
│   ├── api/
│   │   ├── graphqlClient.ts   ← graphql-request client pointed at Gateway
│   │   └── queries/
│   │       ├── products.gql.ts
│   │       └── product.gql.ts
│   ├── components/
│   │   ├── CatalogPage.tsx
│   │   ├── FilterBar/
│   │   │   ├── FilterBar.tsx
│   │   │   ├── FilterPill.tsx
│   │   │   └── FilterDropdown.tsx
│   │   ├── ProductGrid/
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductCardSkeleton.tsx
│   │   ├── StoreRow/
│   │   │   ├── StoreRow.tsx
│   │   │   └── StoreCard.tsx
│   │   ├── ProductDetail/
│   │   │   └── ProductDetailPage.tsx
│   │   ├── SearchBar/
│   │   │   └── SearchBar.tsx
│   │   └── ui/
│   │       ├── StarRating.tsx
│   │       └── WishlistButton.tsx
│   ├── hooks/
│   │   ├── useProducts.ts
│   │   └── useProduct.ts
│   ├── store/
│   │   └── filterStore.ts
│   ├── types/
│   │   └── product.ts
│   └── test/
│       ├── mswServer.ts
│       ├── setup.ts
│       └── utils.tsx           ← custom render with providers
├── src/__tests__/
│   ├── components/
│   │   ├── FilterBar.test.tsx
│   │   ├── ProductCard.test.tsx
│   │   ├── ProductGrid.test.tsx
│   │   ├── SearchBar.test.tsx
│   │   └── StoreRow.test.tsx
│   └── hooks/
│       ├── useProducts.test.ts
│       └── useProduct.test.ts
```

---

## Technology stack

| Concern | Library | Version |
|---------|---------|---------|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Bundler | Vite | 5.x |
| Module Federation | `@originjs/vite-plugin-federation` | 1.x |
| Data fetching | `@tanstack/react-query` v5 | 5.x |
| GraphQL transport | `graphql-request` | 7.x |
| State management | `@tanstack/store` | 0.x |
| React store bindings | `@tanstack/react-store` | 0.x |
| Routing | `react-router-dom` | 6.x |
| Styling | Tailwind CSS | 3.x |
| Test runner | Vitest | 1.x |
| Component tests | `@testing-library/react` + `@testing-library/user-event` | 14.x / 14.x |
| HTTP mocking | `msw` | 2.x |
| DOM environment | `jsdom` | 24.x |

---

## `package.json`

```json
{
  "name": "mfe-catalog",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3001",
    "build": "vite build",
    "preview": "vite preview --port 3001",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-store": "^0.5.0",
    "@tanstack/store": "^0.5.0",
    "graphql-request": "^7.0.0",
    "graphql": "^16.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@originjs/vite-plugin-federation": "^1.3.5",
    "@tanstack/react-query-devtools": "^5.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^24.0.0",
    "msw": "^2.3.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

---

## `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'catalogMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.0.0' },
      },
    }),
  ],
  server: {
    port: 3001,
    cors: true,
  },
  preview: {
    port: 3001,
    cors: true,
  },
  build: {
    // Required for Module Federation
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
})
```

---

## `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Design tokens

From `docs/search_page_design.json`. These are expressed as Tailwind classes and CSS variables.

Tailwind implementation rules for this phase:

- Keep `src/index.css` minimal (`@tailwind base; @tailwind components; @tailwind utilities;`) and use it as the global Tailwind entry.
- Prefer semantic Tailwind tokens (`bg-page-bg`, `text-primary-text`, `rounded-card`) over raw hex values in JSX.
- Do not add per-component `.css` files under `src/components`; style through Tailwind utility classes.
- Preserve responsive behavior with explicit breakpoint utilities (`sm`, `md`, `lg`, `xl`) where specified.

**`tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-text': '#111827',
        'secondary-text': '#6B7280',
        link: '#1D4ED8',
        'star-filled': '#F59E0B',
        'star-empty': '#D1D5DB',
        'card-bg': '#FFFFFF',
        'page-bg': '#F0F2F5',
        border: '#D1D5DB',
        'wishlist-icon': '#9CA3AF',
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Types

**`src/types/product.ts`**

```ts
export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  imageUrl: string | null
}

export interface ProductPage {
  content: Product[]
  totalElements: number
  totalPages: number
  currentPage: number
}

export interface ProductFilter {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
}

// For the Stores section — mock data in PoC
export interface Store {
  id: string
  name: string
  rating: number
  reviewCount: string
  thumbnailUrl?: string
}
```

---

## API layer

### GraphQL client

**`src/api/graphqlClient.ts`**

```ts
import { GraphQLClient } from 'graphql-request'

const GRAPHQL_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_GRAPHQL_URL ?? 'http://localhost:8080/graphql'

export const graphqlClient = new GraphQLClient(GRAPHQL_URL, {
  headers: {},
})
```

### GraphQL queries

**`src/api/queries/products.gql.ts`**

```ts
import { gql } from 'graphql-request'

export const PRODUCTS_QUERY = gql`
  query Products($filter: ProductFilter, $page: Int, $size: Int) {
    products(filter: $filter, page: $page, size: $size) {
      content {
        id
        name
        description
        price
        category
        imageUrl
      }
      totalElements
      totalPages
      currentPage
    }
  }
`

export interface ProductsQueryVariables {
  filter?: {
    query?: string
    category?: string
    minPrice?: number
    maxPrice?: number
  }
  page?: number
  size?: number
}

export interface ProductsQueryResult {
  products: import('../../types/product').ProductPage
}
```

**`src/api/queries/product.gql.ts`**

```ts
import { gql } from 'graphql-request'

export const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      description
      price
      category
      imageUrl
    }
  }
`

export interface ProductQueryResult {
  product: import('../../types/product').Product | null
}
```

---

## TanStack Store — filter state

**`src/store/filterStore.ts`**

```ts
import { Store } from '@tanstack/store'
import { useStore } from '@tanstack/react-store'
import type { ProductFilter } from '../types/product'

export interface FilterState extends ProductFilter {
  sortBy: 'relevance' | 'price_asc' | 'price_desc'
  page: number
}

export const filterStore = new Store<FilterState>({
  query: '',
  category: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  sortBy: 'relevance',
  page: 0,
})

// Typed selector hooks
export const useFilterState = () => useStore(filterStore)

export function setQuery(query: string) {
  filterStore.setState((s) => ({ ...s, query, page: 0 }))
}

export function setCategory(category: string | undefined) {
  filterStore.setState((s) => ({ ...s, category, page: 0 }))
}

export function setPriceRange(minPrice?: number, maxPrice?: number) {
  filterStore.setState((s) => ({ ...s, minPrice, maxPrice, page: 0 }))
}

export function setSortBy(sortBy: FilterState['sortBy']) {
  filterStore.setState((s) => ({ ...s, sortBy, page: 0 }))
}

export function setPage(page: number) {
  filterStore.setState((s) => ({ ...s, page }))
}

export function resetFilters() {
  filterStore.setState(() => ({
    query: '',
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'relevance',
    page: 0,
  }))
}
```

---

## TanStack Query hooks

**`src/hooks/useProducts.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '../api/graphqlClient'
import {
  PRODUCTS_QUERY,
  type ProductsQueryResult,
  type ProductsQueryVariables,
} from '../api/queries/products.gql'
import type { ProductFilter } from '../types/product'

const PAGE_SIZE = 20

export function useProducts(filter: ProductFilter, page: number) {
  const variables: ProductsQueryVariables = {
    filter: {
      query: filter.query || undefined,
      category: filter.category,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
    },
    page,
    size: PAGE_SIZE,
  }

  return useQuery<ProductsQueryResult>({
    queryKey: ['products', variables],
    queryFn: () =>
      graphqlClient.request<ProductsQueryResult>(PRODUCTS_QUERY, variables),
    staleTime: 1000 * 30, // 30 s
    placeholderData: (prev) => prev, // keep previous page visible while loading
  })
}
```

**`src/hooks/useProduct.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '../api/graphqlClient'
import {
  PRODUCT_QUERY,
  type ProductQueryResult,
} from '../api/queries/product.gql'

export function useProduct(id: string) {
  return useQuery<ProductQueryResult>({
    queryKey: ['product', id],
    queryFn: () =>
      graphqlClient.request<ProductQueryResult>(PRODUCT_QUERY, { id }),
    staleTime: 1000 * 60 * 5, // 5 min — product detail changes rarely
    enabled: Boolean(id),
  })
}
```

---

## Entry points

**`src/main.tsx`** — thin entry (Module Federation requirement: defer real app bootstrap)

```tsx
import('./bootstrap')
```

**`src/bootstrap.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

**`src/App.tsx`** — root component exposed by Module Federation

```tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CatalogPage from './components/CatalogPage'
import ProductDetailPage from './components/ProductDetail/ProductDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route index element={<CatalogPage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
      </Routes>
    </QueryClientProvider>
  )
}
```

> Use relative route paths in the remote (`index`, `product/:id`) so the Shell can mount the Catalog MFE at any base path (for example `/catalog/*`) without route breakage.
>
> When loaded by the Shell (Phase 5), the Shell provides `BrowserRouter`. The standalone `bootstrap.tsx` wraps `App` with its own router for local development.

---

## Components

### `CatalogPage`

**`src/components/CatalogPage.tsx`**

```tsx
import React from 'react'
import SearchBar from './SearchBar/SearchBar'
import FilterBar from './FilterBar/FilterBar'
import StoreRow from './StoreRow/StoreRow'
import ProductGrid from './ProductGrid/ProductGrid'
import { useFilterState, setQuery, setPage } from '../store/filterStore'
import { useProducts } from '../hooks/useProducts'

export default function CatalogPage() {
  const filter = useFilterState()
  const { data, isFetching } = useProducts(filter, filter.page)

  return (
    <div className="min-h-screen bg-page-bg px-4 py-6">
      <SearchBar
        value={filter.query ?? ''}
        onChange={setQuery}
      />
      <FilterBar />
      <StoreRow />
      <ProductGrid
        products={data?.products.content ?? []}
        totalPages={data?.products.totalPages ?? 0}
        currentPage={filter.page}
        isLoading={isFetching}
        onPageChange={setPage}
      />
    </div>
  )
}
```

---

### `SearchBar`

Debounced input — does not fire until the user pauses typing for 300 ms.

**`src/components/SearchBar/SearchBar.tsx`**

```tsx
import React, { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (query: string) => void
  debounceMs?: number
}

export default function SearchBar({ value, onChange, debounceMs = 300 }: Props) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [local, value, onChange, debounceMs])

  return (
    <div className="mb-4">
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        className="w-full rounded-pill border border-border bg-white px-4 py-2 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-2 focus:ring-link"
      />
    </div>
  )
}
```

---

### `FilterBar`

Horizontal pill row matching `docs/search_page_design.json § filter_bar`.

**`src/components/FilterBar/FilterBar.tsx`**

```tsx
import React, { useState } from 'react'
import FilterPill from './FilterPill'
import FilterDropdown from './FilterDropdown'
import {
  useFilterState,
  setCategory,
  setSortBy,
  type FilterState,
} from '../../store/filterStore'

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports']
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' as const },
  { label: 'Price: Low to High', value: 'price_asc' as const },
  { label: 'Price: High to Low', value: 'price_desc' as const },
]

export default function FilterBar() {
  const filter = useFilterState()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggle = (key: string) =>
    setOpenDropdown((prev) => (prev === key ? null : key))

  return (
    <div
      role="toolbar"
      aria-label="Product filters"
      className="mb-6 flex flex-wrap gap-2"
    >
      <FilterPill
        label={filter.category ?? 'Category'}
        active={Boolean(filter.category)}
        onClick={() => toggle('category')}
      >
        {openDropdown === 'category' && (
          <FilterDropdown
            options={CATEGORIES.map((c) => ({ label: c, value: c }))}
            selected={filter.category ?? null}
            onSelect={(value) => {
              setCategory(value ?? undefined)
              setOpenDropdown(null)
            }}
          />
        )}
      </FilterPill>

      <FilterPill
        label={filter.sortBy === 'relevance' ? 'Sort by' : filter.sortBy.replace('_', ' ')}
        active={filter.sortBy !== 'relevance'}
        onClick={() => toggle('sort')}
      >
        {openDropdown === 'sort' && (
          <FilterDropdown
            options={SORT_OPTIONS}
            selected={filter.sortBy}
            onSelect={(value) => {
              if (value) setSortBy(value as FilterState['sortBy'])
              setOpenDropdown(null)
            }}
          />
        )}
      </FilterPill>
    </div>
  )
}
```

**`src/components/FilterBar/FilterPill.tsx`**

```tsx
import React, { type ReactNode } from 'react'

interface Props {
  label: string
  active?: boolean
  onClick: () => void
  children?: ReactNode
}

export default function FilterPill({ label, active = false, onClick, children }: Props) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={[
          'flex items-center gap-1 rounded-pill border px-3.5 py-1.5 text-sm',
          active
            ? 'border-link bg-link text-white'
            : 'border-border bg-white text-primary-text',
        ].join(' ')}
      >
        {label}
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {children}
    </div>
  )
}
```

**`src/components/FilterBar/FilterDropdown.tsx`**

```tsx
import React from 'react'

interface Option {
  label: string
  value: string
}

interface Props {
  options: Option[]
  selected: string | null
  onSelect: (value: string | null) => void
}

export default function FilterDropdown({ options, selected, onSelect }: Props) {
  return (
    <ul
      role="listbox"
      className="absolute left-0 top-full z-10 mt-1 min-w-[160px] rounded-card border border-border bg-white py-1 shadow-md"
    >
      <li>
        <button
          role="option"
          aria-selected={selected === null}
          onClick={() => onSelect(null)}
          className="w-full px-3 py-2 text-left text-sm text-secondary-text hover:bg-gray-50"
        >
          All
        </button>
      </li>
      {options.map((opt) => (
        <li key={opt.value}>
          <button
            role="option"
            aria-selected={selected === opt.value}
            onClick={() => onSelect(opt.value)}
            className={[
              'w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
              selected === opt.value ? 'font-semibold text-link' : 'text-primary-text',
            ].join(' ')}
          >
            {opt.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

---

### `StoreRow`

Horizontally scrollable row matching `docs/search_page_design.json § sections.stores`.

**`src/components/StoreRow/StoreRow.tsx`**

```tsx
import React, { useRef } from 'react'
import StoreCard from './StoreCard'
import type { Store } from '../../types/product'

// Mock data — PoC only. Replace with API data in a future phase.
const MOCK_STORES: Store[] = [
  { id: '1', name: 'Deux par Deux', rating: 4.5, reviewCount: '2.6k' },
  { id: '2', name: 'Paisley & Gray', rating: 4.5, reviewCount: '2.6k' },
  { id: '3', name: 'Ally Fashion',   rating: 4.5, reviewCount: '2.6k' },
  { id: '4', name: 'Nike',           rating: 4.5, reviewCount: '2.6k' },
]

export default function StoreRow() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = () => {
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
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </a>
      </div>

      <div className="relative flex items-center">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {MOCK_STORES.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
        <button
          onClick={scroll}
          aria-label="Scroll stores right"
          className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-white shadow-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </section>
  )
}
```

**`src/components/StoreRow/StoreCard.tsx`**

```tsx
import React from 'react'
import StarRating from '../ui/StarRating'
import type { Store } from '../../types/product'

interface Props {
  store: Store
}

export default function StoreCard({ store }: Props) {
  return (
    <div className="flex min-w-[220px] items-center gap-3 rounded-card bg-card-bg p-3">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-100" />
      <div>
        <p className="text-[15px] font-semibold text-primary-text">{store.name}</p>
        <StarRating rating={store.rating} reviewCount={store.reviewCount} />
        <a href="#" className="text-[13px] text-primary-text underline">
          Visit shop
        </a>
      </div>
    </div>
  )
}
```

---

### `ProductGrid` and `ProductCard`

Grid matches `docs/search_page_design.json § sections.results.grid` — 5 columns (xl), responsive.

**`src/components/ProductGrid/ProductGrid.tsx`**

```tsx
import React from 'react'
import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'
import type { Product } from '../../types/product'

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
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((product) => (
              <Link key={product.id} to={`product/${product.id}`}>
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
```

**`src/components/ProductGrid/ProductCard.tsx`**

```tsx
import React from 'react'
import StarRating from '../ui/StarRating'
import WishlistButton from '../ui/WishlistButton'
import type { Product } from '../../types/product'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() // prevent Link navigation
    window.dispatchEvent(
      new CustomEvent('cart:add-item', {
        detail: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
        },
        bubbles: true,
      }),
    )
  }

  return (
    <article
      aria-label={product.name}
      className="relative overflow-hidden rounded-card bg-card-bg pb-3"
    >
      {/* Product image */}
      <div className="relative aspect-square bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-100" />
        )}
        <WishlistButton productId={product.id} />
      </div>

      {/* Product info */}
      <div className="px-2.5 pt-2.5">
        <p className="mb-1 line-clamp-2 text-[13px] font-medium text-primary-text">
          {product.name}
        </p>
        <StarRating rating={4} reviewCount="—" />
        <p className="mt-1 text-[15px] font-bold text-primary-text">
          {product.price.toFixed(2)}{' '}
          <sup className="text-xs font-normal">AED</sup>
        </p>
        <button
          onClick={handleAddToCart}
          className="mt-2 w-full rounded-pill border border-border py-1 text-xs text-primary-text hover:bg-gray-50"
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}
```

**`src/components/ProductGrid/ProductCardSkeleton.tsx`**

```tsx
import React from 'react'

export default function ProductCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading product"
      className="animate-pulse overflow-hidden rounded-card bg-card-bg pb-3"
    >
      <div className="aspect-square bg-gray-200" />
      <div className="px-2.5 pt-2.5">
        <div className="mb-1 h-3 w-3/4 rounded bg-gray-200" />
        <div className="mb-1 h-3 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-1/3 rounded bg-gray-200" />
      </div>
    </div>
  )
}
```

---

### `ProductDetailPage`

**`src/components/ProductDetail/ProductDetailPage.tsx`**

```tsx
import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProduct } from '../../hooks/useProduct'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useProduct(id!)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg p-6">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="aspect-square max-w-md rounded-card bg-gray-200" />
          <div className="h-6 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  if (isError || !data?.product) {
    return (
      <div className="min-h-screen bg-page-bg p-6 text-center">
        <p className="text-secondary-text">Product not found.</p>
        <Link to=".." relative="path" className="mt-4 inline-block text-link underline">
          Back to catalog
        </Link>
      </div>
    )
  }

  const product = data.product

  const handleAddToCart = () => {
    window.dispatchEvent(
      new CustomEvent('cart:add-item', {
        detail: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
        },
        bubbles: true,
      }),
    )
  }

  return (
    <div className="min-h-screen bg-page-bg px-4 py-6">
      <Link to=".." relative="path" className="mb-4 inline-flex items-center gap-1 text-sm text-link">
        ← Back to catalog
      </Link>

      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-card bg-card-bg p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-64 w-full rounded-card object-cover md:w-64"
              />
            ) : (
              <div className="h-64 w-full rounded-card bg-gray-100 md:w-64" />
            )}

            <div className="flex-1">
              <p className="mb-1 text-xs uppercase tracking-wide text-secondary-text">
                {product.category}
              </p>
              <h1 className="mb-3 text-2xl font-bold text-primary-text">
                {product.name}
              </h1>
              <p className="mb-4 text-sm text-secondary-text">{product.description}</p>
              <p className="mb-6 text-3xl font-bold text-primary-text">
                {product.price.toFixed(2)}{' '}
                <sup className="text-lg font-normal">AED</sup>
              </p>
              <button
                onClick={handleAddToCart}
                className="rounded-pill bg-link px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### Shared UI atoms

**`src/components/ui/StarRating.tsx`**

```tsx
import React from 'react'

interface Props {
  rating: number       // 0–5, supports .5
  reviewCount?: string | number
}

export default function StarRating({ rating, reviewCount }: Props) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.floor(rating)
        const half   = !filled && i < rating
        return (
          <svg
            key={i}
            className={`h-3 w-3 ${filled ? 'text-star-filled' : half ? 'text-star-filled' : 'text-star-empty'}`}
            viewBox="0 0 20 20"
            fill={filled || half ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      })}
      {reviewCount !== undefined && (
        <span className="text-[12px] text-secondary-text">({reviewCount})</span>
      )}
    </div>
  )
}
```

**`src/components/ui/WishlistButton.tsx`**

```tsx
import React, { useState } from 'react'

interface Props {
  productId: string
}

export default function WishlistButton({ productId }: Props) {
  const [saved, setSaved] = useState(false)

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        setSaved((v) => !v)
      }}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      data-testid={`wishlist-${productId}`}
      className="absolute right-2.5 top-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/75"
    >
      <svg
        className={`h-4 w-4 ${saved ? 'text-red-500' : 'text-wishlist-icon'}`}
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  )
}
```

---

## Cross-MFE communication

The "Add to cart" action fires a browser `CustomEvent` on `window`:

```ts
// Event name: 'cart:add-item'
// Event detail:
interface CartAddItemDetail {
  productId: string
  productName: string
  price: number
  quantity: number
}
```

The Cart MFE (Phase 5) will listen for this event via `window.addEventListener('cart:add-item', handler)`. No direct import between remotes is needed.

---

## Test setup

**`src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
import { server } from './mswServer'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**`src/test/mswServer.ts`** — MSW handlers for GraphQL

```ts
import { setupServer } from 'msw/node'
import { graphql, HttpResponse } from 'msw'

export const handlers = [
  graphql.query('Products', () => {
    return HttpResponse.json({
      data: {
        products: {
          content: [
            {
              id: 'prod-1',
              name: 'Wireless Headphones',
              description: 'Great sound',
              price: 99.99,
              category: 'Electronics',
              imageUrl: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
        },
      },
    })
  }),

  graphql.query('Product', ({ variables }) => {
    if (variables.id === 'prod-1') {
      return HttpResponse.json({
        data: {
          product: {
            id: 'prod-1',
            name: 'Wireless Headphones',
            description: 'Great sound',
            price: 99.99,
            category: 'Electronics',
            imageUrl: null,
          },
        },
      })
    }
    return HttpResponse.json({ data: { product: null } })
  }),
]

export const server = setupServer(...handlers)
```

**`src/test/utils.tsx`** — custom render with providers

```tsx
import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  })
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}
```

---

## Test cases

### `FilterBar.test.tsx`

| # | Description |
|---|-------------|
| 1 | Renders all filter pills (Category, Sort by) |
| 2 | Clicking a pill opens the dropdown (`role="listbox"` visible) |
| 3 | Selecting a category calls `setCategory` and closes the dropdown |
| 4 | Active pill has link-colored styling |

### `ProductCard.test.tsx`

| # | Description |
|---|-------------|
| 1 | Renders product name and price |
| 2 | "Add to cart" click dispatches `cart:add-item` CustomEvent with correct detail |
| 3 | Wishlist button toggles `aria-pressed` and icon fill on click |
| 4 | Wishlist button click does not trigger card link navigation |

### `ProductGrid.test.tsx`

| # | Description |
|---|-------------|
| 1 | Shows 10 skeleton cards when `isLoading=true` |
| 2 | Renders product cards when data is provided |
| 3 | Shows Previous/Next pagination only when `totalPages > 1` |
| 4 | Previous button is disabled on page 0 |
| 5 | Clicking Next calls `onPageChange(currentPage + 1)` |

### `SearchBar.test.tsx`

| # | Description |
|---|-------------|
| 1 | Renders an `<input type="search">` with correct aria-label |
| 2 | Typing does not call `onChange` immediately (debounce) |
| 3 | `onChange` is called after debounce period |
| 4 | `onChange` is called once for a burst of keystrokes (debounce collapses) |

### `StoreRow.test.tsx`

| # | Description |
|---|-------------|
| 1 | Renders all 4 mock stores by name |
| 2 | Each store card shows "Visit shop" link |
| 3 | Scroll button is focusable with accessible label |

### `useProducts.test.ts`

| # | Description |
|---|-------------|
| 1 | Returns product data on successful GraphQL response (MSW) |
| 2 | `isLoading` is true before response arrives |
| 3 | `queryKey` changes when filter changes — separate cache entries |

### `useProduct.test.ts`

| # | Description |
|---|-------------|
| 1 | Returns product on successful response |
| 2 | Returns `null` for an unknown product ID |
| 3 | Does not fire when `id` is empty string (`enabled: false`) |

---

## Environment variables

**`.env`** (committed)
```
VITE_GRAPHQL_URL=http://localhost:8080/graphql
```

**`.env.local`** (gitignored — local overrides)
```
VITE_GRAPHQL_URL=http://localhost:8080/graphql
```

---

## Acceptance criteria

| # | Criterion |
|---|-----------|
| 1 | `npm run dev` starts the Catalog MFE on port 3001 without errors. |
| 2 | `http://localhost:3001` loads the catalog page with filter bar, store row, and product grid. |
| 3 | `http://localhost:3001/remoteEntry.js` is served (Module Federation entry point). |
| 4 | With API Gateway running, the product grid fetches real data from `localhost:8080/graphql`. |
| 5 | Typing in the search bar triggers a GraphQL query after the debounce delay (300 ms). |
| 6 | Selecting a category filter re-queries and shows only matching products. |
| 7 | Clicking a product card navigates to `product/:id` under the current mount path and renders product details. |
| 8 | Clicking "Add to cart" dispatches a `cart:add-item` CustomEvent on `window`. |
| 9 | Clicking the wishlist heart toggles between outline and filled states. |
| 10 | Product grid shows skeleton cards while the query is in flight. |
| 11 | Pagination controls appear when `totalPages > 1`; navigation works correctly. |
| 12 | Grid is responsive: 1 → 2 → 3 → 4 → 5 columns across xs/sm/md/lg/xl breakpoints. |
| 13 | `npm run test` passes all test suites with zero failures. |
| 14 | `npm run typecheck` exits with zero errors. |
| 15 | `npm run build` produces a `dist/` directory containing `remoteEntry.js`. |
| 16 | Catalog UI styling is implemented with Tailwind utility classes and config tokens; no component-level CSS files are required beyond `src/index.css`. |

---

## Out of scope for this spec

- Shell host integration (Phase 5)
- Cart MFE (Phase 5)
- Authentication / user identity
- Order Service integration
- AI recommendations (Phases 6–7)
- CI/CD pipeline
