# API Overview

This page helps you quickly locate Stock SDK features and specific interfaces.

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


## Real-time Quotes

- [A-Share Quotes](/en/api/quotes)
- [HK Stock Quotes](/en/api/hk-quotes)
- [US Stock Quotes](/en/api/us-quotes)
- [Fund Quotes](/en/api/fund-quotes)

## K-Line Data

- [History K-Line](/en/api/kline)
- [Minute K-Line](/en/api/minute-kline)
- [Timeline](/en/api/timeline)

## Technical Indicators

- [Indicators Overview](/en/api/indicators)
- [MA](/en/api/indicator-ma)
- [MACD](/en/api/indicator-macd)
- [BOLL](/en/api/indicator-boll)
- [KDJ](/en/api/indicator-kdj)
- [RSI / WR](/en/api/indicator-rsi-wr)
- [BIAS](/en/api/indicator-bias)
- [CCI](/en/api/indicator-cci)
- [ATR](/en/api/indicator-atr)

## Industry Sectors

- [Industry Sectors](/en/api/industry-board)

## Concept Sectors

- [Concept Sectors](/en/api/concept-board)

## Batch & Extended

- [Code Lists](/en/api/code-lists)
- [Search](/en/api/search)
- [Batch Query](/en/api/batch)
- [Extended Data](/en/api/fund-flow) (Fund Flow, Trading Calendar, etc.)

