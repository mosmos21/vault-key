import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// dist 配下の .js/.cjs ファイルを再帰的に処理
const fixNodeImports = (dir: string): void => {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      fixNodeImports(fullPath);
    } else if (entry.endsWith('.js') || entry.endsWith('.cjs')) {
      const content = readFileSync(fullPath, 'utf-8');
      const fixed = content
        .replace(/from ["']sqlite["']/g, 'from "node:sqlite"')
        .replace(/require\(["']sqlite["']\)/g, 'require("node:sqlite")');
      writeFileSync(fullPath, fixed, 'utf-8');
    }
  }
};

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  platform: 'node',
  bundle: false,
  outDir: 'dist',
  onSuccess: async () => {
    // ビルド後に node: プレフィックスを復元
    fixNodeImports('dist');
  },
});
