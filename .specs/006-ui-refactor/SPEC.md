# Implementation Spec - Spec 006 (UI Refactor Across MFEs)

**Status:** Ready for implementation  
**Design doc:** `docs/DESIGN_DOC.md`  
**Product requirements:** `docs/PRD.md`  
**UI references:** `docs/ui_styling.json`, `docs/product_details.json`, `docs/cart_design.json`  
**Related specs:** `.specs/003-catalog-mfe/SPEC.md`, `.specs/005-shell-cart-mfe/SPEC.md`  
**Last updated:** 2026-04-13

---

## Spec 006 - Shopcart UI and UX Refactor

### Goal

Refactor all relevant frontend micro-frontends (`mfe-shell`, `mfe-catalog`, `mfe-cart`) to match the new Shopcart-inspired visual language and interaction model from the provided references.

Primary outcomes:

1. **Global styling refresh** for components and layout using the design direction in `docs/ui_styling.json`.
2. **Catalog search page vertical structure** must be: `banner -> filters -> products`.
3. **Cart icon in shell header** opens a compact hover/focus modal preview.
4. **Search input lives in shell menu bar** and synchronizes with Catalog via cross-MFE communication.
5. **Product details page redesign** following `docs/product_details.json`.
6. **Cart and checkout redesign** following `docs/cart_design.json`.

### Mandatory styling rule

Tailwind remains mandatory.

- Continue to use Tailwind utility classes and semantic theme tokens.
- Avoid introducing new component-scoped CSS for main UI surfaces.
- For `mfe-shell` and `mfe-cart`, migrate current CSS-heavy rendering to Tailwind-based composition.

---

## 1) Scope and boundaries

### In scope

- UI and layout refactor across:
  - `apps/mfe-shell`
  - `apps/mfe-catalog`
  - `apps/mfe-cart`
- New shell header composition (brand, nav, search, account/cart actions).
- Catalog listing structure and component restyling.
- Product detail page structure and styling updates.
- Cart page/checkout structure and styling updates.
- Search query synchronization contract between shell and catalog.
- Cart hover preview modal behavior in shell.
- Frontend tests updated for the new structure and interactions.

### Out of scope

- Backend API schema changes.
- Order domain business rule changes.
- Authentication/authorization implementation.
- Server-side cart persistence changes.
- New payment processor integrations.

---

## 2) Affected areas

### Shell (`apps/mfe-shell`)

- Header layout and navigation behavior.
- Cart preview modal anchored to cart icon.
- Search bar placement in header.
- Cross-MFE search event bridge and state store.
- Tailwind setup + tokenization (replace plain CSS-driven approach).

### Catalog (`apps/mfe-catalog`)

- Catalog page composition order (`banner`, `filters`, `products`).
- Search ownership shift (shell-driven query input).
- Product cards and filter controls restyled to new visual language.
- Product detail page rebuilt from `docs/product_details.json`.

### Cart (`apps/mfe-cart`)

- Cart/checkout layout rebuilt from `docs/cart_design.json`.
- Item review + delivery information split layout.
- Order summary + payment details UI.
- Tailwind-based component styling replacing CSS classes.

---

## 3) Architectural decisions

### 3.1 Shell owns global search query

To place search in the shell menu bar while keeping catalog data logic inside Catalog MFE, shell becomes the canonical owner of current query text.

Benefits:

- Search is always visible and persistent across route transitions.
- Catalog can mount/unmount without losing current query context.
- Keeps remote responsibilities clear (shell orchestrates global UI state; catalog renders products).

### 3.2 Cross-MFE search event contracts

Use `window` `CustomEvent` contracts, mirroring existing cart event style:

```ts
type CatalogSearchSetDetail = {
  query: string
  source: 'shell_header'
  updatedAt: string
}

type CatalogSearchStateDetail = {
  query: string
  updatedAt: string
}
```

Events:

- `catalog:search-query:set` (Shell -> Catalog)
- `catalog:search-query:request` (Catalog -> Shell)
- `catalog:search-query:state` (Shell -> all listeners)

Rules:

- Shell is the canonical writer for search state snapshots.
- Catalog dispatches `catalog:search-query:request` on mount.
- Shell broadcasts `catalog:search-query:state` on startup and each query change.

### 3.3 Cart preview behavior belongs to shell

Shell already owns canonical cart state. The hover/focus mini-modal uses shell store snapshots and does not require cart remote mounting.

Preview requirements:

- Trigger: mouse hover and keyboard focus.
- Content: up to 3 latest items, subtotal, item count.
- Actions: `View Cart` (`/cart`) and `Checkout` (`/cart`).
- A11y: ESC closes modal, focus trap not required, but popover must be keyboard reachable.

---

## 4) Design system requirements (all MFEs)

Source of truth:

- Global style direction: `docs/ui_styling.json`
- Product details: `docs/product_details.json`
- Cart/checkout: `docs/cart_design.json`

Implementation requirements:

- Typography family: `Poppins, sans-serif` across shell/catalog/cart.
- Primary accent: deep green (`brand_primary` / `accent_primary` tokens).
- Neutral backgrounds and rounded surfaces.
- Unified pill controls for search/filters/buttons.
- Product pricing displayed in USD format.

Tailwind requirements:

- `mfe-shell` and `mfe-cart` must add Tailwind + PostCSS setup similar to Catalog.
- Define semantic color/radius/shadow keys in each app Tailwind config.
- Prefer semantic utility usage (`bg-page-bg`, `text-primary`, etc.) over ad-hoc hex classes.

---

## 5) Shell implementation specification (`apps/mfe-shell`)

### 5.1 Tailwind adoption

- Add `tailwindcss`, `postcss`, `autoprefixer`, `postcss-loader` dev dependencies.
- Create `tailwind.config.ts` and `postcss.config.cjs`.
- Replace CSS-only style entry with Tailwind directives in `src/index.css`.
- Keep minimal global reset only if necessary.

### 5.2 Header and navigation redesign

- Rebuild `Header.tsx` to include:
  - Shopcart brand area
  - Nav links (`Categories`, `Deals`, `What's New`, `Delivery`)
  - Search input centered/right in menu bar
  - Account action
  - Cart icon with badge
- Maintain responsive behavior from `docs/ui_styling.json`.

### 5.3 Search query store and bridge

- Add shell search state module (for example `src/search/`).
- Implement event bridge handling:
  - `catalog:search-query:request`
  - broadcasting `catalog:search-query:state`
- Debounce header input updates before emitting `catalog:search-query:set`.

### 5.4 Cart hover modal

- Implement header cart popover component (for example `CartPreviewPopover.tsx`).
- Read cart items and totals from shell cart store selectors.
- Keep existing cart badge behavior.
- Ensure hover and focus interaction parity.

---

## 6) Catalog implementation specification (`apps/mfe-catalog`)

### 6.1 Search page structure

`CatalogPage` must render in this order:

1. `BannerSection`
2. `FilterBar`
3. `ProductGrid`

Remove inline top search input from Catalog page because shell now owns visible query input.

### 6.2 Shell-driven search integration

- Add catalog-side search channel (for example `src/integration/searchChannel.ts`).
- On mount:
  - dispatch `catalog:search-query:request`
  - subscribe to `catalog:search-query:state`
  - update `filterStore.setQuery(...)` on incoming state.
- Accept `catalog:search-query:set` events directly for low-latency updates.

### 6.3 Banner + filters + products restyling

- Build hero banner section matching `docs/ui_styling.json` (`Grab Upto 50% Off ...`).
- Update filter pills to gray rounded pills with right-aligned sort control.
- Restyle product cards (image slab, heart icon, green stars, outlined add-to-cart button).
- Keep existing behavior for pagination, filtering, add-to-cart dispatch.

### 6.4 Product details page redesign

Rebuild `ProductDetailPage.tsx` to follow `docs/product_details.json`:

- Breadcrumb row.
- Two-column desktop layout (gallery left, details right).
- Large hero image + thumbnail strip.
- Product title, description, rating, large price/installment text.
- Color swatches, quantity stepper, stock warning.
- `Buy Now` + `Add to Cart` dual CTA row.
- Delivery/return info cards.

Behavioral requirements:

- `Add to Cart` keeps existing `cart:add-item` event contract.
- Quantity control affects added quantity.
- On mobile, layout stacks cleanly with no horizontal overflow.

---

## 7) Cart implementation specification (`apps/mfe-cart`)

### 7.1 Tailwind adoption

- Add Tailwind and PostCSS toolchain to cart app.
- Replace `src/styles/cart.css`-driven component styling with Tailwind classes.
- Keep only minimal global base file (`index.css`) for Tailwind directives.

### 7.2 Cart/checkout page redesign

`CartPage` should follow `docs/cart_design.json`:

- Left column:
  - `Review Item And Shipping` card with featured item row.
  - `Delivery Information` section and edit action.
- Right column:
  - `Order Summery` card with coupon input/apply button.
  - `Payment Details` section with radio options and card fields.
- Primary CTA for final placement.

Implementation notes:

- Keep current cart snapshot as source of truth for item/totals.
- Preserve checkout flow (`placeOrder`) and confirmation route.
- Empty state should still exist, aligned to new design tokens.

### 7.3 Payment section behavior

- Default selected method: `Credit or Debit card`.
- Show/hide card form based on selected method.
- Coupon UI can be non-functional in this phase but must have visible validation state placeholders.

---

## 8) Testing requirements

### Shell tests

- Header renders new nav/search/actions.
- Typing in shell search dispatches search events (debounced).
- Cart hover/focus opens popover and shows item summary.
- Popover actions navigate to `/cart`.

### Catalog tests

- Catalog page order is `banner -> filters -> products`.
- Search updates from shell events call `setQuery` and re-query products.
- Product cards and filter controls render expected UI states.
- Product detail page renders swatches/quantity/dual CTA and dispatches cart event with selected quantity.

### Cart tests

- Cart page renders split layout in desktop and stacked in mobile.
- Payment method switching updates visible fields.
- Coupon row and summary block render correctly.
- Existing checkout success/failure states still function.

---

## 9) Acceptance criteria

1. Shell header matches Shopcart structure and includes search bar in menu area.
2. Catalog page top-to-bottom order is exactly banner, filters, products.
3. Search typed in shell updates catalog results without full page reload.
4. Search state remains consistent when navigating between `/catalog` and `/cart`.
5. Cart icon opens compact preview modal on hover and focus.
6. Cart preview shows current item count and subtotal from shell state.
7. Product detail page layout and interactions match `docs/product_details.json`.
8. Cart page and checkout sections match `docs/cart_design.json`.
9. Tailwind is used as primary styling mechanism in shell, catalog, and cart.
10. No regression in cart event sync (`cart:add-item`, `cart:update-item`, `cart:remove-item`, `cart:state-changed`).
11. All three MFEs pass typecheck, tests, and production builds.

---

## 10) Risks and mitigations

- **Risk:** Search event loops between shell and catalog.  
  **Mitigation:** shell-only canonical search writer and explicit event direction.

- **Risk:** Hover-only cart modal is inaccessible on keyboard/touch.  
  **Mitigation:** support focus trigger and click fallback on small screens.

- **Risk:** Tailwind migration introduces style drift across MFEs.  
  **Mitigation:** enforce shared semantic tokens from JSON references and test visual landmarks.
