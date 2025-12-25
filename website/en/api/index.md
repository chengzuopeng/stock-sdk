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
| [Industry Sectors](/en/api/industry-board) | `getIndustryBoardList` | Industry sector data |
| [Concept Sectors](/en/api/concept-board) | `getConceptBoardList` | Concept sector data |
| [Indicators](/en/api/indicators) | `getKlineWithIndicators` | K-line with indicators |
| [Code Lists](/en/api/code-lists) | `getAShareCodeList` | Get all stock codes |
| [Batch](/en/api/batch) | `getAllAShareQuotes` | Batch market queries |
| [Fund Flow](/en/api/fund-flow) | `getFundFlow` | Capital flow data |

## SDK Initialization

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// With configuration
const sdk = new StockSDK({
  baseUrl: '/api/proxy',  // Custom API endpoint
  timeout: 10000,         // Request timeout (ms)
});
```

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

