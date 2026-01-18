# ROC - Rate of Change

ROC measures the speed and magnitude of price changes.

## calcROC

### Signature

```typescript
calcROC(data: OHLCV[], options?: ROCOptions): ROCResult[]
```

### Parameters

```typescript
interface ROCOptions {
  period?: number;       // Period, default 12
  signalPeriod?: number; // Signal line period
}
```

### Return Type

```typescript
interface ROCResult {
  roc: number | null;     // ROC value (percentage)
  signal: number | null;  // Signal line
}
```

### Calculation

```
ROC = (Close - Close[N]) / Close[N] × 100
```

### Example

```typescript
import { calcROC } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const roc = calcROC(klines, { period: 12, signalPeriod: 6 });
console.log(roc[20].roc);     // ROC value
console.log(roc[25].signal);  // Signal line
```

### Usage Tips

- ROC crosses from negative to positive: Buy signal
- ROC crosses from positive to negative: Sell signal
- ROC divergence from price: Possible reversal
