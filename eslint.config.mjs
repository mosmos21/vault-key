import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.serena/**', '**/tmp/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      // TypeScript ガイドラインに基づく設定
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // セキュリティ関連
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // コードスタイル
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
);
