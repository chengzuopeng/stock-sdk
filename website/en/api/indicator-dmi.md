# DMI/ADX - Directional Movement Index

DMI determines trend direction and strength.

## calcDMI

### Signature

```typescript
calcDMI(data: OHLCV[], options?: DMIOptions): DMIResult[]
```

### Parameters

```typescript
interface DMIOptions {
  period?: number;     // Period, default 14
  adxPeriod?: number;  // ADX smoothing period
}
```

### Return Type

```typescript
interface DMIResult {
  pdi: number | null;   // +DI (Plus Directional Indicator)
  mdi: number | null;   // -DI (Minus Directional Indicator)
  adx: number | null;   // ADX (Average Directional Index)
  adxr: number | null;  // ADXR (ADX Rating)
}
```

### Components

- **+DI**: Measures upward momentum
- **-DI**: Measures downward momentum
- **ADX**: Measures trend strength (regardless of direction)
- **ADXR**: Smoothed ADX

### Example

```typescript
import { calcDMI } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const dmi = calcDMI(klines, { period: 14 });
console.log(dmi[30].pdi);  // +DI
console.log(dmi[30].mdi);  // -DI
console.log(dmi[30].adx);  // ADX
```

### Usage Tips

- +DI > -DI: Uptrend
- -DI > +DI: Downtrend
- ADX > 25: Strong trend
- ADX < 20: Sideways/ranging market
- +DI/-DI crossover: Trend change signal
