# Introduction

`stock-sdk` is a **zero-runtime-dependency** stock market SDK that runs in **both the browser and Node.js 18+**. On top of a unified data contract, it provides quotes, K-lines, capital-flow data, dragon-tiger lists and more for A-shares, Hong Kong stocks, US stocks, funds, futures and options — plus built-in technical indicators and signals, a screener and backtester, a command-line interface (CLI), and an MCP server.

v2 is an **architectural upgrade**: on top of the same three data sources v1 already supported, it reworks the API surface, symbol model, data contract, and request layer, and adds higher-level capabilities. It deliberately **does not add new data sources and does not introduce real-time subscriptions**. The goal is a unified, clean, tree-shakable, program-friendly SDK.

## What v2 is

- **Zero dependencies**: `package.json` has no runtime dependencies. Symbol parsing, indicators, signals, screener/backtest, caching, even the MCP protocol — all hand-written, pure logic.
- **Dual-runtime**: the same codebase runs in the browser and Node.js 18+, shipping both ESM and CJS.
- **Import on demand**: beyond the main entry, subpath exports (`stock-sdk/indicators`, `/signals`, `/symbols`, etc.) let pure-computation users avoid pulling in the request layer and all providers.
- **Fully typed**: every public API ships with TypeScript types and JSDoc.

## Core differences from v1

### 1. Namespaced API

v1 flattened over a hundred methods onto the facade (`sdk.getFullQuotes()`, `sdk.getETFOptionDailyKline()`). v2 organizes them into **namespaces** by domain, leaving the flat long method names behind:

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// v2 namespaced calls
await sdk.quotes.cn(['sh600519'])              // A-share full quotes
await sdk.kline.cn('600519', { period: 'daily' }) // A-share historical K-line
await sdk.options.etf.dailyKline('10004336')    // ETF option daily K-line
```

The namespaces: `quotes` / `codes` / `batch` / `kline` / `board` / `options` / `futures` / `fundFlow` / `northbound` / `marketEvent` / `dragonTiger` / `blockTrade` / `margin` / `fund` / `calendar` / `reference`, plus the top-level `sdk.search(keyword)`. See the [API overview](/en/api/) and [Migrate from v1](/en/guide/migration-v1-to-v2) for the full mapping.

> v2 is a **hard cutover** — there is no compatibility entry and no legacy method aliases. Use the migration guide when upgrading from v1.

### 2. Unified symbol model

In v1 the same instrument was written differently across methods (A-share `sh600519`, HK `00700` / `hk00700`, US minute K-line needed `105.AAPL`), with symbol handling scattered across a dozen-plus call sites. v2 introduces a unified `normalizeSymbol` where **`string` is a first-class citizen**, alongside the "hinted string" `SymbolRef`:

```ts
import { normalizeSymbol } from 'stock-sdk/symbols'

normalizeSymbol('sh600519')   // tolerant parsing
normalizeSymbol('600519')
normalizeSymbol('00700')
normalizeSymbol('AAPL')
normalizeSymbol('105.AAPL')
normalizeSymbol({ code: '000001', assetType: 'index' }) // disambiguate with a hint
```

See [Symbols & Codes](/en/guide/symbols).

### 3. Unified data contract

v2 collapses the quote types into a **discriminated union** `Quote` keyed by `assetType`, with unified base fields:

- Base fields: `symbol` / `market` / `assetType` / `exchange` / `currency` / `timestamp` / `tz` / `source`.
- `timestamp` is `number | null` (`null` when it cannot be parsed, replacing v1's `NaN`).
- Percentages are unified as **percentage points** (e.g. `5.2` means 5.2%).
- Amounts / prices target the **major unit of each market's quote currency** (A-share = CNY / HK = HKD / US = USD, with no cross-currency conversion); volume targets the "share" unit. In the current beta, runtime values still follow each provider's raw convention until per-source calibration lands.
- The `raw` field has been removed from data objects entirely (the debug escape hatch moved to provider-level `getXxxRaw()`).

```ts
const [q] = await sdk.quotes.cn(['sh600519'])
switch (q.assetType) {
  case 'stock':
    console.log(q.price, q.changePercent) // narrowed naturally inside switch
    break
}
```

> Exact fields follow the final implementation.

### 4. CLI and built-in MCP

v2 ships a CLI and an MCP server inside the main package, **without affecting the `import stock-sdk` bundle size or breaking the zero-dependency promise**:

- **CLI**: `npx stock-sdk quote sh600519` fetches data straight from the terminal; argument parsing is hand-written, zero-dependency.
- **MCP**: `stock-sdk mcp` starts an MCP server in one command for AI tools like Cursor / Claude / Codex. The protocol is a hand-written minimal implementation (the `stdio + tools` subset), with no third-party SDK.

CLI / MCP live behind separate entries — not a single byte enters the user's bundle. See [CLI](/en/cli/) and [MCP](/en/mcp/).

### 5. Screener and backtest

A declarative screener built on full-market quotes, boards and capital flows, plus a local backtest engine (pure computation, reproducible):

```ts
import { screen } from 'stock-sdk/screener'

const all = await sdk.batch.cn()
const picks = screen(all)
  .where(q => q.pe != null && q.pe < 20)
  .where(q => q.changePercent > 3)
  .sortBy(q => q.amount, 'desc')
  .top(20)
```

## Capability overview

| Domain | Namespace / entry | Contents |
|---|---|---|
| Real-time quotes | `sdk.quotes` | A-share full / simple, HK, US, fund, capital flow (simple), large orders, intraday timeline |
| Codes & batch | `sdk.codes` / `sdk.batch` | Per-market code lists, full-market batch quotes, batch by codes |
| K-line | `sdk.kline` | A / HK / US historical and minute K-lines, K-line with indicators |
| Boards | `sdk.board` | Industry / concept board list, spot, constituents, K-line |
| Derivatives | `sdk.options` / `sdk.futures` | Index / ETF / commodity / CFFEX options, domestic & global futures K-lines, inventory |
| Capital flow | `sdk.fundFlow` / `sdk.northbound` / `sdk.marketEvent` / `sdk.dragonTiger` / `sdk.blockTrade` / `sdk.margin` | Fund flow, northbound capital, limit-up / changes, dragon-tiger, block trades, margin |
| Funds & utils | `sdk.fund` / `sdk.calendar` / `sdk.reference` / `sdk.search` | Fund extensions, trading calendar, dividend detail, search |
| Indicators | `stock-sdk/indicators` | 14 technical-indicator functions + `addIndicators` |
| Signals | `stock-sdk/signals` | `calcSignals`: golden / death cross, overbought / oversold, etc. |
| Symbols | `stock-sdk/symbols` | `normalizeSymbol`, `SymbolRef` |
| Screener & backtest | `stock-sdk/screener` | Declarative screener, local backtest engine |
| Cache | `stock-sdk/cache` | Injectable unified cache layer (TTL / LRU) |
| CLI · MCP | `stock-sdk` (bin) / `stock-sdk mcp` | Terminal fetching, built-in MCP server |

## Next steps

- [Installation](/en/guide/installation): npm / yarn / pnpm, subpath imports, CLI and MCP.
- [Quick Start](/en/guide/getting-started): a 10-line namespaced demo and common usage.
- [Migrate from v1](/en/guide/migration-v1-to-v2): method mapping and contract changes.
