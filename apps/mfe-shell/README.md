# mfe-shell

Shell host for the ecommerce micro-frontend setup.

## Scripts

- `npm run dev` - starts shell host on `http://localhost:3000`
- `npm run build` - production build
- `npm run start` - serves production mode build on port `3000`
- `npm run typecheck` - TypeScript check
- `npm run test` - run unit tests

## Environment Variables

Copy `.env.example` to `.env` and adjust if needed.

- `CATALOG_REMOTE_URL` - catalog remote entry URL
- `CART_REMOTE_URL` - cart remote entry URL
- `CART_STORAGE_KEY` - `sessionStorage` key used for cart persistence
