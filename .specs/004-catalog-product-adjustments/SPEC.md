# Implementation Spec - Spec 004 (Catalog + Product Service Adjustments)

**Status:** Ready for implementation  
**Related specs:** `.specs/001-product-service/SPEC.md`, `.specs/003-catalog-mfe/SPEC.md`  
**Design doc:** `docs/DESIGN_DOC.md`  
**Last updated:** 2026-04-12

---

## Spec 004 - Catalog and Product Search Quality Improvements

### Goal

Apply targeted improvements across `apps/mfe-catalog` and `apps/product-service` so that:

1. Price sorting works end-to-end.
2. Prices are displayed in USD in the Catalog UI.
3. Seeded products use real internet images, with the current placeholder URL kept as fallback.
4. Product search supports fuzzy matching for typo tolerance (example: `wirels` should match `wireless`).
5. Catalog product cards keep consistent visual height regardless of product name length.
6. The unused Store section is removed from the Catalog page.

### Scope

**In scope**
- Product Service GraphQL contract and search query behavior.
- Product Service local data seeding image URL strategy.
- Catalog MFE GraphQL query variables and price display formatting.
- Catalog MFE card title truncation + full-name hover behavior.
- Catalog MFE removal of unused Store row UI.
- Unit and integration tests affected by these changes.

**Out of scope**
- Currency conversion or FX rate management.
- New product ingestion pipeline or external image crawling.
- Rework of the existing visual design system.

### Affected locations

- `apps/product-service/src/main/resources/graphql/schema.graphqls`
- `apps/product-service/src/main/java/com/ecommerce/product/service/*`
- `apps/product-service/src/main/java/com/ecommerce/product/controller/*`
- `apps/product-service/src/main/java/com/ecommerce/product/seed/ProductDataSeeder.java`
- `apps/product-service/src/test/java/com/ecommerce/product/**`
- `apps/mfe-catalog/src/api/queries/products.gql.ts`
- `apps/mfe-catalog/src/hooks/useProducts.ts`
- `apps/mfe-catalog/src/components/CatalogPage.tsx`
- `apps/mfe-catalog/src/components/ProductGrid/ProductCard.tsx`
- `apps/mfe-catalog/src/components/ProductGrid/ProductGrid.tsx`
- `apps/mfe-catalog/src/components/ProductDetail/ProductDetailPage.tsx`
- `apps/mfe-catalog/src/__tests__/**`

---

## 1) Fix price sorting (end-to-end)

### Problem

Catalog UI exposes sort options (`price_asc`, `price_desc`), but current GraphQL query variables and Product Service search implementation do not apply sorting by price.

### Required behavior

- Selecting **Price: Low to High** sorts results by price ascending.
- Selecting **Price: High to Low** sorts results by price descending.
- Default **Relevance** preserves Elasticsearch relevance ordering.
- Sorting must remain compatible with category, price range, and text query filters.

### Contract changes

Update GraphQL schema:

```graphql
input ProductFilter {
  query: String
  category: String
  minPrice: Float
  maxPrice: Float
  sortBy: ProductSortBy
}

enum ProductSortBy {
  RELEVANCE
  PRICE_ASC
  PRICE_DESC
}
```

`sortBy` is optional for backward compatibility; null/absent must behave as `RELEVANCE`.

### Backend implementation notes

- Extend `ProductFilter` to carry `sortBy`.
- Add a backend enum (for example `ProductSortBy`) and resolve default safely.
- In `ProductService#buildQuery(...)`:
  - Keep existing filter clauses.
  - Apply explicit Elasticsearch sort when `PRICE_ASC`/`PRICE_DESC` is requested.
  - Use a deterministic tie-breaker (for example, `id` ascending) for stable pagination.
  - Do not override relevance sort when `RELEVANCE` is selected.

### Frontend implementation notes

- Include `sortBy` in `PRODUCTS_QUERY` variables payload.
- Ensure `useProducts(...)` includes the selected `sortBy` in the request and query key.

---

## 2) Display prices in USD (Catalog MFE)

### Problem

Catalog UI currently renders prices with `AED` labels.

### Required behavior

- Product cards and product detail page must display prices in USD format.
- Example format: `$99.99`.
- Underlying numeric value from API remains unchanged (display-format change only).

### Implementation notes

- Centralize formatting in a small utility using `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
- Reuse the utility in:
  - `ProductCard`
  - `ProductDetailPage`
- Update component tests to assert USD output.

---

## 3) Use real internet images with fallback (Product Service)

### Problem

Local seeding currently uses only generated placeholder image URLs.

### Required behavior

- Seeder should prefer real product-like image URLs hosted on the internet (HTTPS).
- Keep the current placeholder URL pattern as fallback.
- If no real URL is available for a product, fallback must still produce a valid URL.

### Implementation notes

- In `ProductDataSeeder`:
  - Introduce a deterministic image resolver based on category/name.
  - Maintain curated URL lists per category or keyword (static constants in code are acceptable for this PoC).
  - Reuse current `placehold.co` URL generation as fallback.
- Keep deterministic seed behavior (same input should produce stable output across runs).

---

## 4) Add fuzzy search (Product Service)

### Problem

Search currently uses strict `multi_match` behavior and misses typo-like inputs.

### Required behavior

- Search query `wirels` must return products containing `wireless` in name/description.
- Exact matches should still rank strongly.
- Existing category and price filters continue to work together with fuzzy text search.

### Implementation notes

- In Elasticsearch query construction, enable fuzziness on text query (`AUTO` recommended).
- Keep weighted fields (`name` boosted over `description`).
- Keep current bool/filter structure so structured filters remain exact.

---

## 5) Catalog card consistency and Store section removal (MFE)

### Problem

- Long product names can increase card height and produce uneven rows.
- The Store section is currently mock-only and not part of this software scope.

### Required behavior

- Product cards must keep uniform height in product grids.
- Product card image areas must keep uniform size across cards.
- Product images should use cover-cropping to fit the fixed image frame.
- Product names in cards must use ellipsis truncation when they exceed available width.
- Full product name must remain available on hover.
- Store section must be removed from Catalog page.

### Implementation notes

- Make card layout stretchable and equal-height within the grid row.
- Use a fixed media container height in cards and `object-cover` image behavior.
- Keep product name as single-line truncation (`...`) and expose full name via hover title.
- Remove StoreRow composition from `CatalogPage` and clean dead code/tests.

---

## 6) Testing requirements

### Product Service

- Update unit tests for `ProductService` to cover:
  - `PRICE_ASC` ordering
  - `PRICE_DESC` ordering
  - fuzzy term (for example `wirels`) returning wireless products
- Update integration tests to validate behavior against real Elasticsearch container.
- Update GraphQL controller tests for new `sortBy` filter field.

### Catalog MFE

- Update hook/component tests to confirm:
  - `sortBy` is sent in GraphQL variables.
  - USD formatting is rendered in card and detail views.
  - Long names are truncated and full names are available on hover.
  - Store section is no longer rendered on Catalog page.

---

## 7) Backward compatibility

- Existing clients that do not pass `sortBy` continue to work (default relevance).
- API response shape remains unchanged.
- Database schema migration is not required.

---

## 8) Acceptance criteria

1. Selecting sort by price in Catalog changes result order correctly (asc/desc).
2. Catalog displays prices in USD (no AED labels remain in product card/detail views).
3. Searching for `wirels` returns products containing `wireless`.
4. Local seeded products use real external image URLs when available.
5. Placeholder URL pattern remains available as fallback for unmapped images.
6. `apps/product-service` and `apps/mfe-catalog` tests pass after updates.
7. Catalog product cards maintain consistent size for mixed name lengths.
8. Store section is absent from Catalog UI.
9. Catalog product card images keep identical frame size and are cropped to fit.
