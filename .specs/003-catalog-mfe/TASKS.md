# Tasks — Phase 4 (Catalog MFE)

**Spec:** `SPEC.md`  
**Design doc:** `docs/DESIGN_DOC.md`  
**UI design:** `docs/search_page_design.json`  
**Last updated:** 2026-04-12

Check off each task as it is completed. Tasks are ordered by implementation sequence — dependencies flow top-to-bottom within each section.

---

## 4.1 Project scaffold

- [ ] Create directory `apps/mfe-catalog/`
- [ ] Create `apps/mfe-catalog/package.json` with:
  - `"type": "module"`
  - Scripts: `dev` (vite --port 3001), `build`, `preview`, `test` (vitest run), `test:watch`, `test:ui`, `typecheck`
  - Dependencies: `react ^18.3`, `react-dom ^18.3`, `react-router-dom ^6.23`, `@tanstack/react-query ^5`, `@tanstack/store ^0.5`, `@tanstack/react-store ^0.5`, `graphql-request ^7`, `graphql ^16`
  - Dev dependencies: `@originjs/vite-plugin-federation ^1.3.5`, `@vitejs/plugin-react ^4.3`, `vite ^5.2`, `typescript ^5.4`, `tailwindcss ^3.4`, `postcss`, `autoprefixer`, `vitest ^1.6`, `@testing-library/react ^14`, `@testing-library/user-event ^14`, `@testing-library/jest-dom ^6`, `msw ^2.3`, `jsdom ^24`
- [ ] Create `apps/mfe-catalog/tsconfig.json` (target ES2020, `moduleResolution: bundler`, `jsx: react-jsx`, strict mode)
- [ ] Create `apps/mfe-catalog/tsconfig.node.json` for Vite config compilation
- [ ] Create `apps/mfe-catalog/index.html` with `<div id="root">` and `<script type="module" src="/src/main.tsx">`

## 4.2 Vite configuration

- [ ] Create `apps/mfe-catalog/vite.config.ts`:
  - `@vitejs/plugin-react` plugin
  - `@originjs/vite-plugin-federation` plugin configured as:
    - `name: 'catalogMfe'`
    - `filename: 'remoteEntry.js'`
    - `exposes: { './App': './src/App.tsx' }`
    - `shared: react (singleton), react-dom (singleton), react-router-dom (singleton)`
  - `server.port: 3001`, `server.cors: true`
  - `build.modulePreload: false`, `build.target: 'esnext'`, `build.minify: false`, `build.cssCodeSplit: false`

## 4.3 Test runner configuration

- [ ] Create `apps/mfe-catalog/vitest.config.ts`:
  - `environment: 'jsdom'`
  - `globals: true`
  - `setupFiles: ['./src/test/setup.ts']`
  - `include: ['src/__tests__/**/*.test.{ts,tsx}']`
  - `coverage.provider: 'v8'`

## 4.4 Tailwind CSS

- [ ] Create `apps/mfe-catalog/tailwind.config.ts` extending the default theme with custom colors from `docs/search_page_design.json`:
  - `primary-text: #111827`, `secondary-text: #6B7280`, `link: #1D4ED8`
  - `star-filled: #F59E0B`, `star-empty: #D1D5DB`
  - `card-bg: #FFFFFF`, `page-bg: #F0F2F5`, `border: #D1D5DB`, `wishlist-icon: #9CA3AF`
  - `borderRadius.card: 12px`, `borderRadius.pill: 999px`
- [ ] Create `apps/mfe-catalog/postcss.config.ts` with `tailwindcss` and `autoprefixer` plugins
- [ ] Create `apps/mfe-catalog/src/index.css` with `@tailwind base/components/utilities` directives
- [ ] Use Tailwind utilities for component styling (no component-scoped `.css` files under `src/components`)
- [ ] Use semantic Tailwind tokens (`bg-page-bg`, `text-primary-text`, `rounded-card`) instead of raw hex values in JSX

## 4.5 Types

- [ ] Create `apps/mfe-catalog/src/types/product.ts` with interfaces:
  - `Product` — `id, name, description, price, category, imageUrl`
  - `ProductPage` — `content, totalElements, totalPages, currentPage`
  - `ProductFilter` — `query?, category?, minPrice?, maxPrice?`
  - `Store` — `id, name, rating, reviewCount, thumbnailUrl?`

## 4.6 API layer

- [ ] Create `apps/mfe-catalog/src/api/graphqlClient.ts`:
  - `GraphQLClient` pointed at `import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:8080/graphql'`
- [ ] Create `apps/mfe-catalog/src/api/queries/products.gql.ts`:
  - `PRODUCTS_QUERY` — GQL query for `products(filter, page, size)` returning `content { id name description price category imageUrl }` + pagination fields
  - Export `ProductsQueryVariables` and `ProductsQueryResult` TypeScript interfaces
- [ ] Create `apps/mfe-catalog/src/api/queries/product.gql.ts`:
  - `PRODUCT_QUERY` — GQL query for `product(id)` returning all fields
  - Export `ProductQueryResult` TypeScript interface
- [ ] Create `apps/mfe-catalog/.env` with `VITE_GRAPHQL_URL=http://localhost:8080/graphql`

## 4.7 TanStack Store — filter state

- [ ] Create `apps/mfe-catalog/src/store/filterStore.ts`:
  - `FilterState` interface extending `ProductFilter` with `sortBy: 'relevance' | 'price_asc' | 'price_desc'` and `page: number`
  - `filterStore` instance initialised with all-empty defaults
  - Exported action functions: `setQuery`, `setCategory`, `setPriceRange`, `setSortBy`, `setPage`, `resetFilters` — each resets `page` to 0 except `setPage`
  - `useFilterState` hook using `useStore(filterStore)`

## 4.8 TanStack Query hooks

- [ ] Create `apps/mfe-catalog/src/hooks/useProducts.ts`:
  - `useProducts(filter, page)` — query key `['products', variables]`, calls `graphqlClient.request(PRODUCTS_QUERY, ...)`, `staleTime: 30_000`, `placeholderData: (prev) => prev`
- [ ] Create `apps/mfe-catalog/src/hooks/useProduct.ts`:
  - `useProduct(id)` — query key `['product', id]`, calls `graphqlClient.request(PRODUCT_QUERY, { id })`, `staleTime: 300_000`, `enabled: Boolean(id)`

## 4.9 Entry points

- [ ] Create `apps/mfe-catalog/src/main.tsx` — single line: `import('./bootstrap')`
- [ ] Create `apps/mfe-catalog/src/bootstrap.tsx`:
  - `ReactDOM.createRoot` wrapped in `<React.StrictMode>` + `<BrowserRouter>`
  - Imports `App` from `./App`
  - Imports `./index.css` so Tailwind styles are applied in local dev and standalone build
- [ ] Create `apps/mfe-catalog/src/App.tsx`:
  - Wraps everything in `<QueryClientProvider>` with a configured `QueryClient` (retry: 1, refetchOnWindowFocus: false)
  - Defines `<Routes>` with relative paths for host compatibility: `index` → `<CatalogPage>`, `product/:id` → `<ProductDetailPage>`

## 4.10 SearchBar component

- [ ] Create `apps/mfe-catalog/src/components/SearchBar/SearchBar.tsx`:
  - Props: `value: string`, `onChange: (q: string) => void`, `debounceMs?: number` (default 300)
  - Local state mirrors `value` prop
  - `useEffect` with `setTimeout` fires `onChange` only after `debounceMs` of no keystrokes; clears timer on re-render
  - Renders `<input type="search">` with `aria-label="Search products"` and pill styling

## 4.11 FilterBar components

- [ ] Create `apps/mfe-catalog/src/components/FilterBar/FilterDropdown.tsx`:
  - Props: `options: { label, value }[]`, `selected: string | null`, `onSelect: (v: string | null) => void`
  - Renders a `<ul role="listbox">` as an absolute-positioned overlay with an "All" option and one button per option
  - Highlights the selected option in link colour
- [ ] Create `apps/mfe-catalog/src/components/FilterBar/FilterPill.tsx`:
  - Props: `label, active?, onClick, children?`
  - Styled pill button; active state switches to link background + white text
  - Renders `children` (the dropdown) inside a `relative` wrapper
- [ ] Create `apps/mfe-catalog/src/components/FilterBar/FilterBar.tsx`:
  - Reads state from `useFilterState()`
  - Manages `openDropdown` local state to toggle one dropdown at a time
  - Renders Category pill (CATEGORIES constant) and Sort by pill (SORT_OPTIONS constant)
  - Calls `setCategory` / `setSortBy` on selection; closes dropdown after selection
  - Wraps in `<div role="toolbar" aria-label="Product filters">`

## 4.12 StoreRow components

- [ ] Create `apps/mfe-catalog/src/components/StoreRow/StoreCard.tsx`:
  - Props: `store: Store`
  - Renders circle thumbnail placeholder, store name (15px semi-bold), `<StarRating>`, and "Visit shop" underline link
  - Minimum card width 220 px
- [ ] Create `apps/mfe-catalog/src/components/StoreRow/StoreRow.tsx`:
  - Contains `MOCK_STORES` constant with 4 stores from `docs/search_page_design.json`
  - `useRef` on scroll container; scroll-right arrow button calls `scrollBy({ left: 240, behavior: 'smooth' })`
  - Section heading "Store" with "View All" link
  - `aria-labelledby` on `<section>`

## 4.13 ProductGrid components

- [ ] Create `apps/mfe-catalog/src/components/ProductGrid/ProductCardSkeleton.tsx`:
  - `animate-pulse` gray blocks mimicking image + text layout
  - `aria-busy="true"`, `aria-label="Loading product"`
- [ ] Create `apps/mfe-catalog/src/components/ui/StarRating.tsx`:
  - Props: `rating: number` (0–5), `reviewCount?: string | number`
  - Renders 5 SVG star icons: filled, half (same colour), or empty
  - Review count in parentheses, secondary colour, 12px
- [ ] Create `apps/mfe-catalog/src/components/ui/WishlistButton.tsx`:
  - Props: `productId: string`
  - Local `saved` state toggled on click
  - `aria-pressed={saved}`, `aria-label` changes between "Add to wishlist" / "Remove from wishlist"
  - Absolutely positioned top-right of card; `e.preventDefault()` to block Link navigation
  - `data-testid={'wishlist-' + productId}` for tests
- [ ] Create `apps/mfe-catalog/src/components/ProductGrid/ProductCard.tsx`:
  - Props: `product: Product`
  - Renders image (or gray placeholder), name (line-clamp-2), `<StarRating>`, price with AED superscript, "Add to cart" button, `<WishlistButton>`
  - "Add to cart" click fires `window.dispatchEvent(new CustomEvent('cart:add-item', { detail: { productId, productName, price, quantity: 1 }, bubbles: true }))` and calls `e.preventDefault()`
  - Image uses `loading="lazy"`
- [ ] Create `apps/mfe-catalog/src/components/ProductGrid/ProductGrid.tsx`:
  - Props: `products, totalPages, currentPage, isLoading, onPageChange`
  - When `isLoading`: renders 10 `<ProductCardSkeleton>` in the grid
  - When loaded: renders `products.map(p => <Link to={'product/' + p.id}><ProductCard product={p}/></Link>)`
  - Responsive grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`, `gap-4`
  - Pagination row visible only when `totalPages > 1`: Previous button, "Page N of M" text, Next button; Previous disabled at page 0, Next disabled at last page
  - Section heading "Result" with "View All" link

## 4.14 CatalogPage

- [ ] Create `apps/mfe-catalog/src/components/CatalogPage.tsx`:
  - Reads `filter` from `useFilterState()`
  - Calls `useProducts(filter, filter.page)`, destructures `data, isFetching`
  - Renders: page wrapper with `bg-page-bg`, then `<SearchBar>` → `<FilterBar>` → `<StoreRow>` → `<ProductGrid>`
  - Passes `setQuery` to `SearchBar.onChange`
  - Passes `setPage` to `ProductGrid.onPageChange`

## 4.15 ProductDetailPage

- [ ] Create `apps/mfe-catalog/src/components/ProductDetail/ProductDetailPage.tsx`:
  - Reads `id` from `useParams`
  - Calls `useProduct(id!)`
  - Loading state: pulsing skeleton layout
  - Error / not-found state: message + relative "Back to catalog" link (`to=".."`, `relative="path"`)
  - Loaded state: image (or placeholder), category badge, product name (h1), description, price with AED, "Add to cart" button dispatching `cart:add-item` CustomEvent

## 4.16 Test infrastructure

- [ ] Create `apps/mfe-catalog/src/test/mswServer.ts`:
  - MSW `setupServer` with two handlers: `graphql.query('Products', ...)` returning 1 mock product; `graphql.query('Product', ...)` returning the same product for id `'prod-1'` and `null` for unknown ids
- [ ] Create `apps/mfe-catalog/src/test/setup.ts`:
  - Imports `@testing-library/jest-dom`
  - Imports and starts `server` from `mswServer`; `beforeAll`, `afterEach`, `afterAll` lifecycle calls
- [ ] Create `apps/mfe-catalog/src/test/utils.tsx`:
  - `createTestQueryClient()` — `retry: false`, `gcTime: Infinity`
  - `AllProviders` wrapper: `QueryClientProvider` + `MemoryRouter`
  - `renderWithProviders(ui, options?)` — calls `render` with `AllProviders` wrapper

## 4.17 Component tests

### FilterBar tests
- [ ] Create `apps/mfe-catalog/src/__tests__/components/FilterBar.test.tsx`:
  - [ ] **AC-FB-1** Renders Category and Sort by pills
  - [ ] **AC-FB-2** Clicking Category pill opens a `role="listbox"` dropdown
  - [ ] **AC-FB-3** Selecting "Electronics" from the dropdown sets category in store and closes dropdown
  - [ ] **AC-FB-4** Active filter pill has visually distinct (link-coloured) styling

### ProductCard tests
- [ ] Create `apps/mfe-catalog/src/__tests__/components/ProductCard.test.tsx`:
  - [ ] **AC-PC-1** Renders product name and formatted price
  - [ ] **AC-PC-2** Clicking "Add to cart" dispatches a `cart:add-item` CustomEvent with `productId, productName, price, quantity: 1`
  - [ ] **AC-PC-3** Wishlist button has `aria-pressed="false"` by default; toggles to `aria-pressed="true"` on click
  - [ ] **AC-PC-4** Wishlist button click does not trigger Link navigation

### ProductGrid tests
- [ ] Create `apps/mfe-catalog/src/__tests__/components/ProductGrid.test.tsx`:
  - [ ] **AC-PG-1** Shows 10 elements with `aria-label="Loading product"` when `isLoading=true`
  - [ ] **AC-PG-2** Renders a product card for each item in `products` array
  - [ ] **AC-PG-3** Pagination controls are absent when `totalPages = 1`
  - [ ] **AC-PG-4** Previous button is disabled when `currentPage = 0`
  - [ ] **AC-PG-5** Clicking Next calls `onPageChange(1)` when on page 0

### SearchBar tests
- [ ] Create `apps/mfe-catalog/src/__tests__/components/SearchBar.test.tsx`:
  - [ ] **AC-SB-1** Renders an `<input type="search">` with `aria-label="Search products"`
  - [ ] **AC-SB-2** `onChange` is NOT called synchronously after typing a single character
  - [ ] **AC-SB-3** `onChange` is called once after the debounce timer fires (use `vi.useFakeTimers`)
  - [ ] **AC-SB-4** Rapid successive keystrokes produce only one `onChange` call

### StoreRow tests
- [ ] Create `apps/mfe-catalog/src/__tests__/components/StoreRow.test.tsx`:
  - [ ] **AC-SR-1** All 4 mock store names are present in the rendered output
  - [ ] **AC-SR-2** Each store card contains a "Visit shop" link
  - [ ] **AC-SR-3** Scroll button has `aria-label="Scroll stores right"` and is focusable

## 4.18 Hook tests

### useProducts tests
- [ ] Create `apps/mfe-catalog/src/__tests__/hooks/useProducts.test.ts`:
  - [ ] **AC-HP-1** Returns `data.products.content` with 1 item after MSW responds
  - [ ] **AC-HP-2** `isLoading` is true before MSW responds
  - [ ] **AC-HP-3** Changing `filter.query` produces a different `queryKey` (verified via cache keys)

### useProduct tests
- [ ] Create `apps/mfe-catalog/src/__tests__/hooks/useProduct.test.ts`:
  - [ ] **AC-UPD-1** Returns product data for `id = 'prod-1'`
  - [ ] **AC-UPD-2** Returns `null` for an unknown product id
  - [ ] **AC-UPD-3** Query is not fired when `id` is `''` (enabled guard)

## 4.19 Acceptance checks

- [ ] **AC-1** `npm run dev` from `apps/mfe-catalog/` starts on port 3001 without errors
- [ ] **AC-2** `http://localhost:3001` renders the catalog page: search bar, filter pills, store row, product grid
- [ ] **AC-3** `http://localhost:3001/remoteEntry.js` is served (Module Federation entry point accessible)
- [ ] **AC-4** With API Gateway running, product grid shows real products from `localhost:8080/graphql`
- [ ] **AC-5** Typing in the search bar triggers a new GraphQL query after 300 ms; rapid keystrokes collapse to one request
- [ ] **AC-6** Selecting a category filter re-queries; grid shows only matching products
- [ ] **AC-7** Clicking a product card navigates to `product/:id` under the current mount path and the detail page renders correctly
- [ ] **AC-8** "Add to cart" button (on both card and detail page) dispatches `cart:add-item` CustomEvent; verified in browser console via `window.addEventListener('cart:add-item', console.log)`
- [ ] **AC-9** Wishlist button toggles heart icon fill and `aria-pressed` state
- [ ] **AC-10** Product grid shows skeleton cards while the query is in flight
- [ ] **AC-11** Pagination controls appear and function correctly when `totalPages > 1`
- [ ] **AC-12** Grid is visually responsive across breakpoints (verify with browser devtools)
- [ ] **AC-13** `npm run test` — all test suites pass with zero failures
- [ ] **AC-14** `npm run typecheck` — exits with zero TypeScript errors
- [ ] **AC-15** `npm run build` produces `dist/remoteEntry.js`
- [ ] **AC-16** Styling is implemented with Tailwind utility classes and theme tokens; no component-level CSS files are needed beyond `src/index.css`
