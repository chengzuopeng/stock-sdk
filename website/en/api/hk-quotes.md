# HK Stock Quotes

Get real-time quotes for Hong Kong stocks.

## getHKQuotes

```typescript
const quotes = await sdk.getHKQuotes(['00700', '09988']);
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| codes | `string[]` | Yes | HK stock codes (5 digits) |

### Return Type

```typescript
interface HKQuote {
  code: string;           // Stock code
  name: string;           // Stock name
  price: number;          // Current price (HKD)
  change: number;         // Price change
  changePercent: number;  // Change percentage
  volume: number;         // Trading volume
  amount: number;         // Trading amount
  high: number;           // Day high
  low: number;            // Day low
  open: number;           // Open price
  prevClose: number;      // Previous close
  time: string;           // Quote time
  high52w: number;        // 52-week high
  low52w: number;         // 52-week low
  pe: number;             // P/E ratio
  marketCap: number;      // Market cap
}
```


## getHKCodeList

Get all HK stock codes.

### Signature

```typescript
getHKCodeList(): Promise<string[]>
```

### Example

```typescript
const codes = await sdk.getHKCodeList();
// ['00700', '09988', '03690', ...]

console.log(`Total ${codes.length} HK stocks`);
```


## getAllHKShareQuotes

Get all HK stock quotes.

```typescript
const allQuotes = await sdk.getAllHKShareQuotes({
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Get HK stock quotes
const quotes = await sdk.getHKQuotes(['00700', '09988', '03690']);
quotes.forEach(q => {
  console.log(`${q.name}: HKD ${q.price} (${q.changePercent}%)`);
});
// Tencent: HKD 350.00 (1.50%)
// Alibaba-W: HKD 80.00 (-0.50%)
// Meituan-W: HKD 120.00 (2.00%)

// Get HK stock K-line
const klines = await sdk.getHKHistoryKline('00700', {
  period: 'daily',
  startDate: '20240101',
});
console.log(`Got ${klines.length} K-line records`);
```

