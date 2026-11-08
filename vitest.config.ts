import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/vite-env.d.ts',
        'src/main.tsx',
        '*.config.ts',
        '*.config.js',
      ],
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    testTimeout: 10000,
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
