# Tasks - Spec 005 (Phase 5: Shell + Cart MFE)

**Spec:** `SPEC.md`  
**Design doc:** `docs/DESIGN_DOC.md`  
**Product requirements:** `docs/PRD.md`  
**UI design references:** `docs/search_page_design.json`, `docs/cart_design.json`  
**Last updated:** 2026-04-12

Check off each task as it is completed. Tasks are ordered by implementation sequence and grouped by app responsibility.

---

## 5.1 Workspace scaffold and directories

- [ ] Create `apps/mfe-shell/`
- [ ] Create `apps/mfe-cart/`
- [ ] Ensure both apps have isolated dependency trees (`package.json`) and can be installed independently
- [ ] Add app-local `README.md` files documenting run/build/test commands and env vars

## 5.2 `mfe-shell` package and TypeScript setup

- [ ] Create `apps/mfe-shell/package.json` with scripts:
  - [ ] `dev` (`webpack serve --mode development --port 3000`)
  - [ ] `build` (`webpack --mode production`)
  - [ ] `start` (`webpack serve --mode production --port 3000`)
  - [ ] `test` (`vitest run`)
  - [ ] `test:watch` (`vitest`)
  - [ ] `typecheck` (`tsc --noEmit`)
- [ ] Add runtime dependencies: `react`, `react-dom`, `react-router-dom`
- [ ] Add dev dependencies: `webpack`, `webpack-cli`, `webpack-dev-server`, `typescript`, `ts-loader`, `html-webpack-plugin`, `style-loader`, `css-loader`, `dotenv`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- [ ] Create `apps/mfe-shell/tsconfig.json` (strict TypeScript, JSX React, ES module target compatible with Webpack 5)
- [ ] Create `apps/mfe-shell/tsconfig.node.json` for tool config compilation if needed

## 5.3 `mfe-shell` webpack and env configuration

- [ ] Create `apps/mfe-shell/webpack.config.js` with:
  - [ ] Webpack Module Federation host config (`name: 'shell'`)
  - [ ] `remotes.catalogMfe` mapped to env-based URL (default `http://localhost:3001/remoteEntry.js`)
  - [ ] `remotes.cartMfe` mapped to env-based URL (default `http://localhost:3002/remoteEntry.js`)
  - [ ] shared singletons: `react`, `react-dom`, `react-router-dom`
  - [ ] `devServer.port = 3000`
  - [ ] `historyApiFallback = true`
  - [ ] permissive local CORS response header for remote loading
  - [ ] `output.publicPath = 'auto'`
- [ ] Create `apps/mfe-shell/.env.example` with:
  - [ ] `CATALOG_REMOTE_URL=http://localhost:3001/remoteEntry.js`
  - [ ] `CART_REMOTE_URL=http://localhost:3002/remoteEntry.js`
  - [ ] `CART_STORAGE_KEY=ecom.cart.v1`
- [ ] Create `apps/mfe-shell/public/index.html` with root mount node

## 5.4 `mfe-shell` app entry, routes, and remote declarations

- [ ] Create `apps/mfe-shell/src/index.tsx` as shell bootstrap entry
- [ ] Create `apps/mfe-shell/src/remotes.d.ts` declaring modules:
  - [ ] `catalogMfe/App`
  - [ ] `cartMfe/App`
- [ ] Create `apps/mfe-shell/src/App.tsx` with shell-level route composition
- [ ] Create route setup (`apps/mfe-shell/src/routing/AppRoutes.tsx`):
  - [ ] `/` redirects to `/catalog`
  - [ ] `/catalog/*` lazy-loads `catalogMfe/App`
  - [ ] `/cart/*` lazy-loads `cartMfe/App`
  - [ ] wildcard route renders host-level not found
- [ ] Add `Suspense` fallback wrappers for both remotes
- [ ] Add route-level error boundary component for remote load failure

## 5.5 `mfe-shell` layout, header, and navigation

- [ ] Create `apps/mfe-shell/src/components/ShellLayout.tsx` (header + main outlet)
- [ ] Create `apps/mfe-shell/src/components/Header.tsx` with:
  - [ ] brand title
  - [ ] nav links to `/catalog` and `/cart`
  - [ ] cart badge showing total item count
  - [ ] active-link and keyboard-focus styling
- [ ] Create fallback UI component (`RemoteFallback.tsx`) for lazy remotes
- [ ] Add shell styles (`src/styles/tokens.css`, `src/styles/app.css`) aligned with docs tokens

## 5.6 `mfe-shell` cart domain model and reducer

- [ ] Create `apps/mfe-shell/src/cart/cartTypes.ts` defining:
  - [ ] `CartItem`
  - [ ] `CartState`
  - [ ] derived totals contract (`totalItems`, `subtotal`)
- [ ] Create `apps/mfe-shell/src/cart/cartReducer.ts` with pure operations:
  - [ ] add item (merge quantities when product already exists)
  - [ ] update item quantity
  - [ ] remove item
  - [ ] clear cart
- [ ] Ensure quantity <= 0 removes item
- [ ] Ensure currency is fixed to USD for phase consistency

## 5.7 `mfe-shell` cart storage and hydration

- [ ] Create `apps/mfe-shell/src/cart/cartStorage.ts` with:
  - [ ] `loadCartState()` from `sessionStorage`
  - [ ] `saveCartState()` to `sessionStorage`
  - [ ] safe parse fallback to empty state on corrupted data
- [ ] Wire hydration at shell app start
- [ ] Persist state after every reducer mutation

## 5.8 `mfe-shell` cart event bridge

- [ ] Create `apps/mfe-shell/src/cart/cartEventBridge.ts` to subscribe to window events:
  - [ ] `cart:add-item`
  - [ ] `cart:update-item`
  - [ ] `cart:remove-item`
  - [ ] `cart:clear`
  - [ ] `cart:request-state`
- [ ] Implement dispatcher that emits `cart:state-changed` after mutation
- [ ] Emit one initial `cart:state-changed` after hydration for late remote subscribers
- [ ] Ensure listeners are registered once and cleaned up on app teardown
- [ ] Expose `useCartStore` hook (`apps/mfe-shell/src/cart/useCartStore.ts`) for header badge consumption

## 5.9 `mfe-cart` package and TypeScript setup

- [ ] Create `apps/mfe-cart/package.json` with scripts:
  - [ ] `dev` (`webpack serve --mode development --port 3002`)
  - [ ] `build` (`webpack --mode production`)
  - [ ] `start` (`webpack serve --mode production --port 3002`)
  - [ ] `test` (`vitest run`)
  - [ ] `test:watch` (`vitest`)
  - [ ] `typecheck` (`tsc --noEmit`)
- [ ] Add runtime dependencies: `react`, `react-dom`, `react-router-dom`, `axios`
- [ ] Add dev dependencies similar to shell for webpack/TypeScript/testing
- [ ] Create `apps/mfe-cart/tsconfig.json`
- [ ] Create `apps/mfe-cart/tsconfig.node.json` (if needed for tool configs)

## 5.10 `mfe-cart` webpack and env configuration

- [ ] Create `apps/mfe-cart/webpack.config.js` with:
  - [ ] Module Federation remote config (`name: 'cartMfe'`)
  - [ ] `filename: 'remoteEntry.js'`
  - [ ] exposes `./App` -> `./src/App.tsx`
  - [ ] shared singletons: `react`, `react-dom`, `react-router-dom`
  - [ ] `devServer.port = 3002`
  - [ ] `historyApiFallback = true`
  - [ ] local CORS headers for host compatibility
  - [ ] `output.publicPath = 'auto'`
- [ ] Create `apps/mfe-cart/.env.example` with:
  - [ ] `ORDER_API_MODE=mock`
  - [ ] `ORDER_API_URL=http://localhost:8080/api/orders`
  - [ ] `ORDER_USER_ID=1`
- [ ] Create `apps/mfe-cart/public/index.html`

## 5.11 `mfe-cart` entries and app routes

- [ ] Create `apps/mfe-cart/src/main.tsx` using deferred bootstrap import
- [ ] Create `apps/mfe-cart/src/bootstrap.tsx` mounting standalone app with `BrowserRouter`
- [ ] Create `apps/mfe-cart/src/App.tsx` exported remote root with relative routes:
  - [ ] index -> `CartPage`
  - [ ] `confirmation/:orderId` -> `CartConfirmationPage`

## 5.12 `mfe-cart` integration channel (Shell event bus)

- [ ] Create `apps/mfe-cart/src/integration/cartChannel.ts` with helpers to:
  - [ ] request current cart (`cart:request-state`)
  - [ ] subscribe to `cart:state-changed`
  - [ ] dispatch `cart:update-item`
  - [ ] dispatch `cart:remove-item`
  - [ ] dispatch `cart:clear`
- [ ] Ensure subscription cleanup on unmount

## 5.13 `mfe-cart` UI implementation from `docs/cart_design.json`

- [ ] Create shared cart types in `apps/mfe-cart/src/types/cart.ts`
- [ ] Create `apps/mfe-cart/src/pages/CartPage.tsx` rendering:
  - [ ] heading + item count
  - [ ] cart items list section
  - [ ] order summary section
  - [ ] responsive two-column desktop / single-column mobile layout
- [ ] Create `apps/mfe-cart/src/pages/CartEmptyState.tsx`:
  - [ ] icon/illustration placeholder
  - [ ] empty cart headline and helper text
  - [ ] CTA to continue shopping (`/catalog`)
- [ ] Create `apps/mfe-cart/src/components/CartItemRow.tsx` showing name, unit price, qty controls, line total, remove action
- [ ] Create `apps/mfe-cart/src/components/QuantityStepper.tsx` with keyboard-accessible +/- controls
- [ ] Create `apps/mfe-cart/src/components/OrderSummaryCard.tsx` with subtotal/shipping/tax/total rows
- [ ] Create `apps/mfe-cart/src/components/CheckoutButton.tsx` with loading/disabled states
- [ ] Create `apps/mfe-cart/src/pages/CartConfirmationPage.tsx` with order id, success message, and catalog CTA
- [ ] Create cart styles (`src/styles/tokens.css`, `src/styles/cart.css`) based on `docs/cart_design.json`

## 5.14 `mfe-cart` pricing and totals behavior

- [ ] Add shared USD currency formatter utility using `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
- [ ] Use formatter in cart item unit price, line total, summary subtotal, summary total
- [ ] Compute totals from incoming shell snapshot state (not duplicated mutable source)

## 5.15 `mfe-cart` checkout client implementation

- [ ] Create `apps/mfe-cart/src/services/checkoutClient.ts`:
  - [ ] mock mode implementation returning synthetic order id after delay
  - [ ] gateway mode implementation posting to `ORDER_API_URL`
  - [ ] typed response contract with `orderId`
  - [ ] typed error handling for failed checkout
- [ ] Wire checkout action in `CartPage`:
  - [ ] disable checkout button while request is in flight
  - [ ] on success, dispatch `cart:clear` and navigate to confirmation route
  - [ ] on failure, show retryable error banner

## 5.16 Cross-MFE integration validation

- [ ] Verify Catalog `cart:add-item` events are consumed by Shell even before Cart remote is loaded
- [ ] Verify Shell badge updates immediately after add event
- [ ] Verify visiting `/cart` after add event renders correct synchronized items
- [ ] Verify quantity updates/removals in Cart flow back through Shell and broadcast to all listeners
- [ ] Verify `cart:request-state` returns latest shell snapshot

## 5.17 Shell tests

- [ ] Create `apps/mfe-shell/src/__tests__/cartReducer.test.ts`
  - [ ] add item creates row
  - [ ] add same item merges quantity
  - [ ] quantity update modifies target row
  - [ ] quantity <= 0 removes row
  - [ ] clear removes all rows
  - [ ] totals are computed correctly
- [ ] Create `apps/mfe-shell/src/__tests__/cartEventBridge.test.ts`
  - [ ] `cart:add-item` triggers state change event with updated snapshot
  - [ ] `cart:request-state` emits current snapshot without mutation
  - [ ] `cart:remove-item` removes row and broadcasts
  - [ ] persistence invoked after mutation
- [ ] Create `apps/mfe-shell/src/__tests__/appRoutes.test.tsx`
  - [ ] root redirect to `/catalog`
  - [ ] suspense fallback renders while remote unresolved

## 5.18 Cart tests

- [ ] Create `apps/mfe-cart/src/__tests__/quantityStepper.test.tsx`
  - [ ] increment dispatches `cart:update-item` with +1 quantity
  - [ ] decrement from quantity 1 dispatches remove behavior
- [ ] Create `apps/mfe-cart/src/__tests__/orderSummaryCard.test.tsx`
  - [ ] summary values render in USD format
- [ ] Create `apps/mfe-cart/src/__tests__/cartPage.test.tsx`
  - [ ] empty state shown when no items snapshot received
  - [ ] populated state shown when `cart:state-changed` includes items
  - [ ] remove action dispatches `cart:remove-item`
  - [ ] checkout loading state disables button
- [ ] Create `apps/mfe-cart/src/__tests__/checkoutClient.test.ts`
  - [ ] mock mode returns synthetic id
  - [ ] gateway mode posts expected payload
  - [ ] gateway failure returns typed error

## 5.19 Build and type quality gates

- [ ] Run in `apps/mfe-shell`:
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run build`
- [ ] Run in `apps/mfe-cart`:
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run build`

## 5.20 Manual acceptance checks (Phase 5)

- [ ] **AC-1** `npm run dev` in `apps/mfe-shell` starts host on `http://localhost:3000`
- [ ] **AC-2** `npm run dev` in `apps/mfe-cart` starts remote on `http://localhost:3002` and serves `http://localhost:3002/remoteEntry.js`
- [ ] **AC-3** Shell `/catalog` route loads Catalog remote and renders catalog UI
- [ ] **AC-4** Shell `/cart` route loads Cart remote and renders cart UI
- [ ] **AC-5** Network tab confirms Cart remote is not fetched until `/cart` route is visited
- [ ] **AC-6** Navigation between `/catalog` and `/cart` does not trigger full page reload
- [ ] **AC-7** Clicking Catalog "Add to cart" increments Shell cart badge
- [ ] **AC-8** Cart page shows synchronized items and accurate totals
- [ ] **AC-9** Updating quantity in Cart updates totals and shell badge immediately
- [ ] **AC-10** Removing an item updates list and totals correctly
- [ ] **AC-11** Refreshing browser tab preserves cart within same session (`sessionStorage`)
- [ ] **AC-12** Empty cart shows expected empty-state UI and "Continue shopping" action
- [ ] **AC-13** Checkout in `ORDER_API_MODE=mock` navigates to confirmation and clears cart
- [ ] **AC-14** Confirmation page shows order id and link back to `/catalog`
- [ ] **AC-15** Both projects pass tests, type checks, and production builds
