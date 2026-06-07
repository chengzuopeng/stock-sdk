# Futures & Options

stock-sdk exposes futures and options data under two namespaces: `sdk.futures` and `sdk.options`. This page gives an overview; per-method parameters and return shapes live in the API chapters [futures](/en/api/futures) and [options](/en/api/options).

::: tip Symbol input
Futures and options follow the same convention: `string` is the first-class input, with an optional `SymbolRef`. `normalizeSymbol` tolerantly parses forms like `rb2510`, `RBM` (continuous main contract), and `CFFEX.IF2412`. See [Symbols & Codes](/en/guide/symbols).
:::

## Futures: sdk.futures

`sdk.futures` covers domestic futures K-lines, global (overseas) futures quotes / K-lines, and exchange inventory data.

| Method | Description |
|---|---|
| `futures.kline(symbol, opts)` | Domestic futures historical K-line |
| `futures.globalSpot(symbol)` | Global futures real-time quote (COMEX / NYMEX / CBOT / LME, etc.) |
| `futures.globalKline(symbol, opts)` | Global futures historical K-line |
| `futures.inventorySymbols()` | List of futures varieties with inventory data |
| `futures.inventory(symbol)` | Inventory data for a given variety |
| `futures.comexInventory(symbol)` | COMEX gold / silver inventory, etc. |

::: tip market vs exchange
Domestic futures have `market: 'CN'` and are distinguished by `exchange` (`SHFE` / `DCE` / `CZCE` / `INE` / `CFFEX` / `GFEX`); overseas futures have `market: 'GLOBAL'`, distinguished by `exchange` (`COMEX` / `NYMEX` / `CBOT` / `LME`, etc.).
:::

### Examples

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// Domestic futures K-line: rebar steel 2510 contract
const rbKline = await sdk.futures.kline('rb2510', { period: 'day' })

// Global futures real-time quote
const comexGold = await sdk.futures.globalSpot('GC') // COMEX gold (illustrative)

// Global futures K-line
const wtiKline = await sdk.futures.globalKline('CL', { period: 'day' })

// Inventory: list available varieties first, then fetch specific inventory
const symbols = await sdk.futures.inventorySymbols()
const inv = await sdk.futures.inventory('rb')

// COMEX inventory
const comexInv = await sdk.futures.comexInventory('AU')
```

Exact parameters (period, range, adjustment, etc.) and return fields follow the implementation.

## Options: sdk.options

`sdk.options` splits by underlying category into four sub-namespaces—`index` (index options), `etf` (ETF options), `commodity` (commodity options), `cffex` (CFFEX options)—plus a top-level `options.lhb` (options dragon-tiger list).

| Sub-namespace | Methods | Description |
|---|---|---|
| `options.index` | `spot` / `kline` | Index option real-time quote / K-line |
| `options.etf` | `months` / `expireDay` / `minute` / `dailyKline` / `fiveDayMinute` | ETF options: contract months / expiry / intraday / daily K / five-day intraday |
| `options.commodity` | `spot` / `kline` | Commodity option real-time quote / K-line |
| `options.cffex` | `quotes` | CFFEX option quotes |
| `options` (top-level) | `lhb(symbol, date)` | Options dragon-tiger list |

### Index options

```ts
// Index option real-time quote and K-line
const idxSpot = await sdk.options.index.spot('IO2412')   // illustrative
const idxKline = await sdk.options.index.kline('IO2412')
```

### ETF options

A typical ETF-options flow is "list months → get expiry → fetch quotes / K-line":

```ts
// 1. Tradable months for an ETF option
const months = await sdk.options.etf.months('10004336')

// 2. Expiry day for a given month
const expire = await sdk.options.etf.expireDay('10004336')

// 3. Market data
const minute = await sdk.options.etf.minute('10004336')        // intraday
const dailyK = await sdk.options.etf.dailyKline('10004336')    // daily K
const fiveDay = await sdk.options.etf.fiveDayMinute('10004336') // five-day intraday
```

### Commodity and CFFEX options

```ts
// Commodity options
const cmdSpot = await sdk.options.commodity.spot('m2501')  // illustrative
const cmdKline = await sdk.options.commodity.kline('m2501')

// CFFEX option quotes
const cffex = await sdk.options.cffex.quotes('IF')

// Options dragon-tiger list (top-level method)
const lhb = await sdk.options.lhb('10004336', '2025-06-06')
```

Exact inputs (contract code / month / date format) and return fields follow the implementation—see the [options](/en/api/options) API chapter and `src/sdk/namespaces/*`.

## Data contract notes

Futures and options follow v2's unified data contract too:

- Any time-bearing record carries `timestamp` (`number | null`, invalid is `null` rather than `NaN`) and `tz`.
- No more `raw` fields; if you need raw upstream data, use the provider-layer debug functions.
- Amounts / prices are in their quoting unit, with no cross-currency conversion; **stock / fund / option types carry a `currency` field (CNY/HKD/USD), while futures are quoted per exchange contract and have no `currency` field**.
