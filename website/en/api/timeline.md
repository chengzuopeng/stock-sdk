# Timeline

Get today's minute-by-minute timeline data.

## getTodayTimeline

```typescript
const timeline = await sdk.getTodayTimeline('sz000858');
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | `string` | Yes | Stock code |

### Return Type

```typescript
interface TodayTimelineResponse {
  code: string;             // Stock code
  date: string;             // Date (YYYYMMDD)
  preClose?: number;        // Previous close, may be missing in upstream edge cases
  data: TodayTimeline[];    // Timeline data points
}

interface TodayTimeline {
  time: string;     // Time (HHmm)
  price: number;    // Trade price
  avgPrice: number; // Average price
  volume: number;   // Volume at this minute
  amount: number;   // Amount at this minute
}
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const timeline = await sdk.getTodayTimeline('sz000858');

console.log(`Date: ${timeline.date}`);
console.log(`Previous Close: ${timeline.preClose ?? 'unknown'}`);
console.log(`Data Points: ${timeline.data.length}`);

// First few data points
timeline.data.slice(0, 5).forEach(p => {
  console.log(`${p.time}: Price ${p.price}, Avg ${p.avgPrice}`);
});
// 0931: Price 150.00, Avg 150.00
// 0932: Price 150.20, Avg 150.10
// 0933: Price 150.15, Avg 150.12
```
