# Quick Start

This page walks you through the v2 namespaced API with a few minimal examples. Make sure you've finished [Installation](/en/guide/installation) first.

## Create an instance

`StockSDK` is the single entry point; every namespace hangs off the instance:

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
```

The constructor takes optional configuration (custom `fetch`, an external `AbortSignal`, request hooks, caching, etc.); omit it to use defaults. See [Request Governance](/en/guide/request-governance).

## A 10-line demo

Fetch a real-time A-share quote and print its price and change:

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

const quotes = await sdk.quotes.cn(['sh600519'])
const q = quotes[0]

console.log(q.name)           // name
console.log(q.price)          // last price (in the quote-currency major unit)
console.log(q.changePercent)  // change (percentage points, e.g. 5.2 means 5.2%)
```

> A symbol `string` is a first-class citizen — `'sh600519'`, `'600519'`, and `{ code: '600519' }` are all recognized. Returned fields follow the final implementation.

## Common usage

### Real-time quotes across markets

```ts
await sdk.quotes.cn(['sh600519', '000001'])  // A-shares
await sdk.quotes.hk(['00700'])               // Hong Kong
await sdk.quotes.us(['AAPL'])                // US
await sdk.quotes.fund(['510300'])            // funds
```

### Historical K-lines

```ts
// A-share daily K-line
const kline = await sdk.kline.cn('600519', { period: 'day' })

// Minute K-lines / HK / US
await sdk.kline.cnMinute('600519')
await sdk.kline.hk('00700', { period: 'day' })
await sdk.kline.us('AAPL', { period: 'day' })
```

> Exact K-line parameters (period, adjustment, count, date range, etc.) follow the implementation.

### K-line with technical indicators

```ts
// Return K-lines with indicators directly
const withInd = await sdk.kline.withIndicators('600519', {
  indicators: ['MA', 'MACD'],
})
```

You can also fetch raw K-lines first, then attach indicators with pure functions (no network call):

```ts
import { addIndicators } from 'stock-sdk/indicators'

const kline = await sdk.kline.cn('600519', { period: 'day' })
const enriched = addIndicators(kline, ['MA', 'MACD', 'KDJ'])
```

### Detect buy/sell signals

```ts
import { addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'

const kline = await sdk.kline.cn('600519', { period: 'day' })
const enriched = addIndicators(kline, ['MA', 'MACD'])

const signals = calcSignals(enriched, {
  ma: { fast: 5, slow: 20 },  // golden / death cross
  macd: true,
})
// [{ type: 'ma_golden_cross', at, index, detail }, ...]
```

### Search instruments

```ts
const results = await sdk.search('Kweichow Moutai')
```

### Trading calendar

```ts
await sdk.calendar.isTradingDay('2026-06-08')
await sdk.calendar.nextTradingDay('2026-06-08')
await sdk.calendar.marketStatus('CN')
```

### Boards and derivatives

```ts
await sdk.board.industry.list()             // industry board list
await sdk.board.concept.constituents('半导体') // concept board constituents

await sdk.options.etf.dailyKline('10004336') // ETF option daily K-line
await sdk.futures.kline('rb2510')            // futures K-line
```

### Capital flow

```ts
await sdk.fundFlow.individual('600519')    // per-stock fund flow
await sdk.northbound.summary()             // northbound capital summary
await sdk.dragonTiger.detail('2026-06-06') // dragon-tiger list
```

## Error handling

v2 only throws `SdkError`, carrying a stable `code` field so you can branch by type:

```ts
import { SdkError } from 'stock-sdk/errors'

try {
  await sdk.quotes.cn(['sh600519'])
} catch (err) {
  if (err instanceof SdkError) {
    console.error(err.code, err.message) // e.g. 'TIMEOUT' / 'HTTP_ERROR'
  }
}
```

See [Errors & Retry](/en/guide/retry).

## Next steps

- [Symbols & Codes](/en/guide/symbols): tolerant parsing of `string` / `SymbolRef` and known ambiguities.
- [Indicators & Signals](/en/guide/indicators): the full picture of indicator functions and the signal layer.
- [API overview](/en/api/): the namespace map and full method tables.
- [Migrate from v1](/en/guide/migration-v1-to-v2): method mapping and contract changes.
