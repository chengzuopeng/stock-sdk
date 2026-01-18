# KC - Keltner Channel

KC is an ATR-based price channel indicator.

## calcKC

### Signature

```typescript
calcKC(data: OHLCV[], options?: KCOptions): KCResult[]
```

### Parameters

```typescript
interface KCOptions {
  emaPeriod?: number;   // EMA period, default 20
  atrPeriod?: number;   // ATR period, default 10
  multiplier?: number;  // ATR multiplier, default 2
}
```

### Return Type

```typescript
interface KCResult {
  mid: number | null;    // Middle band (EMA)
  upper: number | null;  // Upper band
  lower: number | null;  // Lower band
  width: number | null;  // Channel width (percentage)
}
```

### Calculation

```
Middle = EMA(close, emaPeriod)
Upper = Middle + multiplier × ATR
Lower = Middle - multiplier × ATR
Width = (Upper - Lower) / Middle × 100
```

### Example

```typescript
import { calcKC } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const kc = calcKC(klines, { emaPeriod: 20, multiplier: 2 });
console.log(kc[30].upper);  // Upper band
console.log(kc[30].mid);    // Middle band
console.log(kc[30].lower);  // Lower band
console.log(kc[30].width);  // Channel width
```

### Usage Tips

- Compared to Bollinger Bands, KC reacts more smoothly to price changes
- Price breaks above upper: Potential buy signal
- Price breaks below lower: Potential sell signal
- Channel narrowing: Possible breakout incoming
- Can be combined with Bollinger Bands for "squeeze" patterns
