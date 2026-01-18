# OBV - On Balance Volume

OBV accumulates volume to judge price trends.

## calcOBV

### Signature

```typescript
calcOBV(data: OHLCV[], options?: OBVOptions): OBVResult[]
```

### Parameters

```typescript
interface OBVOptions {
  maPeriod?: number;  // OBV moving average period
}
```

### Return Type

```typescript
interface OBVResult {
  obv: number | null;    // OBV value
  obvMa: number | null;  // OBV moving average
}
```

### Calculation

```
If close > prev.close: OBV = prev.OBV + volume
If close < prev.close: OBV = prev.OBV - volume
If close = prev.close: OBV = prev.OBV
```

### Example

```typescript
import { calcOBV } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const obv = calcOBV(klines, { maPeriod: 20 });
console.log(obv[30].obv);    // OBV value
console.log(obv[30].obvMa);  // OBV 20-day MA
```

### Usage Tips

- OBV rising + price rising: Uptrend confirmed
- OBV falling + price rising: Possible false breakout
- OBV divergence from price: Possible reversal
