import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    indicators: 'src/indicators/index.ts',
    symbols: 'src/symbols/index.ts',
    signals: 'src/signals/index.ts',
    screener: 'src/screener/index.ts',
    cache: 'src/cache/index.ts',
    errors: 'src/errors/index.ts',
    mcp: 'src/mcp/server.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  target: 'es2020',
  minify: true,
});

