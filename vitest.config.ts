import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
    env: {
      // テスト時はファイルロギングを無効化して、実際のホームディレクトリに影響を与えないようにする
      VAULTKEY_LOG_FILE_ENABLED: 'false',
      // テスト時は HOME 環境変数を一時ディレクトリに変更して、実際のホームディレクトリに影響を与えないようにする
      HOME: join(tmpdir(), 'vaultkey-test-home'),
    },
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
    include: ['packages/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'dist', '**/*.config.ts'],
  },
});
