# API Overview

Stock SDK provides a comprehensive API for stock data access.

## Quick Reference

| Category | Methods | Description |
|----------|---------|-------------|
| [Real-time Quotes](/en/api/quotes) | `getFullQuotes`, `getSimpleQuotes` | A-Share real-time quotes |
| [HK Quotes](/en/api/hk-quotes) | `getHKQuotes` | Hong Kong stock quotes |
| [US Quotes](/en/api/us-quotes) | `getUSQuotes` | US stock quotes |
| [Fund Quotes](/en/api/fund-quotes) | `getFundQuotes` | Mutual fund quotes |
| [K-Line](/en/api/kline) | `getHistoryKline` | Historical K-line data |
| [Minute K-Line](/en/api/minute-kline) | `getMinuteKline` | Minute-level K-line |
| [Timeline](/en/api/timeline) | `getTodayTimeline` | Today's minute timeline |
| [Industry Sectors](/en/api/industry-board) | `getIndustryList` | Industry sector data |
| [Concept Sectors](/en/api/concept-board) | `getConceptList` | Concept sector data |
| [Indicators](/en/api/indicators) | `getKlineWithIndicators` | K-line with indicators |
| [Code Lists](/en/api/code-lists) | `getAShareCodeList` | Get all stock codes |
| [Search](/en/api/search) | `search` | Search stocks |
| [Batch](/en/api/batch) | `getAllAShareQuotes` | Batch market queries |
| [Extended Data](/en/api/fund-flow) | `getFundFlow`, `getTradingCalendar` | Fund flow, trading calendar |

## SDK Initialization

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK(options?);
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `'https://qt.gtimg.cn'` | Tencent API endpoint (can use proxy) |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `retry` | `RetryOptions` | See below | Retry configuration |
| `headers` | `Record<string, string>` | - | Custom request headers |
| `userAgent` | `string` | - | Custom User-Agent (may be ignored in browsers) |

### Retry Options (RetryOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `baseDelay` | `number` | `1000` | Initial backoff delay (ms) |
| `maxDelay` | `number` | `30000` | Maximum backoff delay (ms) |
| `backoffMultiplier` | `number` | `2` | Backoff multiplier |
| `retryableStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | HTTP status codes to retry |
| `retryOnNetworkError` | `boolean` | `true` | Retry on network errors |
| `retryOnTimeout` | `boolean` | `true` | Retry on timeout |
| `onRetry` | `function` | - | Retry callback `(attempt, error, delay) => void` |

### Example

```typescript
const sdk = new StockSDK({
  timeout: 10000,
  headers: {
    'X-Request-Source': 'my-app',
  },
  userAgent: 'StockSDK/1.4',
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt}, waiting ${delay}ms`);
    }
  }
});
```

> See [Error Handling & Retry](/en/guide/retry) for details.

## Stock Code Format

| Market | Format | Example |
|--------|--------|---------|
| Shanghai A-Share | `sh` + 6 digits | `sh600519` |
| Shenzhen A-Share | `sz` + 6 digits | `sz000858` |
| Beijing A-Share | `bj` + 6 digits | `bj430047` |
| HK Stock | 5 digits | `00700` |
| US Stock (quote) | Ticker | `AAPL` |
| US Stock (K-line) | Market + Ticker | `105.MSFT` |

::: tip US Stock Market Codes
- `105` - NASDAQ
- `106` - NYSE
- `107` - Other
:::

## Error Handling

```typescript
try {
  const quotes = await sdk.getSimpleQuotes(['sh600519']);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

## Type Exports

Stock SDK exports all TypeScript types:

```typescript
import {
  StockSDK,
  FullQuote,
  SimpleQuote,
  HKQuote,
  USQuote,
  FundQuote,
  KlineData,
  TimelineData,
  FundFlowData,
  // ... and more
} from 'stock-sdk';
```
