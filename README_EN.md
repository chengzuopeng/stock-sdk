# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-95.88%25-brightgreen.svg)](https://github.com/chengzuopeng/stock-sdk)

English | **[中文](./README.md)**

A **stock market data SDK for frontend and Node.js**.

No Python. No backend service. Fetch real-time quotes and candlestick data for **A-shares / Hong Kong stocks / US stocks / mutual funds** directly in **the browser or Node.js**.

**✨ Zero dependencies | 🌐 Browser + Node.js | 📦 <10KB | 🧠 Full TypeScript typings**

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Demo](https://chengzuopeng.github.io/stock-sdk/)

## Why stock-sdk?

If you're a frontend engineer, you may have run into these problems:

* Most stock market tooling lives in the **Python ecosystem**, and isn't friendly for frontend usage
* You want to build a quote dashboard / quick demo, without maintaining an extra backend service
* Financial APIs often have messy formats and tricky encodings (GBK / concurrency / batching)
* AkShare is great, but it’s not designed for browser or Node.js apps

**The goal of stock-sdk is simple:**

> Let frontend engineers fetch stock market data elegantly, using JavaScript / TypeScript.

---

## Use Cases

* 📊 Stock quote dashboards (Web / Admin)
* 📈 Data visualization (ECharts / TradingView)
* 🎓 Stock / finance course demos
* 🧪 Quant strategy prototyping (JS / Node)
* 🕒 Scheduled quote crawling via Node.js

---

## Features

- ✅ **Zero dependencies**, lightweight (< 10KB minified)
- ✅ Works in both **browsers** and **Node.js 18+**
- ✅ Ships both **ESM** and **CommonJS**
- ✅ Full **TypeScript** typings + unit tests
- ✅ Real-time quotes for **A-shares, HK stocks, US stocks, mutual funds**
- ✅ **Historical candlesticks (K-line)** (daily/weekly/monthly), **minute K-line** (1/5/15/30/60m), and **today’s intraday timeline**
- ✅ Extended data such as **fund flow**, **order book large orders**
- ✅ Fetch full **A-share symbol list** (5000+), and batch fetch **whole-market quotes** with built-in concurrency control

## Installation

```bash
npm install stock-sdk
# or
yarn add stock-sdk
# or
pnpm add stock-sdk
```

## Quick Start (10-line demo)

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const quotes = await sdk.getSimpleQuotes([
  'sh000001',
  'sz000858',
  'sh600519',
]);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
```

## Example: Whole-market A-share quotes

Fetch the entire A-share market (5000+ stocks) directly from the frontend, with no Python or backend service.

```ts
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});

console.log(`Fetched ${allQuotes.length} stocks`);
```

## API Documentation

### Real-time Quotes

| Method | Description |
|------|------|
| [`getFullQuotes`](#getfullquotescodes-promisefullquote) | Full quotes for A-shares / indices |
| [`getSimpleQuotes`](#getsimplequotescodes-promisesimplequote) | Simple quotes for A-shares / indices |
| [`getHKQuotes`](#gethkquotescodes-promisehkquote) | HK stock quotes |
| [`getUSQuotes`](#getusquotescodes-promiseusquote) | US stock quotes |
| [`getFundQuotes`](#getfundquotescodes-promisefundquote) | Mutual fund quotes |

### Candlestick (K-line) Data

| Method | Description |
|------|------|
| [`getHistoryKline`](#gethistoryklinesymbol-options-promisehistorykline) | Historical K-line (daily/weekly/monthly) |
| [`getMinuteKline`](#getminuteklinesymbol-options-promiseminutetimeline-minutekline) | Minute K-line (1/5/15/30/60m) |
| [`getTodayTimeline`](#gettodaytimelinecode-promisetodaytimelineresponse) | Today's intraday timeline |

### Extended Data

| Method | Description |
|------|------|
| [`getFundFlow`](#getfundflowcodes-promisefundflow) | Fund flow |
| [`getPanelLargeOrder`](#getpanellargeordercodes-promisepanellargeorder) | Large order ratios (order book) |

### Batch Query

| Method | Description |
|------|------|
| [`getAShareCodeList`](#getasharecodelistincludeexchange-promisestring) | Get all A-share symbols |
| [`getAllAShareQuotes`](#getallasharequotesoptions-promisefullquote) | Get whole-market A-share quotes |
| [`getAllQuotesByCodes`](#getallquotesbycodescodes-options-promisefullquote) | Batch fetch quotes by symbols |

---

### `getFullQuotes(codes): Promise<FullQuote[]>`

Fetch full quote data for A-shares / indices.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | Stock code array, e.g. `['sz000858', 'sh600519']` |

**Return Type**

```typescript
interface FullQuote {
  marketId: string;       // Market identifier
  name: string;           // Name
  code: string;           // Stock code
  price: number;          // Last price
  prevClose: number;      // Previous close
  open: number;           // Open
  high: number;           // High
  low: number;            // Low
  volume: number;         // Volume (lots)
  amount: number;         // Turnover (10k)
  change: number;         // Change
  changePercent: number;  // Change %
  bid: { price: number; volume: number }[];  // Bid 1~5
  ask: { price: number; volume: number }[];  // Ask 1~5
  turnoverRate: number | null;   // Turnover rate %
  pe: number | null;             // P/E (TTM)
  pb: number | null;             // P/B
  totalMarketCap: number | null; // Total market cap (100M)
  circulatingMarketCap: number | null; // Free-float market cap (100M)
  volumeRatio: number | null;    // Volume ratio
  limitUp: number | null;        // Limit-up price
  limitDown: number | null;      // Limit-down price
  // ... more fields, see type definitions
}
```

**Example**

```typescript
const quotes = await sdk.getFullQuotes(['sz000858']);
console.log(quotes[0].name);   // 五 粮 液 (Wuliangye)
console.log(quotes[0].price);  // 111.70
console.log(quotes[0].changePercent);  // 2.35
```

---

### `getSimpleQuotes(codes): Promise<SimpleQuote[]>`

Fetch simple quotes (stocks / indices).

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | Code array, e.g. `['sz000858', 'sh000001']` |

**Return Type**

```typescript
interface SimpleQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  marketCap: number | null;
  marketType: string;
}
```

**Example**

```typescript
const quotes = await sdk.getSimpleQuotes(['sh000001']);
console.log(quotes[0].name);  // 上证指数 (SSE Composite Index)
```

---

### `getHistoryKline(symbol, options?): Promise<HistoryKline[]>`

Fetch historical A-share K-line (daily/weekly/monthly). Data source: Eastmoney.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `symbol` | `string` | Stock code, e.g. `'000001'` or `'sz000001'` |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | Period, default `'daily'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | Adjustment, default `'hfq'` (back-adjusted) |
| `options.startDate` | `string` | Start date `YYYYMMDD` |
| `options.endDate` | `string` | End date `YYYYMMDD` |

**Return Type**

```typescript
interface HistoryKline {
  date: string;               // Date YYYY-MM-DD
  code: string;               // Stock code
  open: number | null;        // Open
  close: number | null;       // Close
  high: number | null;        // High
  low: number | null;         // Low
  volume: number | null;      // Volume
  amount: number | null;      // Turnover
  changePercent: number | null;  // Change %
  change: number | null;         // Change
  amplitude: number | null;      // Amplitude %
  turnoverRate: number | null;   // Turnover rate %
}
```

**Example**

```typescript
// Daily K-line (defaults to back-adjusted)
const dailyKlines = await sdk.getHistoryKline('000001');

// Weekly K-line, forward-adjusted, with date range
const weeklyKlines = await sdk.getHistoryKline('sz000858', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});
```

---

### `getMinuteKline(symbol, options?): Promise<MinuteTimeline[] | MinuteKline[]>`

Fetch minute K-line or intraday timeline for A-shares. Data source: Eastmoney.

> **Note**: `period='1'` (timeline) only returns data for the last 5 trading days.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `symbol` | `string` | Stock code, e.g. `'000001'` or `'sz000001'` |
| `options.period` | `'1' \| '5' \| '15' \| '30' \| '60'` | Period, default `'1'` (timeline) |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | Adjustment (only for 5/15/30/60), default `'hfq'` |
| `options.startDate` | `string` | Start time `YYYY-MM-DD HH:mm:ss` |
| `options.endDate` | `string` | End time `YYYY-MM-DD HH:mm:ss` |

**Example**

```typescript
// Timeline
const timeline = await sdk.getMinuteKline('000001');

// 5-minute K-line
const kline5m = await sdk.getMinuteKline('sz000858', { period: '5' });
```

---

### `getTodayTimeline(code): Promise<TodayTimelineResponse>`

Fetch today's intraday timeline data. Data source: Tencent Finance.

> **Note**: Only returns today's trading-session data. Volume/amount are cumulative values.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `code` | `string` | Stock code, e.g. `'sz000001'` |

**Return Type**

```typescript
interface TodayTimelineResponse {
  code: string;             // Stock code
  date: string;             // Trading date YYYYMMDD
  data: TodayTimeline[];    // Timeline list
}

interface TodayTimeline {
  time: string;      // Time HH:mm
  price: number;     // Trade price
  volume: number;    // Cumulative volume (shares)
  amount: number;    // Cumulative amount (CNY)
  avgPrice: number;  // VWAP-like average price for the day
}
```

**Example**

```typescript
const timeline = await sdk.getTodayTimeline('sz000001');
console.log(timeline.date);              // '20241218'
console.log(timeline.data[0].avgPrice);  // average price
```

---

### `getAShareCodeList(includeExchange?): Promise<string[]>`

Fetch the full A-share symbol list (Shanghai/Shenzhen/Beijing, 5000+ symbols).

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `includeExchange` | `boolean` | Whether to include exchange prefix, default `true` |

**Example**

```typescript
// With exchange prefix
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj430047', ...]

// Without exchange prefix
const pureCodes = await sdk.getAShareCodeList(false);
// ['600000', '000001', '430047', ...]
```

---

### `getAllAShareQuotes(options?): Promise<FullQuote[]>`

Fetch whole-market real-time A-share quotes (5000+ stocks). Return shape is the same as `getFullQuotes`.

> ⚠️ If you run into timeouts or errors, try reducing `batchSize` (e.g. `100`).

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `options.batchSize` | `number` | Symbols per request, default `500` |
| `options.concurrency` | `number` | Max concurrency, default `7` |
| `options.onProgress` | `(completed, total) => void` | Progress callback |

**Example**

```typescript
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});
console.log(`Fetched ${allQuotes.length} stocks`);
```

---

### `getAllQuotesByCodes(codes, options?): Promise<FullQuote[]>`

Batch fetch full quotes for specific symbols. Options are the same as `getAllAShareQuotes`.

```typescript
const quotes = await sdk.getAllQuotesByCodes(
  ['sz000858', 'sh600519', 'sh600000'],
  { batchSize: 100, concurrency: 2 }
);
```

---

### `getFundFlow(codes): Promise<FundFlow[]>`

Fetch fund flow data.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | Stock code array, e.g. `['sz000858']` |

**Return Type**

```typescript
interface FundFlow {
  code: string;
  name: string;
  mainInflow: number;     // Main inflow
  mainOutflow: number;    // Main outflow
  mainNet: number;        // Main net inflow
  mainNetRatio: number;   // Main net ratio
  retailInflow: number;   // Retail inflow
  retailOutflow: number;  // Retail outflow
  retailNet: number;      // Retail net inflow
  retailNetRatio: number; // Retail net ratio
  totalFlow: number;      // Total flow
  date: string;
}
```

---

### `getPanelLargeOrder(codes): Promise<PanelLargeOrder[]>`

Fetch large-order ratios from order book.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | Stock code array, e.g. `['sz000858']` |

**Return Type**

```typescript
interface PanelLargeOrder {
  buyLargeRatio: number;   // Buy large-order ratio
  buySmallRatio: number;   // Buy small-order ratio
  sellLargeRatio: number;  // Sell large-order ratio
  sellSmallRatio: number;  // Sell small-order ratio
}
```

---

### `getHKQuotes(codes): Promise<HKQuote[]>`

Fetch HK stock quotes.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | HK codes, e.g. `['09988', '00700']` |

**Example**

```typescript
const quotes = await sdk.getHKQuotes(['09988']);
console.log(quotes[0].name);  // 阿里巴巴-W (Alibaba Group)
```

---

### `getUSQuotes(codes): Promise<USQuote[]>`

Fetch US stock quotes.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | US codes, e.g. `['BABA', 'AAPL']` |

**Example**

```typescript
const quotes = await sdk.getUSQuotes(['BABA', 'AAPL']);
console.log(quotes[0].code);  // BABA.N
```

---

### `getFundQuotes(codes): Promise<FundQuote[]>`

Fetch mutual fund quotes.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `codes` | `string[]` | Fund codes, e.g. `['000001', '110011']` |

**Return Type**

```typescript
interface FundQuote {
  code: string;
  name: string;
  nav: number;      // Latest NAV per unit
  accNav: number;   // Accumulated NAV
  change: number;   // Daily change amount
  navDate: string;  // NAV date
}
```

---

### `batchRaw(params): Promise<{ key: string; fields: string[] }[]>`

Batch query with mixed params, returning the raw parsed result.

**Parameters**

| Parameter | Type | Description |
|------|------|------|
| `params` | `string` | Comma-separated params, e.g. `'sz000858,s_sh000001'` |

**Example**

```typescript
const raw = await sdk.batchRaw('sz000858,s_sh000001');
console.log(raw[0].key);     // sz000858
console.log(raw[0].fields);  // ['51', '五 粮 液', '000858', ...]
```

---

## Use Directly in the Browser

The SDK uses the native `TextDecoder` to decode GBK responses, with no extra polyfills needed.

```html
<script type="module">
  import { StockSDK } from 'https://unpkg.com/stock-sdk/dist/index.js';

  const sdk = new StockSDK();
  const quotes = await sdk.getFullQuotes(['sz000858']);
  console.log(quotes[0].name, quotes[0].price);
</script>
```

---

## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# View coverage
yarn test --coverage

# Build
yarn build

# Start playground
yarn dev
```

## License

[ISC](./LICENSE)

---

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Demo](https://chengzuopeng.github.io/stock-sdk/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

If this project helps, feel free to star it or open an issue with feedback.
