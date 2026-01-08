# Quick Start

This guide will help you get started with Stock SDK in minutes.

## Installation

```bash
npm install stock-sdk
```

## Basic Usage

### 1. Create SDK Instance

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
```

#### Optional Configuration

`StockSDK` accepts request configuration for proxy, timeout, or custom headers:

```typescript
const sdk = new StockSDK({
  // Custom Tencent quote request URL (e.g., local proxy /api/tencent)
  baseUrl: '/api/tencent',
  // Request timeout (milliseconds)
  timeout: 8000,
  // Custom headers
  headers: {
    'X-Request-Source': 'my-app',
  },
  // Custom User-Agent (may be ignored in browsers)
  userAgent: 'StockSDK/1.4',
  // Retry configuration (optional)
  retry: {
    maxRetries: 5,       // Maximum retry attempts
    baseDelay: 1000,     // Initial backoff delay
  }
});
```

> It's recommended to reuse the same `StockSDK` instance to reduce repeated initialization.
> 
> See [Error Handling & Retry](/en/guide/retry) for detailed retry configuration.

### 2. Get Stock Quotes

```typescript
// Get simple quotes
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
// Shanghai Index: 3200.00 (0.50%)
// Wuliangye: 150.00 (2.35%)
// Moutai: 1800.00 (1.20%)
```

::: tip Code Format
- **A-Share/Index**: With exchange prefix (`sh`/`sz`/`bj`), e.g., `sh000001`, `sz000858`
- **HK Stock**: 5-digit number, e.g., `00700`
- **US Stock**: Use `AAPL`, `MSFT` for quotes; Use `105.AAPL`, `106.BABA` for K-line
:::

### 3. Get Full Quotes

```typescript
// Get detailed quote data
const fullQuotes = await sdk.getFullQuotes(['sz000858']);

const quote = fullQuotes[0];
console.log(`
Stock: ${quote.name} (${quote.code})
Price: ${quote.price}
Change: ${quote.changePercent}%
Volume: ${quote.volume}
Amount: ${quote.amount}
Turnover: ${quote.turnoverRate}%
PE: ${quote.pe}
Market Cap: ${quote.totalMarketCap}
`);
```

### 4. Get Historical K-Line

```typescript
// Get daily K-line (default: backward-adjusted)
const klines = await sdk.getHistoryKline('sz000858', {
  period: 'daily',
  startDate: '20240101',
  endDate: '20241231',
});

klines.forEach(k => {
  console.log(`${k.date}: O ${k.open} H ${k.high} L ${k.low} C ${k.close}`);
});
```

### 5. Get K-Line with Technical Indicators

```typescript
const data = await sdk.getKlineWithIndicators('sz000858', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
  }
});

data.forEach(k => {
  console.log(`${k.date}: Close ${k.close}`);
  console.log(`  MA5=${k.ma?.ma5}, MA10=${k.ma?.ma10}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: Upper=${k.boll?.upper}, Mid=${k.boll?.mid}, Lower=${k.boll?.lower}`);
  console.log(`  KDJ: K=${k.kdj?.k}, D=${k.kdj?.d}, J=${k.kdj?.j}`);
});
```

### 6. Get Fund Flow (Optional)

```typescript
const flows = await sdk.getFundFlow(['sz000858', 'sh600519']);
flows.forEach(f => {
  console.log(`${f.name}: Main Net Inflow ${f.mainNet}`);
});
```

### 7. Get Today's Timeline (Optional)

```typescript
const timeline = await sdk.getTodayTimeline('sz000001');
console.log(timeline.date, timeline.data[0]);
```

## HK & US Stocks

### HK Stock Quotes

```typescript
// Get HK stock quotes
const hkQuotes = await sdk.getHKQuotes(['00700', '09988']);
console.log(hkQuotes[0].name);  // Tencent

// Get HK stock K-line
const hkKlines = await sdk.getHKHistoryKline('00700', {
  period: 'daily',
  startDate: '20240101',
});
```

### US Stock Quotes

```typescript
// Get US stock quotes
const usQuotes = await sdk.getUSQuotes(['AAPL', 'MSFT', 'BABA']);
console.log(usQuotes[0].name);  // Apple

// Get US stock K-line (use {market}.{ticker} format)
const usKlines = await sdk.getUSHistoryKline('105.MSFT', {
  period: 'daily',
  startDate: '20240101',
});
```

::: tip US Stock Code Format
- `105` = NASDAQ (e.g., `105.AAPL`, `105.MSFT`)
- `106` = NYSE (e.g., `106.BABA`)
- `107` = Other US markets
:::

## Batch Get All Market Quotes

```typescript
// Get all A-Share codes
const codes = await sdk.getAShareCodeList();
console.log(`Total ${codes.length} stocks`);
// Total 5000+ stocks

// Get all A-Share quotes
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});
console.log(`Got ${allQuotes.length} stocks`);
```

## Next Steps

- Check [API Documentation](/en/api/) for all available methods
- Try [Online Playground](/en/playground/) for interactive experience
- Learn about [Technical Indicators](/en/guide/indicators)
