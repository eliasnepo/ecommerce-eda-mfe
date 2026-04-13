import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'catalogMfe/App': path.resolve(
        __dirname,
        'src/test/mocks/CatalogRemoteMock.tsx',
      ),
      'cartMfe/App': path.resolve(__dirname, 'src/test/mocks/CartRemoteMock.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
  },
})
