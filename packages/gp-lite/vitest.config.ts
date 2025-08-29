import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
})
