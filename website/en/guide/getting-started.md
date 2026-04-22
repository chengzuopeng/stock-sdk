# Quick Start

This page covers the most common setup path. By default, create one `StockSDK` instance and call the APIs directly. If you need finer request control, apply provider-level policies.

## Installation

```bash
npm install stock-sdk
```

## Create an Instance

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
```

## Optional Configuration

```ts
const sdk = new StockSDK({
  baseUrl: '/api/tencent',
  timeout: 8000,
  headers: {
    'X-Request-Source': 'quotes-dashboard',
  },
  userAgent: 'quotes-dashboard/1.0',
  retry: {
    maxRetries: 3,
    baseDelay: 800,
  },
  rateLimit: {
    requestsPerSecond: 5,
    maxBurst: 10,
  },
  rotateUserAgent: true,
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: {
        requestsPerSecond: 3,
        maxBurst: 3,
      },
      circuitBreaker: {
        failureThreshold: 4,
        resetTimeout: 45000,
        halfOpenRequests: 1,
      },
    },
  },
});
```

> Reuse the same instance inside your app whenever possible.

## Fetch Real-time Quotes

```ts
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach((item) => {
  console.log(`${item.name}: ${item.price} (${item.changePercent}%)`);
});
```

Code format notes:

- A-share / index: `sh000001`, `sz000858`, `bj430047`
- HK: `00700`
- US quotes: `AAPL`, `MSFT`
- US K-line: `105.AAPL`, `106.BABA`

## Fetch K-line with Indicators

```ts
const data = await sdk.getKlineWithIndicators('sz000858', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    obv: { maPeriod: 20 },
    sar: true,
  },
});

console.log(data[30].ma?.ma5);
console.log(data[30].macd?.dif);
console.log(data[30].obv?.obvMa);
console.log(data[30].sar?.sar);
```

## Fetch Full-market Data

```ts
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`Batch progress: ${completed}/${total}`);
  },
});

console.log(allQuotes.length);
```

## HK and US Markets

```ts
const hkQuotes = await sdk.getHKQuotes(['00700', '09988']);
const usQuotes = await sdk.getUSQuotes(['AAPL', 'MSFT']);

const hkKlines = await sdk.getHKHistoryKline('00700', {
  period: 'daily',
  startDate: '20240101',
});

const usKlines = await sdk.getUSHistoryKline('105.MSFT', {
  period: 'daily',
  startDate: '20240101',
});
```

## Futures and Options

```ts
const futures = await sdk.getFuturesKline('RBM', {
  period: 'daily',
  startDate: '20250101',
});

const optionSpot = await sdk.getIndexOptionSpot('io', 'io2504');

console.log(futures[0]?.close);
console.log(optionSpot.calls[0]?.symbol);
```

## Dividend and Trading Calendar

```ts
const dividends = await sdk.getDividendDetail('600519');
const calendar = await sdk.getTradingCalendar();

console.log(dividends[0]?.assignProgress);
console.log(calendar[0]?.date, calendar[0]?.isOpen);
```

## Next Steps

- [Request Governance](/en/guide/request-governance)
- [Technical Indicators](/en/guide/indicators)
- [Futures & Options](/en/guide/futures-options)
- [Dividend & Calendar](/en/guide/dividend-calendar)
- [API Overview](/en/api/)
