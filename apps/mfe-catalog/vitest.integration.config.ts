import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.integration.ts'],
    include: ['src/__tests__/integration/**/*.test.{ts,tsx}'],
    testTimeout: 30_000,
  },
})
