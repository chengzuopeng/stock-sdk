# API Reference · Namespace Map

v2 refactors v1's flat `sdk.getXxx()` into **domain-organized namespaces**. Every data-fetching capability lives under `sdk.<namespace>.<method>()`; pure-computation capabilities (indicators, signals, symbol parsing) are exported via subpaths, imported on demand and tree-shaking friendly.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

const quotes = await sdk.quotes.cn(['600519', '000001']) // namespaced call
const kline = await sdk.kline.cn('600519', { period: 'daily' })
const k = await sdk.options.etf.dailyKline('10004336') // nested namespace
```

> A `string` symbol is a first-class input: `'sh600519'` / `'600519'` / `'00700'` / `'AAPL'` all work, resolved leniently by `normalizeSymbol`. When you need object hints, use `normalizeSymbol` from `stock-sdk/symbols` first. See [Symbols & Codes](/en/guide/symbols).

## Quotes & Batch

| Namespace | Purpose | Docs |
|---|---|---|
| `sdk.quotes` | Real-time quotes: A-share full/simple, HK, US, fund, fund flow (simple), large orders, intraday timeline | [quotes](/en/api/quotes) |
| `sdk.codes` | Code lists per market: CN / US / HK / fund | [codes](/en/api/codes) |
| `sdk.batch` | Whole-market batch quotes: CN / HK / US / by-codes / raw | [batch](/en/api/batch) |

## K-line & Boards

| Namespace | Purpose | Docs |
|---|---|---|
| `sdk.kline` | A/HK/US history K-line, minute K-line, K-line with indicators, indicator signals | [kline](/en/api/kline) |
| `sdk.chips` | A/HK/US chip distribution: profit ratio / avg cost / 90-70 cost ranges & concentration / chip peak | [chips](/en/api/chips) |
| `sdk.board.industry` · `sdk.board.concept` | Industry / concept boards: list, spot, constituents, kline, minute | [board](/en/api/board) |

## Derivatives

| Namespace | Purpose | Docs |
|---|---|---|
| `sdk.options` | Options: index (`index`) / ETF (`etf`) / commodity (`commodity`) / CFFEX (`cffex`) + options LHB (`lhb`) | [options](/en/api/options) |
| `sdk.futures` | Futures: domestic/global K-line, inventory symbols and inventory data | [futures](/en/api/futures) |

## Capital Flow

| Namespace | Purpose | Docs |
|---|---|---|
| `sdk.fundFlow` | Fund flow (deep): individual / market / rank / sector rank / sector history | [fundFlow](/en/api/fund-flow) |
| `sdk.northbound` | Stock Connect / northbound: minute / summary / holding rank / history / individual | [northbound](/en/api/northbound) |
| `sdk.marketEvent` | Market events: limit-up pool / stock changes / board changes | [marketEvent](/en/api/market-event) |
| `sdk.dragonTiger` | Dragon-Tiger list: detail / stock stats / institution / branch rank / seat detail | [dragonTiger](/en/api/dragon-tiger) |
| `sdk.blockTrade` | Block trades: market stat / detail / daily stat | [blockTrade](/en/api/block-trade) |
| `sdk.margin` | Margin trading: account info / target list | [margin](/en/api/margin) |

## Funds & Utilities

| Namespace | Purpose | Docs |
|---|---|---|
| `sdk.fund` | Mutual fund extensions: dividend list / NAV history / estimate / rank history | [fund](/en/api/fund) |
| `sdk.calendar` | Trading calendar: is-trading-day / next / prev / market status | [calendar](/en/api/calendar) |
| `sdk.reference` | Reference data: dividend detail / A-share trading calendar | [reference](/en/api/reference) |
| `sdk.search(keyword)` | Stock search (top-level shortcut) | [search](/en/api/search) |

## Pure computation · subpath exports

Indicators, signals and symbol parsing are **pure functions, zero network**, with no dependency on a `StockSDK` instance. Import them from their own subpaths:

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'
import { normalizeSymbol } from 'stock-sdk/symbols'
```

| Module | Import path | Purpose | Docs |
|---|---|---|---|
| Indicators | `stock-sdk/indicators` | 14 indicators: `calcMA` / `calcMACD` / `calcBOLL` / `calcKDJ` / `calcRSI` / `calcWR` / `calcBIAS` / `calcCCI` / `calcATR` / `calcOBV` / `calcROC` / `calcDMI` / `calcSAR` / `calcKC` + `addIndicators` | [indicators](/en/api/indicators) |
| Signals | `stock-sdk/signals` | `calcSignals`: golden / death cross, overbought / oversold, etc. | [signals](/en/api/signals) |
| Symbols | `stock-sdk/symbols` | `normalizeSymbol`, `SymbolRef` type: lenient symbol parsing | [Symbols & Codes](/en/guide/symbols) |

## Conventions

- **Method table → call example → return notes** is the shared layout of every API page.
- Return values follow the v2 unified data contract: base fields `symbol` / `market` / `assetType` / `exchange` / `currency` / `timestamp` / `tz` / `source`; the `raw` field is removed; `timestamp` is `number | null` (`null` when unparseable); percentages are percentage numbers (e.g. `5.2`). Amount / price / volume have unified target units, but in the current beta runtime values still follow each provider's raw convention. See [Migrate from v1](/en/guide/migration-v1-to-v2).
- The v2 SDK is still being implemented: namespaces and method names are stable, but **exact parameters / return fields are subject to the final implementation**.
