# Installation

This monorepo publishes two API-aligned packages — choose the one that fits your runtime:

| Package | Runtime | Dependencies | Best For |
|---|---|---|---|
| `stock-sdk` | Browser + Node.js 18+ | **Zero** | Browser apps, dashboards, lightweight dual-runtime or pure compute |
| `stock-node-sdk` | Node.js 18+ Server | `undici` only | Backend ingestion, quant pipelines, AI Agents — multi-source automatic failover, proxy pool, disk cache, financials & news ([guide](/en/guide/node-sdk)) |

## Install the package

::: code-group

```bash [stock-sdk (Browser + Node)]
npm install stock-sdk
# or pnpm add stock-sdk / yarn add stock-sdk
```

```bash [stock-node-sdk (Node Multi-Source · Beta)]
npm install stock-node-sdk@beta
# or pnpm add stock-node-sdk@beta / yarn add stock-node-sdk@beta
```

:::

> Requires Node.js >= 18. `stock-sdk` has zero runtime dependencies; `stock-node-sdk` only depends on `undici` for proxy pooling. Both ship ESM and CJS builds.

## Main entry import

Import the `StockSDK` class from the main entry to access every namespaced API:

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const quotes = await sdk.quotes.cn(['sh600519'])
```

CommonJS works too:

```js
const { StockSDK } = require('stock-sdk')
```

## Import on demand (subpath)

Pure-computation capabilities are exported via subpaths. When you only need indicators, signals or symbol parsing, **the request layer and all providers stay out of your bundle** — friendly to tree-shaking:

```ts
// Technical-indicator functions
import { calcMA, calcMACD, calcBOLL, addIndicators } from 'stock-sdk/indicators'

// Signal detection (golden / death cross, overbought / oversold, etc.)
import { calcSignals } from 'stock-sdk/signals'

// Symbol parsing
import { normalizeSymbol } from 'stock-sdk/symbols'
import type { SymbolRef } from 'stock-sdk/symbols'
```

Available subpath entries:

| Entry | Contents |
|---|---|
| `stock-sdk` | Main library: `StockSDK` and every namespaced API |
| `stock-sdk/indicators` | 14 technical-indicator functions + `addIndicators` |
| `stock-sdk/signals` | Signal detection `calcSignals` |
| `stock-sdk/symbols` | `normalizeSymbol`, `SymbolRef` and symbol types |
| `stock-sdk/screener` | Screener and backtest engine |
| `stock-sdk/cache` | Low-level API of the injectable cache layer |
| `stock-sdk/errors` | Unified error type `SdkError` and error codes |
| `stock-node-sdk/router` | *(Node edition only)* `SourceRouter` / `SourceHealthTracker` multi-source router |

> Each subpath is declared in `package.json` `exports` with the full import / require / types triple. `stock-node-sdk` exports every subpath above under the `stock-node-sdk/...` prefix as well.

## CLI

Both packages ship a built-in CLI — no extra install needed to fetch data from the terminal:

```bash
# Run once (zero-dependency base)
npx stock-sdk quote sh600519
npx stock-sdk kline 600519 --period daily

# Or use the Node enhanced CLI (Beta, --source / --proxy / --cache-dir + financials & news)
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4
```

The CLI outputs JSON by default (pipe-friendly). See the [CLI overview](/en/cli/).

## MCP

Start the built-in MCP server for AI tools like Cursor / Claude / Codex (`stock-node-sdk@beta mcp` is recommended on Node.js for all 104 tools and multi-source failover):

```bash
npx stock-node-sdk@beta mcp   # Node Enhanced (Beta, 104 tools + automatic failover)
npx stock-sdk mcp             # Zero-dep Base (93 tools)
```

The MCP protocol is a hand-written minimal implementation (`stdio + tools`) that works out of the box. See [MCP installation](/en/mcp/installation) for per-client configuration.

> CLI and MCP live behind separate entries. When you `import { StockSDK } from 'stock-sdk'`, **not a single byte of their code enters your bundle**, and the main package stays zero-dependency.

## Next steps

- [Quick Start](/en/guide/getting-started): a 10-line namespaced demo.
- [Node Enhanced Guide](/en/guide/node-sdk): multi-source failover, proxy pool, disk cache, financials & news.
- [Symbols & Codes](/en/guide/symbols): how to write `string` and `SymbolRef`.
