# KDJ

Stochastic oscillator indicator.

## Usage

```typescript
const data = await sdk.getKlineWithIndicators('sz000858', {
  indicators: { kdj: true }
});

data.forEach(k => {
  console.log(`K: ${k.kdj?.k}, D: ${k.kdj?.d}, J: ${k.kdj?.j}`);
});
```

## Manual Calculation

```typescript
import { calcKDJ } from 'stock-sdk';

const ohlc = [
  { open: 10, high: 11, low: 9.5, close: 10.5 },
  { open: 10.5, high: 11.2, low: 10.1, close: 10.9 },
];

const result = calcKDJ(ohlc, {
  period: 9,
  kPeriod: 3,
  dPeriod: 3,
});

// result[0].k - K line
// result[0].d - D line
// result[0].j - J line
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| period | 9 | RSV period |
| kPeriod | 3 | K smoothing period |
| dPeriod | 3 | D smoothing period |

## Formula

$$RSV = \frac{Close - Low_n}{High_n - Low_n} \times 100$$
$$K = \frac{2}{3} K_{prev} + \frac{1}{3} RSV$$
$$D = \frac{2}{3} D_{prev} + \frac{1}{3} K$$
$$J = 3K - 2D$$
