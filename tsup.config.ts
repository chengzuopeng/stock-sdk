import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const PKG_VERSION = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    indicators: 'src/indicators/index.ts',
    symbols: 'src/symbols/index.ts',
    signals: 'src/signals/index.ts',
    screener: 'src/screener/index.ts',
    cache: 'src/cache/index.ts',
    errors: 'src/errors/index.ts',
    fxmacrodata: 'src/providers/fxmacrodata/index.ts',
    cli: 'src/cli/index.ts',
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
  // CLI 版本号构建期注入，避免产物出现 import.meta.url（cjs 产物会因此报错）
  define: { __STOCK_SDK_VERSION__: JSON.stringify(PKG_VERSION) },
});

