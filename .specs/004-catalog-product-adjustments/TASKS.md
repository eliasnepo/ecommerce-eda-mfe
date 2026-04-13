# Tasks - Spec 004 (Catalog + Product Service Adjustments)

**Spec:** `SPEC.md`  
**Related specs:** `.specs/001-product-service/SPEC.md`, `.specs/003-catalog-mfe/SPEC.md`  
**Last updated:** 2026-04-12

Check off each task as it is completed. Tasks are ordered by implementation sequence.

---

## 4.1 Product Service - GraphQL contract updates

- [ ] Update `apps/product-service/src/main/resources/graphql/schema.graphqls`:
  - [ ] Add `ProductSortBy` enum (`RELEVANCE`, `PRICE_ASC`, `PRICE_DESC`)
  - [ ] Add optional `sortBy: ProductSortBy` to `ProductFilter`
- [ ] Add backend enum for sort handling (for example `apps/product-service/src/main/java/com/ecommerce/product/service/ProductSortBy.java`)
- [ ] Update `apps/product-service/src/main/java/com/ecommerce/product/service/ProductFilter.java` to include `sortBy`

## 4.2 Product Service - Search sorting and fuzzy behavior

- [ ] Update `apps/product-service/src/main/java/com/ecommerce/product/service/ProductService.java`:
  - [ ] Resolve null/absent `sortBy` to `RELEVANCE`
  - [ ] Apply ES sort by `price` ascending when `PRICE_ASC`
  - [ ] Apply ES sort by `price` descending when `PRICE_DESC`
  - [ ] Add stable tie-breaker sort for equal price values
  - [ ] Keep default relevance ranking when `RELEVANCE`
  - [ ] Enable fuzzy matching on text query (`fuzziness: AUTO`) while keeping field boosts (`name` > `description`)
- [ ] Ensure category and price range filters still combine correctly with fuzzy query logic

## 4.3 Product Service - Seeder image improvements

- [ ] Update `apps/product-service/src/main/java/com/ecommerce/product/seed/ProductDataSeeder.java`:
  - [ ] Add curated real internet image URL lists (HTTPS) for product categories/keywords
  - [ ] Implement deterministic image selection strategy
  - [ ] Keep existing `placehold.co` URL generation as fallback
  - [ ] Ensure every seeded product still gets a valid `imageUrl`

## 4.4 Catalog MFE - Send sort to backend

- [ ] Update `apps/mfe-catalog/src/api/queries/products.gql.ts`:
  - [ ] Include `sortBy` in `ProductsQueryVariables.filter`
  - [ ] Keep query name and response shape unchanged
- [ ] Update `apps/mfe-catalog/src/hooks/useProducts.ts`:
  - [ ] Pass `sortBy` from filter state into GraphQL variables
  - [ ] Keep query key aligned with variables so cache partitions by sort mode
- [ ] Verify `apps/mfe-catalog/src/components/FilterBar/FilterBar.tsx` sort values map correctly to GraphQL enum payload (or add mapping helper)

## 4.5 Catalog MFE - USD price formatting

- [ ] Add shared formatter utility (for example `apps/mfe-catalog/src/utils/formatPrice.ts`) using `Intl.NumberFormat` with `USD`
- [ ] Update `apps/mfe-catalog/src/components/ProductGrid/ProductCard.tsx` to render USD formatted values
- [ ] Update `apps/mfe-catalog/src/components/ProductDetail/ProductDetailPage.tsx` to render USD formatted values
- [ ] Remove remaining `AED` text from Catalog product card/detail views

## 4.6 Product Service tests

- [ ] Update `apps/product-service/src/test/java/com/ecommerce/product/service/ProductServiceTest.java`:
  - [ ] Add/adjust test for price ascending sort behavior
  - [ ] Add/adjust test for price descending sort behavior
  - [ ] Add/adjust fuzzy search test (`wirels` -> `wireless`)
- [ ] Update `apps/product-service/src/test/java/com/ecommerce/product/controller/ProductControllerTest.java` to include `sortBy` in GraphQL filter request coverage
- [ ] Update `apps/product-service/src/test/java/com/ecommerce/product/integration/ProductIntegrationTest.java`:
  - [ ] Verify fuzzy search works with Elasticsearch container
  - [ ] Verify price sort ordering works with persisted products

## 4.7 Catalog MFE tests

- [ ] Update `apps/mfe-catalog/src/__tests__/hooks/useProducts.test.ts` to cover `sortBy` in query key/variables
- [ ] Update `apps/mfe-catalog/src/__tests__/components/ProductCard.test.tsx` to assert USD rendering
- [ ] Update/add test for `apps/mfe-catalog/src/components/ProductDetail/ProductDetailPage.tsx` USD rendering (component or integration-level)
- [ ] Update integration test assertions in `apps/mfe-catalog/src/__tests__/integration/catalog.integration.test.tsx` to validate sort request payload includes selected sort mode

## 4.8 Acceptance checks

- [ ] **AC-1** Product query sorted with `sortBy: PRICE_ASC` returns non-decreasing prices
- [ ] **AC-2** Product query sorted with `sortBy: PRICE_DESC` returns non-increasing prices
- [ ] **AC-3** Product query with `filter.query = "wirels"` returns at least one `wireless` product
- [ ] **AC-4** Catalog displays prices in USD in grid and detail pages
- [ ] **AC-5** Catalog sort selector changes outbound GraphQL `filter.sortBy` value
- [ ] **AC-6** Local seeded products use real external image URLs when available and fallback placeholder URLs otherwise
- [ ] **AC-7** `./gradlew test` passes in `apps/product-service`
- [ ] **AC-8** `npm run test` and `npm run typecheck` pass in `apps/mfe-catalog`

## 4.9 Catalog MFE - Card consistency and Store section removal

- [ ] Update `apps/mfe-catalog/src/components/ProductGrid/ProductCard.tsx`:
  - [ ] Keep cards at consistent height regardless of name length
  - [ ] Keep image container at consistent fixed size and crop image to fit
  - [ ] Truncate long names with ellipsis
  - [ ] Expose full product name on hover
- [ ] Update `apps/mfe-catalog/src/components/ProductGrid/ProductGrid.tsx` to ensure card containers stretch consistently inside the grid
- [ ] Remove Store section from `apps/mfe-catalog/src/components/CatalogPage.tsx`
- [ ] Remove obsolete StoreRow artifacts if unused (`components/StoreRow/*`, related tests/types)
- [ ] Update tests:
  - [ ] `apps/mfe-catalog/src/__tests__/components/ProductCard.test.tsx` for truncate + hover-full-name behavior
  - [ ] `apps/mfe-catalog/src/__tests__/integration/catalog.integration.test.tsx` to stop expecting Store section
- [ ] **AC-9** Catalog cards stay visually uniform with long/short product names
- [ ] **AC-10** Store section is not rendered in Catalog UI
- [ ] **AC-11** Product-card image frames remain equal size and crop oversized images
