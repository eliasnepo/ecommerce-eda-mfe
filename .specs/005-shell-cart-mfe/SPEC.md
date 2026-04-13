# Implementation Spec - Spec 005 (Phase 5: Shell + Cart MFE)

**Status:** Ready for implementation  
**Design doc:** `docs/DESIGN_DOC.md`  
**Product requirements:** `docs/PRD.md`  
**Project context:** `README.md`  
**Related specs:** `.specs/003-catalog-mfe/SPEC.md`, `.specs/004-catalog-product-adjustments/SPEC.md`  
**UI design references:** `docs/search_page_design.json`, `docs/cart_design.json`  
**Last updated:** 2026-04-12

---

## Spec 005 - Shell Host and Cart Remote Integration

### Goal

Implement Phase 5 by creating two frontend applications:

1. **Shell MFE host** (`apps/mfe-shell`) on port `3000` that owns top-level routing, header/navigation, and cross-MFE cart state.
2. **Cart MFE remote** (`apps/mfe-cart`) on port `3002` that renders cart UI, quantity/remove interactions, order summary, and checkout confirmation flow.

The Shell must lazy-load both remotes (`catalogMfe`, `cartMfe`) via Webpack 5 Module Federation so navigation between Catalog and Cart behaves like one SPA without full page reload.

### Scope

**In scope**
- Bootstrap `mfe-shell` as the Webpack Module Federation host.
- Bootstrap `mfe-cart` as a Webpack Module Federation remote exposing `./App`.
- Integrate existing `mfe-catalog` remote (`catalogMfe`) into shell routes.
- Implement cross-MFE cart event contracts and shell-owned cart store.
- Persist cart state for session duration (`sessionStorage`) to satisfy PRD `CA-05`.
- Build cart page and confirmation page based on `docs/cart_design.json`.
- Add tests for shell routing/lazy-load behavior and cart state/event behavior.

**Out of scope (deferred to later phases)**
- Real authentication and user identity.
- Server-side cart persistence (`CA-06`, should requirement).
- Production deployment/CDN strategy for remote assets.
- Full order backend integration guarantees (Order Service is Phase 6); Phase 5 uses a mode-switchable checkout client with mock default.

---

## 1) Phase 5 architecture decisions

### 1.1 Runtime topology

- Shell (`:3000`) is always loaded first and provides:
  - top-level `BrowserRouter`
  - shared dependencies (`react`, `react-dom`, `react-router-dom`)
  - global cart event bridge + cart session store
- Catalog remote (`:3001`) is loaded only for `/catalog/*` routes.
- Cart remote (`:3002`) is loaded only for `/cart/*` routes.

### 1.2 Why shell owns cart state

Catalog can dispatch `cart:add-item` while Cart remote has not yet been loaded. If cart state lived only in Cart remote, add events could be dropped. Keeping state in Shell ensures:

- event listeners are active regardless of current route,
- cart badge remains accurate globally,
- state persists across route-level remote unmount/remount,
- Cart remote can be a pure UI remote driven by event sync.

### 1.3 Module Federation contracts

- Existing catalog remote:
  - remote name: `catalogMfe`
  - exposed module: `./App`
  - URL (local): `http://localhost:3001/remoteEntry.js`
- New cart remote:
  - remote name: `cartMfe`
  - exposed module: `./App`
  - URL (local): `http://localhost:3002/remoteEntry.js`

### 1.4 Cross-MFE cart event contracts (canonical)

```ts
type CartAddItemDetail = {
  productId: string
  productName: string
  price: number
  quantity: number
}

type CartUpdateItemDetail = {
  productId: string
  quantity: number
}

type CartRemoveItemDetail = {
  productId: string
}

type CartStateItem = {
  productId: string
  productName: string
  price: number
  quantity: number
}

type CartStateChangedDetail = {
  items: CartStateItem[]
  totalItems: number
  subtotal: number
  currency: 'USD'
  updatedAt: string
}
```

Event names:

- `cart:add-item` (Catalog -> Shell)
- `cart:update-item` (Cart -> Shell)
- `cart:remove-item` (Cart -> Shell)
- `cart:clear` (Cart -> Shell)
- `cart:request-state` (Cart -> Shell, pull current state)
- `cart:state-changed` (Shell -> all remotes, push current state)

Rules:

- All events are dispatched on `window` via `CustomEvent`.
- Shell is the only writer of canonical state.
- Cart remote never mutates storage directly; it sends commands and renders from `cart:state-changed` snapshots.

---

## 2) Target project structure

```
apps/
├── mfe-shell/
│   ├── package.json
│   ├── webpack.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── remotes.d.ts
│   │   ├── styles/
│   │   │   ├── tokens.css
│   │   │   └── app.css
│   │   ├── components/
│   │   │   ├── ShellLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── RemoteFallback.tsx
│   │   │   └── RouteErrorBoundary.tsx
│   │   ├── routing/
│   │   │   └── AppRoutes.tsx
│   │   ├── cart/
│   │   │   ├── cartTypes.ts
│   │   │   ├── cartReducer.ts
│   │   │   ├── cartStorage.ts
│   │   │   ├── cartEventBridge.ts
│   │   │   └── useCartStore.ts
│   │   └── __tests__/
│   │       ├── cartReducer.test.ts
│   │       ├── cartEventBridge.test.ts
│   │       └── appRoutes.test.tsx
│   └── public/index.html
└── mfe-cart/
    ├── package.json
    ├── webpack.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── .env.example
    ├── src/
    │   ├── main.tsx
    │   ├── bootstrap.tsx
    │   ├── App.tsx
    │   ├── styles/
    │   │   ├── tokens.css
    │   │   └── cart.css
    │   ├── integration/
    │   │   └── cartChannel.ts
    │   ├── types/
    │   │   └── cart.ts
    │   ├── pages/
    │   │   ├── CartPage.tsx
    │   │   ├── CartEmptyState.tsx
    │   │   └── CartConfirmationPage.tsx
    │   ├── components/
    │   │   ├── CartItemRow.tsx
    │   │   ├── QuantityStepper.tsx
    │   │   ├── OrderSummaryCard.tsx
    │   │   └── CheckoutButton.tsx
    │   ├── services/
    │   │   └── checkoutClient.ts
    │   └── __tests__/
    │       ├── cartPage.test.tsx
    │       ├── quantityStepper.test.tsx
    │       ├── orderSummaryCard.test.tsx
    │       └── checkoutClient.test.ts
    └── public/index.html
```

---

## 3) Technology profile (Phase 5 canonical choices)

| Concern | Shell (`mfe-shell`) | Cart (`mfe-cart`) |
|---|---|---|
| Language | TypeScript 5.x | TypeScript 5.x |
| UI framework | React 18.x | React 18.x |
| Bundler | Webpack 5 | Webpack 5 |
| Module Federation role | Host | Remote |
| Routing | `react-router-dom` 6.x (host router) | `react-router-dom` 6.x (relative remote routes) |
| Styling | Plain CSS with shared token variables | Plain CSS with shared token variables |
| Testing | Vitest + Testing Library | Vitest + Testing Library |

Why this differs from Catalog: Catalog is already implemented with Vite federation plugin in Phase 4. Phase 5 adopts Webpack host/remote for Shell/Cart while keeping runtime interoperability with Catalog remote.

---

## 4) Shell host specification (`apps/mfe-shell`)

### 4.1 `package.json` requirements

Scripts (minimum):

- `dev`: `webpack serve --mode development --port 3000`
- `build`: `webpack --mode production`
- `start`: `webpack serve --mode production --port 3000`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `typecheck`: `tsc --noEmit`

Dependencies:

- `react`, `react-dom`, `react-router-dom`

Dev dependencies (minimum):

- `webpack`, `webpack-cli`, `webpack-dev-server`
- `typescript`, `ts-loader`
- `html-webpack-plugin`
- `css-loader`, `style-loader`
- `dotenv`
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`

### 4.2 `webpack.config.js` requirements

- Host app name: `shell`
- MF remotes:
  - `catalogMfe@${CATALOG_REMOTE_URL}`
  - `cartMfe@${CART_REMOTE_URL}`
- Shared singletons:
  - `react`
  - `react-dom`
  - `react-router-dom`
- Dev server:
  - `port: 3000`
  - `historyApiFallback: true`
  - `headers: { 'Access-Control-Allow-Origin': '*' }`
- Output:
  - `publicPath: 'auto'`
- Environment defaults:
  - `CATALOG_REMOTE_URL=http://localhost:3001/remoteEntry.js`
  - `CART_REMOTE_URL=http://localhost:3002/remoteEntry.js`

### 4.3 Routing and lazy loading behavior

Shell routes:

```tsx
/                 -> redirect to /catalog
/catalog/*        -> lazy remote catalog app
/cart/*           -> lazy remote cart app
*                 -> host-level not-found page
```

Requirements:

- Use `React.lazy(() => import('catalogMfe/App'))` and `React.lazy(() => import('cartMfe/App'))`.
- Wrap each route element with `Suspense` fallback and route error boundary.
- Navigation between `/catalog` and `/cart` must be client-side only (no full reload).

### 4.4 Shell layout and navigation

Header requirements:

- Brand/title area (for example, `E-Commerce PoC`).
- Nav links:
  - `Catalog`
  - `Cart`
- Cart badge with total item count from shell cart store.
- Active link styling and keyboard focus styles.

Layout requirements:

- Header fixed/sticky behavior is optional; if sticky, ensure content offset.
- Main content region wraps remote routes.
- Mobile-first responsive nav (stacked or compact) at small widths.

### 4.5 Shell cart state domain

Canonical state shape:

```ts
interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  currency: 'USD'
  updatedAt: string
}
```

Reducer behavior:

- `addItem`:
  - if product already exists, increase quantity by incoming quantity
  - else append new item
- `updateItemQuantity`:
  - set explicit quantity
  - remove item if resulting quantity <= 0
- `removeItem`
- `clearCart`

Derived selectors:

- `totalItems = sum(item.quantity)`
- `subtotal = sum(item.price * item.quantity)`

### 4.6 Session persistence

- Persist `CartState` to `sessionStorage` key `ecom.cart.v1` after every state mutation.
- On shell startup, hydrate state from storage if valid.
- On invalid JSON/schema mismatch, fail safely to empty state.

### 4.7 Event bridge implementation

Shell listens for:

- `cart:add-item`
- `cart:update-item`
- `cart:remove-item`
- `cart:clear`
- `cart:request-state`

After each handled command, Shell dispatches:

- `cart:state-changed` with full snapshot and derived totals.

Shell should also dispatch one initial `cart:state-changed` after hydration so remotes mount with current state.

---

## 5) Cart remote specification (`apps/mfe-cart`)

### 5.1 `package.json` requirements

Scripts (minimum):

- `dev`: `webpack serve --mode development --port 3002`
- `build`: `webpack --mode production`
- `start`: `webpack serve --mode production --port 3002`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `typecheck`: `tsc --noEmit`

Dependencies:

- `react`, `react-dom`, `react-router-dom`
- `axios` (for future/Phase 6 gateway checkout mode)

Dev dependencies similar to shell (`webpack`, loaders, TS, Vitest stack).

### 5.2 `webpack.config.js` requirements

- Remote name: `cartMfe`
- Exposes:
  - `./App` -> `./src/App.tsx`
- Shared singletons:
  - `react`
  - `react-dom`
  - `react-router-dom`
- Dev server:
  - `port: 3002`
  - CORS headers open for host local integration
  - `historyApiFallback: true`

### 5.3 Entry and routing model

- `src/main.tsx` performs deferred bootstrap import (`import('./bootstrap')`) for MF async boundary consistency.
- `src/bootstrap.tsx` mounts standalone app with `BrowserRouter` for local development.
- `src/App.tsx` exports remote root and defines relative routes:
  - `index` -> `CartPage`
  - `confirmation/:orderId` -> `CartConfirmationPage`

### 5.4 Cart channel integration

Cart remote must include a channel helper (`integration/cartChannel.ts`) that:

- dispatches command events to shell (`cart:update-item`, `cart:remove-item`, `cart:clear`, `cart:request-state`),
- subscribes to `cart:state-changed` snapshots,
- maps event payload into local render state.

On mount of `CartPage`:

- register state listener,
- dispatch `cart:request-state`,
- render from latest snapshot.

### 5.5 Cart UI requirements (based on `docs/cart_design.json`)

#### Page states

- **Empty cart state**
  - icon/illustration placeholder
  - heading + helper text
  - primary CTA: `Continue shopping` -> navigate `/catalog`
- **Populated cart state**
  - item list with per-row controls
  - order summary card
  - checkout CTA
- **Submitting checkout state**
  - disable checkout button
  - show loading text/spinner
- **Confirmation state**
  - success icon/banner
  - order id
  - CTA back to catalog

#### Item row behavior

Each row shows:

- product name
- unit price (USD)
- quantity stepper (`-`, current qty, `+`)
- line total
- remove action

Interaction rules:

- decrement at quantity `1` removes item (or set to 0, then shell removes)
- increment/decrement dispatches `cart:update-item`
- remove button dispatches `cart:remove-item`

#### Order summary behavior

Fields:

- subtotal
- shipping (PoC fixed `0` or `Free`)
- tax (PoC fixed `0` unless configured)
- total

Formatting:

- currency via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`

### 5.6 Checkout client behavior

To bridge Phase 5 and Phase 6 safely, checkout client supports two modes:

- `mock` (default in Phase 5)
  - simulate API delay (for example 400-700 ms)
  - return deterministic fake order id (`MOCK-<timestamp>`) 
- `gateway` (used once Order Service exists)
  - `POST http://localhost:8080/api/orders`
  - payload includes user id stub and current cart items

Environment variables:

- `ORDER_API_MODE=mock|gateway` (default `mock`)
- `ORDER_API_URL=http://localhost:8080/api/orders`
- `ORDER_USER_ID=1`

Checkout success behavior:

1. navigate to `confirmation/:orderId`
2. dispatch `cart:clear`

Checkout failure behavior:

- show inline error banner
- keep cart unchanged
- allow retry

---

## 6) Styling and design token requirements

### 6.1 Token source

- Search/catalog token source remains `docs/search_page_design.json`.
- Cart token source for this phase is `docs/cart_design.json`.

### 6.2 Shared visual baseline

- Use CSS custom properties for colors/spacing/radius in both shell and cart.
- Keep baseline neutrals consistent with catalog (page background `#F0F2F5`, card white, border gray).
- Use semantic variable names (`--color-page-bg`, `--color-card-bg`, `--radius-card`, etc.).

### 6.3 Responsive behavior

- Cart page uses two-column layout on desktop (`items + summary`) and collapses to one column on mobile.
- Quantity controls and buttons must remain keyboard accessible at all breakpoints.

---

## 7) Testing requirements

### 7.1 Shell tests

- `cartReducer.test.ts`
  - add new item
  - merge quantity for existing item
  - update quantity
  - remove item
  - clear cart
  - derived totals
- `cartEventBridge.test.ts`
  - handling `cart:add-item` updates state and dispatches `cart:state-changed`
  - handling `cart:request-state` emits snapshot without mutation
  - persistence write occurs after mutation
- `appRoutes.test.tsx`
  - redirects `/` to `/catalog`
  - lazy route fallback renders while remote unresolved

### 7.2 Cart tests

- `quantityStepper.test.tsx`
  - `+` dispatches update with quantity +1
  - `-` from 1 triggers remove behavior
- `orderSummaryCard.test.tsx`
  - subtotal/total formatted as USD
- `cartPage.test.tsx`
  - empty state when no items
  - populated list when `cart:state-changed` arrives
  - remove action dispatches `cart:remove-item`
  - checkout button disabled while submitting
- `checkoutClient.test.ts`
  - mock mode returns synthetic order id
  - gateway mode posts expected payload and handles failure

---

## 8) Acceptance criteria (Phase 5)

1. `apps/mfe-shell` runs on port `3000` and renders shell header + route container.
2. Shell lazily loads `catalogMfe` only when visiting `/catalog`.
3. Shell lazily loads `cartMfe` only when visiting `/cart`.
4. Navigating between `/catalog` and `/cart` does not trigger full page reload.
5. Clicking `Add to cart` in Catalog dispatches `cart:add-item` and increments shell cart badge.
6. Opening `/cart` shows added items via `cart:state-changed` snapshot.
7. Quantity changes in Cart update shell badge and totals immediately.
8. Removing an item updates list and totals correctly.
9. Cart state survives browser refresh in same tab/session (`sessionStorage`).
10. Cart empty state appears when no items exist.
11. Checkout in `mock` mode navigates to confirmation and clears cart.
12. `npm run test`, `npm run typecheck`, and `npm run build` pass in both `apps/mfe-shell` and `apps/mfe-cart`.
13. `apps/mfe-cart/dist/remoteEntry.js` is generated and served.
14. Shell successfully consumes existing `mfe-catalog` remote built in Phase 4.

---

## 9) Implementation notes and guardrails

- Keep event payloads backward-compatible with the existing Catalog contract from Phase 4 (`cart:add-item` fields unchanged).
- Do not introduce direct imports between `mfe-catalog` and `mfe-cart`.
- Avoid hidden global mutable objects outside explicit shell cart store/event bridge.
- Keep checkout integration adaptable so Phase 6 can flip from mock to gateway mode with env-only change.
- If Vite remote URL shape differs in local runtime (`/assets/remoteEntry.js` vs `/remoteEntry.js`), make remote URL configurable via env and document the default.
