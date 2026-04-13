# Tasks - Spec 006 (UI Refactor Across MFEs)

**Spec:** `SPEC.md`  
**Design doc:** `docs/DESIGN_DOC.md`  
**UI references:** `docs/ui_styling.json`, `docs/product_details.json`, `docs/cart_design.json`  
**Last updated:** 2026-04-13

Check off each task as it is completed. Tasks are ordered by implementation sequence and grouped by frontend ownership.

---

## 6.1 Design artifact updates

- [ ] Create `docs/ui_styling.json` using Image 1 as the source.
- [ ] Create `docs/product_details.json` using Image 2 as the source.
- [ ] Update `docs/cart_design.json` using Image 3 as the source.
- [ ] Ensure all three JSON files include design tokens and responsive guidance.

## 6.2 `mfe-shell` Tailwind setup

- [ ] Add dev dependencies to `apps/mfe-shell/package.json`:
  - [ ] `tailwindcss`
  - [ ] `postcss`
  - [ ] `autoprefixer`
  - [ ] `postcss-loader`
- [ ] Create `apps/mfe-shell/tailwind.config.ts` with semantic theme tokens from `docs/ui_styling.json`.
- [ ] Create `apps/mfe-shell/postcss.config.cjs` with `tailwindcss` + `autoprefixer` plugins.
- [ ] Create `apps/mfe-shell/src/index.css` with Tailwind directives.
- [ ] Update shell bootstrap imports to use Tailwind base entry.
- [ ] Update `apps/mfe-shell/webpack.config.js` CSS rule to include `postcss-loader`.

## 6.3 `mfe-shell` header redesign

- [ ] Refactor `apps/mfe-shell/src/components/Header.tsx` to include:
  - [ ] Shopcart brand area
  - [ ] nav items (`Categories`, `Deals`, `What's New`, `Delivery`)
  - [ ] shell search field in the menu bar
  - [ ] account icon/label action
  - [ ] cart icon/label with badge
- [ ] Ensure desktop, tablet, and mobile responsive behavior follows `docs/ui_styling.json`.
- [ ] Replace classnames from legacy CSS with Tailwind utility classes.

## 6.4 `mfe-shell` search communication channel

- [ ] Create `apps/mfe-shell/src/search/searchTypes.ts` with event constants and payload types:
  - [ ] `catalog:search-query:set`
  - [ ] `catalog:search-query:request`
  - [ ] `catalog:search-query:state`
- [ ] Create `apps/mfe-shell/src/search/useSearchStore.ts` for canonical shell query state.
- [ ] Create `apps/mfe-shell/src/search/searchEventBridge.ts` that:
  - [ ] listens for `catalog:search-query:request`
  - [ ] emits `catalog:search-query:state`
  - [ ] emits initial state on shell start
- [ ] Wire search bridge in `apps/mfe-shell/src/App.tsx` lifecycle.
- [ ] Debounce shell search typing before dispatching search events.

## 6.5 `mfe-shell` cart hover preview

- [ ] Create `apps/mfe-shell/src/components/CartPreviewPopover.tsx`.
- [ ] Render latest cart items, item count, and subtotal in preview modal.
- [ ] Add CTA actions (`View Cart`, `Checkout`) linking to `/cart`.
- [ ] Integrate popover with header cart icon.
- [ ] Support open on hover and focus.
- [ ] Support close on pointer leave, blur, and `Escape` key.

## 6.6 `mfe-catalog` shell-driven search integration

- [ ] Create `apps/mfe-catalog/src/integration/searchChannel.ts`.
- [ ] On catalog mount, dispatch `catalog:search-query:request`.
- [ ] Subscribe to `catalog:search-query:state` and apply `setQuery` in `filterStore`.
- [ ] Handle `catalog:search-query:set` for immediate updates.
- [ ] Remove/disable direct search bar ownership from catalog page composition.

## 6.7 `mfe-catalog` search page layout refactor

- [ ] Create banner component (for example `apps/mfe-catalog/src/components/Banner/Banner.tsx`).
- [ ] Update `apps/mfe-catalog/src/components/CatalogPage.tsx` to render exactly:
  - [ ] banner
  - [ ] filters
  - [ ] products
- [ ] Restyle `FilterBar` controls to gray rounded pills matching `docs/ui_styling.json`.
- [ ] Keep sort control aligned to the right on large screens.
- [ ] Restyle product grid cards (`ProductCard.tsx`) to new card anatomy and button styling.

## 6.8 `mfe-catalog` product details redesign

- [ ] Refactor `apps/mfe-catalog/src/components/ProductDetail/ProductDetailPage.tsx` to match `docs/product_details.json`.
- [ ] Add breadcrumb row at the top of detail page.
- [ ] Add thumbnail gallery and active thumbnail state.
- [ ] Add color swatch selection UI and selected state ring.
- [ ] Add quantity stepper UI and low-stock notice.
- [ ] Add dual CTA row (`Buy Now`, `Add to Cart`).
- [ ] Keep `cart:add-item` dispatch contract; include selected quantity.
- [ ] Add delivery and return info cards.

## 6.9 `mfe-cart` Tailwind setup

- [ ] Add dev dependencies to `apps/mfe-cart/package.json`:
  - [ ] `tailwindcss`
  - [ ] `postcss`
  - [ ] `autoprefixer`
  - [ ] `postcss-loader`
- [ ] Create `apps/mfe-cart/tailwind.config.ts` with semantic tokens from `docs/cart_design.json`.
- [ ] Create `apps/mfe-cart/postcss.config.cjs`.
- [ ] Create `apps/mfe-cart/src/index.css` with Tailwind directives.
- [ ] Update cart bootstrap imports to use Tailwind base entry.
- [ ] Update `apps/mfe-cart/webpack.config.js` CSS rule to include `postcss-loader`.

## 6.10 `mfe-cart` page redesign

- [ ] Refactor `apps/mfe-cart/src/pages/CartPage.tsx` into review/payment split layout.
- [ ] Implement `Review Item And Shipping` block using cart item snapshot data.
- [ ] Implement `Delivery Information` block with editable action placeholder.
- [ ] Implement right-column `Order Summery` coupon row.
- [ ] Implement `Payment Details` radio list and default selected method.
- [ ] Implement payment card form fields per `docs/cart_design.json`.
- [ ] Keep existing order submission integration (`placeOrder`) and confirmation routing.
- [ ] Ensure empty-cart state still renders with updated styling.

## 6.11 Shared UI and formatting updates

- [ ] Standardize currency formatting usage to USD in all catalog/cart product prices.
- [ ] Ensure typography and spacing tokens align with `Poppins` based scale.
- [ ] Remove obsolete style files/classes that are no longer used after Tailwind migration.

## 6.12 Shell tests

- [ ] Update/create `apps/mfe-shell/src/__tests__/header.test.tsx`:
  - [ ] renders Shopcart header structure
  - [ ] renders shell search bar
  - [ ] renders cart badge
- [ ] Update/create `apps/mfe-shell/src/__tests__/searchEventBridge.test.ts`:
  - [ ] request event receives current state
  - [ ] set event updates and rebroadcasts state
- [ ] Update/create `apps/mfe-shell/src/__tests__/cartPreviewPopover.test.tsx`:
  - [ ] opens on hover/focus
  - [ ] closes on Escape

## 6.13 Catalog tests

- [ ] Update/create `apps/mfe-catalog/src/__tests__/components/CatalogPage.test.tsx`:
  - [ ] asserts section order banner -> filters -> products
- [ ] Update/create `apps/mfe-catalog/src/__tests__/integration/searchChannel.test.ts`:
  - [ ] query request emitted on mount
  - [ ] shell state event updates filter store
- [ ] Update/create `apps/mfe-catalog/src/__tests__/components/ProductDetailPage.test.tsx`:
  - [ ] color and quantity controls render
  - [ ] add-to-cart emits expected payload

## 6.14 Cart tests

- [ ] Update/create `apps/mfe-cart/src/__tests__/cartPage.test.tsx`:
  - [ ] review + payment split layout renders
  - [ ] coupon row renders
  - [ ] payment method switching works
- [ ] Update/create `apps/mfe-cart/src/__tests__/checkoutFlow.test.tsx`:
  - [ ] place order success navigates to confirmation
  - [ ] failure state shows recoverable error message

## 6.15 Quality gates

- [ ] Run in `apps/mfe-shell`:
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run build`
- [ ] Run in `apps/mfe-catalog`:
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run build`
- [ ] Run in `apps/mfe-cart`:
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run build`

## 6.16 Manual acceptance checklist

- [ ] **AC-1** Shell header includes menu links, search bar, account, and cart icon.
- [ ] **AC-2** Typing search in shell updates catalog results.
- [ ] **AC-3** Catalog page order is banner, filters, products on first render.
- [ ] **AC-4** Cart preview popover appears when hovering/focusing cart icon.
- [ ] **AC-5** Product detail page follows `docs/product_details.json` structure.
- [ ] **AC-6** Cart/checkout page follows `docs/cart_design.json` structure.
- [ ] **AC-7** No full page reload when navigating across shell/catalog/cart routes.
- [ ] **AC-8** Existing cart event synchronization remains correct.
- [ ] **AC-9** All three MFEs pass type checks, tests, and builds.
