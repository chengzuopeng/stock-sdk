# Migrate from v1 to v2

v2 is an **architectural leap**, not "more endpoints". Without adding data sources, it reworks the symbol model, data contract, API surface, request layer, and error system. v2 is a **hard, single-track switch** — there is no `compat` entry point and no legacy type aliases. This page helps you move v1 code to v2 smoothly.

## Overview: what changed from v1 to v2

| Aspect | v1 | v2 |
|---|---|---|
| API surface | Flat `sdk.getXxx()` (105 methods) | Namespaces `sdk.<ns>.<method>()` |
| Symbol input | Per-method ad-hoc formats | `string` first-class + `SymbolRef`, unified `normalizeSymbol` |
| Quote types | `FullQuote` / `HKQuote` / `USQuote` … each separate | `Quote` discriminated union (by `assetType`) |
| Escape hatch | `raw: string[]` on return values | `raw` removed; provider-level `getXxxRaw()` debug functions |
| Invalid time | `timestamp: NaN` | `timestamp: number \| null` |
| Errors | Leaks raw `TypeError` / `DOMException` / `HttpError` | Unified `SdkError` system (with `code`) |
| Exports | Single entry | Main entry + subpaths (`indicators` / `signals` / `symbols` …) |

## 1. Method mapping: sdk.getXxx() → sdk.&lt;ns&gt;.&lt;method&gt;()

All methods move into namespaces, with **no compatibility aliases**. The tables below cover the common mappings; see the [API Overview](/en/api/) for all namespaces.

### quotes

| v1 | v2 |
|---|---|
| `sdk.getFullQuotes(codes)` | `sdk.quotes.cn(codes)` |
| `sdk.getSimpleQuotes(codes)` | `sdk.quotes.cnSimple(codes)` |
| `sdk.getHKQuotes(codes)` | `sdk.quotes.hk(codes)` |
| `sdk.getUSQuotes(codes)` | `sdk.quotes.us(codes)` |
| `sdk.getFundQuotes(codes)` | `sdk.quotes.fund(codes)` |
| `sdk.getFundFlow(codes)` | `sdk.quotes.fundFlow(codes)` (lite) |
| `sdk.getPanelLargeOrder(codes)` | `sdk.quotes.largeOrder(codes)` |
| `sdk.getTodayTimeline(code)` | `sdk.quotes.timeline(code)` |

### codes / batch

| v1 | v2 |
|---|---|
| `sdk.getAShareCodeList(opts)` | `sdk.codes.cn(opts)` |
| `sdk.getUSCodeList(opts)` | `sdk.codes.us(opts)` |
| `sdk.getHKCodeList()` | `sdk.codes.hk()` |
| `sdk.getFundCodeList()` | `sdk.codes.fund()` |
| `sdk.getAllAShareQuotes(opts)` | `sdk.batch.cn(opts)` |
| `sdk.getAllHKShareQuotes(opts)` | `sdk.batch.hk(opts)` |
| `sdk.getAllUSShareQuotes(opts)` | `sdk.batch.us(opts)` |
| `sdk.getAllQuotesByCodes(codes, opts)` | `sdk.batch.byCodes(codes, opts)` |
| `sdk.batchRaw(params)` | `sdk.batch.raw(params)` |

### kline

| v1 | v2 |
|---|---|
| `sdk.getHistoryKline(...)` | `sdk.kline.cn(...)` |
| `sdk.getMinuteKline(...)` | `sdk.kline.cnMinute(...)` |
| `sdk.getHKHistoryKline(...)` | `sdk.kline.hk(...)` |
| `sdk.getHKMinuteKline(...)` | `sdk.kline.hkMinute(...)` |
| `sdk.getUSHistoryKline(...)` | `sdk.kline.us(...)` |
| `sdk.getUSMinuteKline(...)` | `sdk.kline.usMinute(...)` |
| `sdk.getKlineWithIndicators(...)` | `sdk.kline.withIndicators(...)` |

### board / options / futures (second-level namespaces)

| v1 | v2 |
|---|---|
| `sdk.getIndustryList()` / `getIndustrySpot(s)` … | `sdk.board.industry.list()` / `.spot(s)` … |
| `sdk.getConceptList()` / `getConceptConstituents(s)` … | `sdk.board.concept.list()` / `.constituents(s)` … |
| `sdk.getIndexOptionSpot(...)` / `getIndexOptionKline(...)` | `sdk.options.index.spot(...)` / `.kline(...)` |
| `sdk.getETFOptionDailyKline(...)` | `sdk.options.etf.dailyKline(...)` |
| `sdk.getETFOption5DayMinute(...)` | `sdk.options.etf.fiveDayMinute(...)` |
| `sdk.getCommodityOptionSpot(...)` | `sdk.options.commodity.spot(...)` |
| `sdk.getCFFEXOptionQuotes(...)` | `sdk.options.cffex.quotes(...)` |
| `sdk.getOptionLHB(symbol, date)` | `sdk.options.lhb(symbol, date)` |
| `sdk.getFuturesKline(...)` | `sdk.futures.kline(...)` |
| `sdk.getGlobalFuturesSpot(...)` | `sdk.futures.globalSpot(...)` |
| `sdk.getComexInventory(...)` | `sdk.futures.comexInventory(...)` |

### Remaining namespaces (single level)

| v1 | v2 |
|---|---|
| `sdk.getIndividualFundFlow(...)` / `getSectorFundFlowRank(...)` … | `sdk.fundFlow.individual(...)` / `.sectorRank(...)` … |
| `sdk.getNorthboundFlowSummary(...)` / `getNorthboundHistory(...)` … | `sdk.northbound.summary(...)` / `.history(...)` … |
| `sdk.getZTPool(...)` / `getStockChanges(...)` | `sdk.marketEvent.ztPool(...)` / `.stockChanges(...)` |
| `sdk.getDragonTigerDetail(...)` / `getDragonTigerInstitution(...)` … | `sdk.dragonTiger.detail(...)` / `.institution(...)` … |
| `sdk.getBlockTradeDetail(...)` / `getBlockTradeDailyStat(...)` | `sdk.blockTrade.detail(...)` / `.dailyStat(...)` |
| `sdk.getMarginAccountInfo(...)` / `getMarginTargetList(...)` | `sdk.margin.accountInfo(...)` / `.targetList(...)` |
| `sdk.getFundNavHistory(...)` / `getFundEstimate(...)` … | `sdk.fund.navHistory(...)` / `.estimate(...)` … |
| `sdk.isTradingDay(...)` / `nextTradingDay(...)` … | `sdk.calendar.isTradingDay(...)` / `.nextTradingDay(...)` … |
| `sdk.getDividendDetail(symbol)` / `getTradingCalendar()` | `sdk.reference.dividendDetail(symbol)` / `.tradingCalendar()` |
| `sdk.search(keyword)` | `sdk.search(keyword)` (kept at top level) |

> Indicator computation moves from the main package to a subpath: `import { calcMACD } from 'stock-sdk/indicators'`; signals `import { calcSignals } from 'stock-sdk/signals'`; symbol parsing `import { normalizeSymbol } from 'stock-sdk/symbols'`.

## 2. Data contract changes

### raw fields removed

In v1, 8 return types carried `raw: string[]` (`FullQuote` / `HKQuote` / `USQuote` / `FundQuote` / `FundFlow` …). v2 **removes all of them**; the escape hatch becomes provider-level `getXxxRaw()` debug functions and no longer pollutes data objects.

```ts
// v1
const [q] = await sdk.getFullQuotes(['sh600519']);
console.log(q.raw); // ['1', 'Kweichow Moutai', ...]

// v2: no raw in the contract; use provider-level debug functions for raw fields
```

### Units and conventions

- `volume` (turnover volume) targets a unified unit of **shares**;
- `amount` / `price` / market cap target **each instrument's quote currency major unit** (A-share = CNY, Hong Kong = HKD, US = USD, indicated by `currency`, **no cross-currency conversion**);
- Percentages are unified as **percent numbers** (e.g. `5.2` means 5.2%).

> This is the v2 target data contract. Once it fully lands, some values will change in magnitude relative to v1, so **backtest / display logic must be recalibrated**. The `currency` field is now required on every quote.
>
> ⚠️ Unit conversions (lots→shares ×100, 10k→unit ×10000, etc.) must be calibrated against real data per source; for now each source emits its original convention, with calibration landing later. Subject to the final implementation.

### timestamp: NaN → null

Unparseable times were expressed as `NaN` in v1; v2 uses `null`. A `tz` (market timezone) field is also added.

```ts
// v1: check with Number.isNaN
if (Number.isNaN(q.timestamp)) { /* invalid */ }

// v2: check with === null
if (q.timestamp === null) { /* invalid */ }
```

### Quote discriminated union

Quote types collapse from "separate interfaces" into a union `Quote` discriminated by `assetType`. Old type names (`FullQuote` / `HKUSHistoryKline`, etc.) may remain as compatibility aliases, but new code should target `Quote`. Callers narrow with `switch`:

```ts
import type { Quote } from 'stock-sdk';

function render(q: Quote) {
  switch (q.assetType) {
    case 'stock':
      // q is narrowed to a stock quote here: pe / bid / ask available
      console.log(q.price, q.changePercent);
      break;
    case 'fund':
      // narrowed to a fund quote: nav / accNav available
      console.log(q.nav, q.accNav);
      break;
  }
}
```

> The exact discriminator dimensions and per-branch fields are subject to the final implementation; the migration pattern (`switch(q.assetType)`) is stable.

## 3. Error system

v2 **throws only `SdkError`** externally — it no longer leaks raw `TypeError` / `DOMException` / `RangeError`. Every error carries a unified `code` and can be imported from `stock-sdk/errors`.

Available error codes (`SdkErrorCode`):

```
NETWORK_ERROR · TIMEOUT · ABORTED · HTTP_ERROR · RATE_LIMITED
CIRCUIT_OPEN · UPSTREAM_EMPTY · UPSTREAM_ERROR · PARSE_ERROR
INVALID_SYMBOL · INVALID_ARGUMENT · NOT_FOUND
```

`ABORTED` (external signal cancellation, distinct from `TIMEOUT`) and `UPSTREAM_ERROR` (upstream returned a structured error, distinct from empty data `UPSTREAM_EMPTY`) are new in v2.

Error subclasses: `HttpError` / `UpstreamEmptyError` / `UpstreamError` / `AbortedError` / `NotFoundError` / `InvalidArgumentError` / `InvalidSymbolError`.

```ts
// v1: you might get DOMException / TypeError / HttpError
try {
  await sdk.getSimpleQuotes(['sh000001']);
} catch (e) {
  if (e instanceof DOMException && e.name === 'AbortError') { /* timeout */ }
}

// v2: unified SdkError, classify by code
import { SdkError, getSdkErrorCode } from 'stock-sdk/errors';

try {
  await sdk.quotes.cnSimple(['sh000001']);
} catch (e) {
  if (e instanceof SdkError) {
    switch (e.code) {
      case 'TIMEOUT':    /* timeout */ break;
      case 'ABORTED':    /* externally cancelled */ break;
      case 'HTTP_ERROR': /* non-2xx */ break;
    }
  }
  console.log(getSdkErrorCode(e));
}
```

See [Errors & Retry](/en/guide/retry) for details.

## 4. Full before / after

```ts
// ============ v1 ============
import { StockSDK } from 'stock-sdk';
import { calcMACD } from 'stock-sdk'; // main-package export

const sdk = new StockSDK();

const quotes = await sdk.getFullQuotes(['sh600519']);
const kline = await sdk.getETFOptionDailyKline('10004336');
const dividends = await sdk.getDividendDetail('600519');

console.log(quotes[0].raw);

try {
  await sdk.getSimpleQuotes(['bad']);
} catch (e) {
  if (e instanceof DOMException) { /* ... */ }
}
```

```ts
// ============ v2 ============
import { StockSDK } from 'stock-sdk';
import { calcMACD } from 'stock-sdk/indicators'; // subpath export
import { SdkError } from 'stock-sdk/errors';

const sdk = new StockSDK();

const quotes = await sdk.quotes.cn(['sh600519']); // or ['600519']
const kline = await sdk.options.etf.dailyKline('10004336');
const dividends = await sdk.reference.dividendDetail('600519');

// no more raw; invalid timestamp is null
if (quotes[0].timestamp === null) { /* no valid time */ }

try {
  await sdk.quotes.cnSimple(['bad']);
} catch (e) {
  if (e instanceof SdkError) {
    console.log(e.code); // unified error code
  }
}
```

## 5. Other cleanups

- v1 flat methods are removed. Some legacy fields / type names may remain as compatibility aliases; the final source of truth is the type definitions.
- Old `boolean` signatures removed: `getAShareCodeList(boolean)` / `getUSCodeList(boolean)` keep only the options-object signature (v2 `codes.cn(opts)` / `codes.us(opts)`).
- Node baseline stays at `>=18` (`AbortSignal.any` with a runtime fallback).
- New subpath exports: `stock-sdk/{indicators,symbols,signals,screener,cache,errors,mcp}`.

## Suggested migration steps

1. **Rename methods**: convert every `sdk.getXxx()` to `sdk.<ns>.<method>()` per the mapping tables.
2. **Fix import paths**: move indicators / signals / symbols / errors to their subpaths.
3. **Drop `raw` usage**: the contract no longer has a `raw` field.
4. **Change time null-checks**: `Number.isNaN(timestamp)` → `timestamp === null`.
5. **Update error handling**: standardize on `instanceof SdkError` + `e.code`; remove checks for raw `DOMException` / `TypeError`.
6. **Recalibrate value magnitudes**: volume / amount / percentage conventions changed; review backtest and display logic.
7. **Narrow the Quote union**: use `switch(q.assetType)` instead of depending on old concrete types.

> Method mappings and contract changes are stable conventions; the exact parameters / return fields of individual methods are subject to the final implementation.
