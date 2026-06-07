# Installation

`stock-sdk` has zero runtime dependencies and works in **both the browser and Node.js 18+**, shipping both ESM and CJS builds.

## Install the package

::: code-group

```bash [npm]
npm install stock-sdk
```

```bash [yarn]
yarn add stock-sdk
```

```bash [pnpm]
pnpm add stock-sdk
```

:::

> Requires Node.js >= 18. `stock-sdk` has no runtime dependencies, so `npm install` pulls in no third-party packages.

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

> Each subpath is declared in `package.json` `exports` with the full import / require / types triple.

## CLI

The main package ships a CLI — no extra install needed to fetch data from the terminal:

```bash
# Run once
npx stock-sdk quote sh600519

# Or install globally and use the stock-sdk command
npm install -g stock-sdk
stock-sdk kline 600519 --period day
```

The CLI outputs JSON by default (pipe-friendly). See the [CLI overview](/en/cli/).

## MCP

Start the built-in MCP server for AI tools like Cursor / Claude / Codex:

```bash
stock-sdk mcp
```

The MCP protocol is a hand-written minimal implementation (`stdio + tools`) that works out of the box. See [MCP installation](/en/mcp/installation) for per-client configuration.

> CLI and MCP live behind separate entries. When you `import { StockSDK } from 'stock-sdk'`, **not a single byte of their code enters your bundle**, and the main package stays zero-dependency.

## Next steps

- [Quick Start](/en/guide/getting-started): a 10-line namespaced demo.
- [Symbols & Codes](/en/guide/symbols): how to write `string` and `SymbolRef`.
