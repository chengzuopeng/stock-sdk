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
    router: 'src/router.ts',
    indicators: 'src/indicators.ts',
    symbols: 'src/symbols.ts',
    signals: 'src/signals.ts',
    screener: 'src/screener.ts',
    cache: 'src/cache.ts',
    errors: 'src/errors.ts',
    cli: 'src/cli.ts',
    mcp: 'src/mcp.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: [/^@stock-sdk\/core(\/.*)?$/],
    compilerOptions: {
      paths: {
        '@stock-sdk/core': ['../core/dist-types/index.d.ts'],
        '@stock-sdk/core/sdk': ['../core/dist-types/sdk.d.ts'],
        '@stock-sdk/core/core': ['../core/dist-types/core/index.d.ts'],
        '@stock-sdk/core/router': ['../core/dist-types/router/index.d.ts'],
        '@stock-sdk/core/indicators': ['../core/dist-types/indicators/index.d.ts'],
        '@stock-sdk/core/symbols': ['../core/dist-types/symbols/index.d.ts'],
        '@stock-sdk/core/signals': ['../core/dist-types/signals/index.d.ts'],
        '@stock-sdk/core/screener': ['../core/dist-types/screener/index.d.ts'],
        '@stock-sdk/core/cache': ['../core/dist-types/cache/index.d.ts'],
        '@stock-sdk/core/errors': ['../core/dist-types/errors/index.d.ts'],
        '@stock-sdk/core/types': ['../core/dist-types/types/index.d.ts'],
        '@stock-sdk/core/providers': ['../core/dist-types/providers/index.d.ts'],
        '@stock-sdk/core/cli': ['../core/dist-types/cli/index.d.ts'],
        '@stock-sdk/core/mcp': ['../core/dist-types/mcp/server.d.ts'],
        '@stock-sdk/core/*': ['../core/dist-types/*'],
      },
    },
  },
  noExternal: [/^@stock-sdk\/core(\/.*)?$/],
  external: ['undici'],
  splitting: true,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  target: 'node18',
  platform: 'node',
  minify: true,
  define: { __STOCK_SDK_VERSION__: JSON.stringify(PKG_VERSION) },
});
