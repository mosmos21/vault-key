import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  platform: 'node',
  unbundle: true,
  outDir: 'dist',
  nodeProtocol: true,
});
