# mfe-cart

Cart micro-frontend remote for the ecommerce shell host.

## Scripts

- `npm run dev` - starts cart remote on `http://localhost:3002`
- `npm run build` - production build with `remoteEntry.js`
- `npm run start` - serve in production mode on `3002`
- `npm run typecheck` - TypeScript check
- `npm run test` - run unit tests

## Environment Variables

Copy `.env.example` to `.env` and adjust values.

- `ORDER_API_MODE` - `mock` or `gateway`
- `ORDER_API_URL` - order endpoint used in gateway mode
- `ORDER_USER_ID` - user id sent in checkout payload
