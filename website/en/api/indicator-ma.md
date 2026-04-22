# MA (Moving Average)

Moving Average calculation functions.

## Usage in getKlineWithIndicators

```typescript
const data = await sdk.getKlineWithIndicators('sz000858', {
  indicators: {
    ma: { periods: [5, 10, 20, 60] }
  }
});

data.forEach(k => {
  console.log(`MA5: ${k.ma?.ma5}, MA10: ${k.ma?.ma10}`);
});
```

## Manual Calculation

```typescript
import { calcMA, calcSMA, calcEMA, calcWMA } from 'stock-sdk';

const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// Simple Moving Average
const sma5 = calcSMA(closes, 5);

// Exponential Moving Average
const ema5 = calcEMA(closes, 5);

// Weighted Moving Average
const wma5 = calcWMA(closes, 5);

// Generic MA with type
const ma = calcMA(closes, {
  periods: [5, 10, 20],
  type: 'sma',
});
```

## Formula

**SMA (Simple Moving Average)**
$$SMA = \frac{\sum_{i=1}^{n} P_i}{n}$$

**EMA (Exponential Moving Average)**
$$EMA_t = \alpha \times P_t + (1 - \alpha) \times EMA_{t-1}$$

Where $\alpha = \frac{2}{n + 1}$

**WMA (Weighted Moving Average)**
$$WMA = \frac{\sum_{i=1}^{n} (w_i \times P_i)}{\sum_{i=1}^{n} w_i}$$
