# Minute K-Line

Get minute-level K-line data.

## getMinuteKline

```typescript
const klines = await sdk.getMinuteKline('sz000858', {
  period: '5',
  adjust: 'qfq',
});
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| code | `string` | Yes | - | Stock code |
| options.period | `'1' \| '5' \| '15' \| '30' \| '60'` | No | `'5'` | Minutes per candle |
| options.adjust | `'' \| 'qfq' \| 'hfq'` | No | `'qfq'` | Price adjustment |

### Return Type

```typescript
interface MinuteKlineData {
  time: string;    // Time (YYYY-MM-DD HH:mm)
  open: number;    // Open price
  close: number;   // Close price
  high: number;    // High price
  low: number;     // Low price
  volume: number;  // Trading volume
  amount: number;  // Trading amount
}
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 5-minute K-line
const min5 = await sdk.getMinuteKline('sz000858', {
  period: '5',
});

min5.forEach(k => {
  console.log(`${k.time}: ${k.close}`);
});
// 2024-12-17 09:35: 150.00
// 2024-12-17 09:40: 150.50
// ...

// 1-minute K-line (same as timeline)
const min1 = await sdk.getMinuteKline('sz000858', {
  period: '1',
});

// 60-minute K-line
const min60 = await sdk.getMinuteKline('sz000858', {
  period: '60',
});
```

