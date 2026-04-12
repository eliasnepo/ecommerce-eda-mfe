# mfe-catalog

Catalog Micro-Frontend (MFE) for the ecommerce-eda-mfe platform. This is a React 18 / TypeScript 5 remote application built with Vite and the `@originjs/vite-plugin-federation` Module Federation plugin. It renders the product catalog — browse, search, filter, and view product details — and is consumed by the Shell host at runtime.

---

## Tech Stack

| Concern | Library / Tool |
|---|---|
| UI | React 18.3, TypeScript 5.4 |
| Bundler / Module Federation | Vite 5, `@originjs/vite-plugin-federation` 1.3 |
| Routing | React Router DOM 6 |
| Data fetching | TanStack Query (React Query) v5 |
| GraphQL client | `graphql-request` 7 |
| Client state | `@tanstack/store` 0.5 |
| Styling | Tailwind CSS 3.4, PostCSS, Autoprefixer |
| Testing | Vitest 1, Testing Library (React + user-event), MSW 2 |

---

## Prerequisites

- Node.js 20+ and npm
- Infrastructure running (PostgreSQL, Kafka, Elasticsearch):
  ```bash
  docker compose -f docker-compose.infra.yml up -d
  ```
- Product Service running on `:8081`
- API Gateway running on `:8080`

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the dev server (hot reload, port 3001)
npm run dev
```

The app is available standalone at `http://localhost:3001`.

### Build for Production / Module Federation

```bash
npm run build
```

The build emits a `remoteEntry.js` to `dist/`. Serve the dist folder so the Shell host can load it:

```bash
npm run preview
```

Preview also binds to port 3001 with CORS enabled.

### Type Checking

```bash
npm run typecheck
```

---

## Module Federation Configuration

The remote is configured in `vite.config.ts`:

| Property | Value |
|---|---|
| Remote name | `catalogMfe` |
| Manifest file | `remoteEntry.js` |
| Exposed module | `./App` -> `./src/App.tsx` |
| Dev / preview port | `3001` |

**Shared singletons:** `react`, `react-dom`, `react-router-dom` (required versions `^18.0.0`, `^18.0.0`, `^6.0.0`).

The Shell host must declare this remote as:

```js
remotes: {
  catalogMfe: 'catalogMfe@http://localhost:3001/dist/remoteEntry.js',
}
```

In production, replace the URL with the deployed origin.

---

## Entry Points

| File | Purpose |
|---|---|
| `src/main.tsx` | Standalone bootstrap — dynamic import of `bootstrap.tsx` (required for Module Federation async boundary) |
| `src/bootstrap.tsx` | Mounts `App` inside `StrictMode` + `BrowserRouter` for standalone dev |
| `src/App.tsx` | Root exposed to the Shell; sets up `QueryClientProvider` and React Router routes |

The Shell is expected to provide a surrounding `BrowserRouter`; when loaded as a remote the inner `BrowserRouter` in `bootstrap.tsx` is not used.

---

## Routes

Defined in `src/App.tsx`:

| Path (relative to mount point) | Component |
|---|---|
| `/` (index) | `CatalogPage` — product grid with search, filter, and store row |
| `/product/:id` | `ProductDetailPage` — single product detail with Add to Cart |

---

## Component Overview

### Pages

**`CatalogPage`** (`src/components/CatalogPage.tsx`)
Top-level catalog view. Reads filter state from `filterStore`, fetches a paginated product list via `useProducts`, and composes `SearchBar`, `FilterBar`, `StoreRow`, and `ProductGrid`.

**`ProductDetailPage`** (`src/components/ProductDetail/ProductDetailPage.tsx`)
Fetches a single product via `useProduct(id)`. Shows a loading skeleton while fetching, an error state for unknown products, and a detail card with an "Add to Cart" button. Add to Cart dispatches the `cart:add-item` custom DOM event.

### ProductGrid

| Component | Description |
|---|---|
| `ProductGrid` | Responsive grid (1-5 columns). Shows skeleton cards while loading; renders `ProductCard` links when data is available. Renders page Previous/Next controls when `totalPages > 1`. |
| `ProductCard` | Individual product tile. Displays image (lazy-loaded), name, star rating, price (AED), Add to Cart button (dispatches `cart:add-item`), and a `WishlistButton`. |
| `ProductCardSkeleton` | Animated pulse placeholder rendered while data is loading. |

### FilterBar

| Component | Description |
|---|---|
| `FilterBar` | Toolbar with Category and Sort pill buttons. Manages open/closed state for dropdowns and writes selections to `filterStore`. |
| `FilterPill` | Toggle button styled as a pill; turns blue (active) when a non-default value is selected. Renders its dropdown as children. |
| `FilterDropdown` | A `listbox` of options. Includes an "All" option that clears the selection. |

### SearchBar

`SearchBar` (`src/components/SearchBar/SearchBar.tsx`) — Controlled text input with internal debounce (default 300 ms). Calls `onChange` only after the user stops typing, preventing excessive GraphQL requests.

### StoreRow

| Component | Description |
|---|---|
| `StoreRow` | Horizontally scrollable row of store cards with a scroll-right button. Data is currently mocked (see Implementation Status). |
| `StoreCard` | Card showing store logo placeholder, name, star rating, and a "Visit shop" link. |

### UI Primitives

| Component | Description |
|---|---|
| `StarRating` | Renders 1-5 SVG stars (filled / half / empty) with an optional review count. |
| `WishlistButton` | Heart icon button overlaid on a product image. Toggles local `saved` state; dispatches `preventDefault()` to prevent link navigation. |

---

## API Integration

### GraphQL Client

`src/api/graphqlClient.ts` creates a single `GraphQLClient` instance pointed at `VITE_GRAPHQL_URL` (falls back to `http://localhost:8080/graphql`). All requests go through the API Gateway, which proxies to the Product Service at `:8081`.

### Queries

| File | Operation | Variables |
|---|---|---|
| `src/api/queries/products.gql.ts` | `Products` | `filter: { query, category, minPrice, maxPrice }`, `page`, `size` (default 20) |
| `src/api/queries/product.gql.ts` | `Product` | `id: ID!` |

### Hooks

| Hook | Cache key | Stale time | Notes |
|---|---|---|---|
| `useProducts(filter, page)` | `['products', variables]` | 30 s | Uses `placeholderData` to keep previous results visible during re-fetch |
| `useProduct(id)` | `['product', id]` | 300 s | Disabled when `id` is falsy |

---

## Client State

`src/store/filterStore.ts` holds the global filter state using `@tanstack/store`:

```ts
interface FilterState {
  query: string | undefined
  category: string | undefined
  minPrice: number | undefined
  maxPrice: number | undefined
  sortBy: 'relevance' | 'price_asc' | 'price_desc'
  page: number
}
```

Exported action functions (`setQuery`, `setCategory`, `setPriceRange`, `setSortBy`, `setPage`, `resetFilters`) mutate the store. `setQuery`, `setCategory`, `setPriceRange`, and `setSortBy` reset `page` to 0.

Note: `sortBy` is stored client-side only; it is not currently passed to the GraphQL query.

---

## Cross-MFE Communication

The Catalog MFE does not import from the Cart MFE or Shell. Integration uses browser custom events:

| Event | Dispatched by | Payload |
|---|---|---|
| `cart:add-item` | `ProductCard`, `ProductDetailPage` | `{ productId, productName, price, quantity }` |

The Shell (or Cart MFE) is responsible for listening to `cart:add-item` on `window` and updating the cart state.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_GRAPHQL_URL` | `http://localhost:8080/graphql` | GraphQL endpoint. In production, set to the deployed API Gateway URL. |

Create a `.env.local` file to override for local development:

```
VITE_GRAPHQL_URL=http://localhost:8080/graphql
```

---

## Tailwind Theme

Custom tokens defined in `tailwind.config.ts`:

| Token | Value | Usage |
|---|---|---|
| `primary-text` | `#111827` | Body text, headings |
| `secondary-text` | `#6B7280` | Subtext, placeholders |
| `link` | `#1D4ED8` | Links, active states, CTA buttons |
| `star-filled` | `#F59E0B` | Filled star rating |
| `star-empty` | `#D1D5DB` | Empty star rating |
| `card-bg` | `#FFFFFF` | Card and dropdown backgrounds |
| `page-bg` | `#F0F2F5` | Page background |
| `border` | `#D1D5DB` | Borders throughout |
| `wishlist-icon` | `#9CA3AF` | Default wishlist heart icon |
| `card` (borderRadius) | `12px` | Card corners |
| `pill` (borderRadius) | `999px` | Buttons and inputs |

---

## Testing

Tests live under `src/__tests__/` and use Vitest with jsdom, Testing Library, and MSW for GraphQL interception.

```bash
# Run all unit tests once
npm test

# Watch mode
npm run test:watch

# Optional: browser-based test UI
npm run test:ui

# Integration tests (separate config, not yet fully defined)
npm run test:integration
```

Test setup (`src/test/setup.ts`) starts the MSW server before all tests and resets handlers between tests.

### Test Helpers

| File | Purpose |
|---|---|
| `src/test/mswServer.ts` | MSW server with default `Products` and `Product` GraphQL handlers |
| `src/test/utils.tsx` | `renderWithProviders` — wraps components with `QueryClientProvider` + `MemoryRouter` |

### Existing Test Coverage

| Suite | What is tested |
|---|---|
| `ProductCard.test.tsx` | Renders name/price, dispatches `cart:add-item` event, wishlist toggle, prevents link navigation |
| `ProductGrid.test.tsx` | Grid rendering |
| `FilterBar.test.tsx` | Pill rendering, dropdown open/close, category selection, active styling |
| `SearchBar.test.tsx` | Input rendering |
| `StoreRow.test.tsx` | Store row rendering |
| `useProducts.test.ts` | Returns data, loading state, cache key isolation per filter |
| `useProduct.test.ts` | Single product fetch |

---

## Implementation Status

This application is **functionally complete for Phase 4 (Catalog MFE)** of the PoC. The following items are noted as scaffolded or mocked:

- **StoreRow data is hardcoded.** The `Store` entity and a corresponding API or GraphQL endpoint have not been implemented. `StoreRow` renders four static mock stores.
- **Star ratings on `ProductCard` are hardcoded** to `4` with a display value of `"-"`. The `Product` GraphQL type does not yet include a rating field.
- **`sortBy` filter is client-side only.** The `Products` GraphQL query accepts `filter` but not a sort parameter; sort order changes are not reflected in API results.
- **Wishlist state is local** (`useState` inside `WishlistButton`). There is no persistence or cross-session storage.
- **The `test:integration` script** references a `vitest.integration.config.ts` file that does not yet exist.
- **"View All" links** in `ProductGrid` and `StoreRow` are placeholder `href="#"` anchors.
