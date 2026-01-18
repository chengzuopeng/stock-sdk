# SAR - Parabolic SAR

SAR identifies trend reversal points and stop-loss levels.

## calcSAR

### Signature

```typescript
calcSAR(data: OHLCV[], options?: SAROptions): SARResult[]
```

### Parameters

```typescript
interface SAROptions {
  afStart?: number;      // Initial acceleration factor, default 0.02
  afIncrement?: number;  // AF increment, default 0.02
  afMax?: number;        // Maximum AF, default 0.2
}
```

### Return Type

```typescript
interface SARResult {
  sar: number | null;      // SAR value
  trend: 1 | -1 | null;    // Trend: 1 = up, -1 = down
  ep: number | null;       // Extreme point
  af: number | null;       // Acceleration factor
}
```

### Description

Parabolic SAR plots dots that follow price:
- In uptrend: SAR dots are below price
- In downtrend: SAR dots are above price
- When price crosses SAR: Trend reversal

### Example

```typescript
import { calcSAR } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const sar = calcSAR(klines);
console.log(sar[30].sar);    // SAR value
console.log(sar[30].trend);  // Trend: 1 or -1
```

### Usage Tips

- Price above SAR (trend = 1): Hold long position
- Price below SAR (trend = -1): Hold short position
- SAR can be used as a trailing stop-loss
- Adjust afStart and afMax to change sensitivity
