import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, './packages/core/src'),
      '@cli': resolve(__dirname, './packages/cli/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/__tests__/**',
      ],
    },
    include: ['packages/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'dist', '**/*.config.ts'],
  },
});
