# Technical Indicators

Get K-line data with built-in technical indicator calculations.

## getKlineWithIndicators

One-stop API to get K-line with multiple indicators.

```typescript
const data = await sdk.getKlineWithIndicators('sz000858', {
  period: 'daily',
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
    rsi: { periods: [6, 12, 24] },
    wr: true,
    bias: { periods: [6, 12, 24] },
    cci: true,
    atr: true,
  }
});
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | `string` | Yes | Stock code |
| options.period | `'daily' \| 'weekly' \| 'monthly'` | No | K-line period |
| options.startDate | `string` | No | Start date |
| options.endDate | `string` | No | End date |
| options.adjust | `'' \| 'qfq' \| 'hfq'` | No | Price adjustment |
| options.indicators | `IndicatorConfig` | No | Indicators to calculate |

### Indicator Configuration

```typescript
interface IndicatorConfig {
  ma?: { periods: number[] };      // Moving Average
  macd?: boolean;                   // MACD
  boll?: boolean;                   // Bollinger Bands
  kdj?: boolean;                    // KDJ
  rsi?: { periods: number[] };     // RSI
  wr?: boolean;                     // Williams %R
  bias?: { periods: number[] };    // BIAS
  cci?: boolean;                    // CCI
  atr?: boolean;                    // ATR
}
```

### Return Type

Each K-line record includes indicator values:

```typescript
interface KlineWithIndicators extends KlineData {
  ma?: {
    ma5?: number;
    ma10?: number;
    ma20?: number;
    ma60?: number;
    // ... dynamic based on periods
  };
  macd?: {
    dif: number;
    dea: number;
    macd: number;
  };
  boll?: {
    upper: number;
    mid: number;
    lower: number;
  };
  kdj?: {
    k: number;
    d: number;
    j: number;
  };
  rsi?: {
    rsi6?: number;
    rsi12?: number;
    rsi24?: number;
  };
  wr?: {
    wr6: number;
    wr10: number;
  };
  bias?: {
    bias6?: number;
    bias12?: number;
    bias24?: number;
  };
  cci?: {
    cci: number;
  };
  atr?: {
    atr: number;
  };
}
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const data = await sdk.getKlineWithIndicators('sz000858', {
  startDate: '20240101',
  indicators: {
    ma: { periods: [5, 10, 20] },
    macd: true,
    boll: true,
  }
});

data.forEach(k => {
  console.log(`${k.date}: Close ${k.close}`);
  console.log(`  MA: 5=${k.ma?.ma5}, 10=${k.ma?.ma10}, 20=${k.ma?.ma20}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: Upper=${k.boll?.upper}, Mid=${k.boll?.mid}`);
});
```

---

## Supported Indicators

| Indicator | Method | Description |
|-----------|--------|-------------|
| [MA](/en/api/indicator-ma) | `calcMA` | Moving Average (SMA/EMA/WMA) |
| [MACD](/en/api/indicator-macd) | `calcMACD` | Moving Average Convergence Divergence |
| [BOLL](/en/api/indicator-boll) | `calcBOLL` | Bollinger Bands |
| [KDJ](/en/api/indicator-kdj) | `calcKDJ` | Stochastic Oscillator |
| [RSI](/en/api/indicator-rsi-wr) | `calcRSI` | Relative Strength Index |
| [WR](/en/api/indicator-rsi-wr) | `calcWR` | Williams %R |
| [BIAS](/en/api/indicator-bias) | `calcBIAS` | Bias Ratio |
| [CCI](/en/api/indicator-cci) | `calcCCI` | Commodity Channel Index |
| [ATR](/en/api/indicator-atr) | `calcATR` | Average True Range |
| [OBV](/en/api/indicator-obv) | `calcOBV` | On Balance Volume |
| [ROC](/en/api/indicator-roc) | `calcROC` | Rate of Change |
| [DMI/ADX](/en/api/indicator-dmi) | `calcDMI` | Directional Movement Index |
| [SAR](/en/api/indicator-sar) | `calcSAR` | Parabolic SAR |
| [KC](/en/api/indicator-kc) | `calcKC` | Keltner Channel |

---

## Standalone Functions

All indicator functions can be imported independently:

```typescript
import {
  calcMA,
  calcSMA,
  calcEMA,
  calcWMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  // New indicators
  calcOBV,
  calcROC,
  calcDMI,
  calcSAR,
  calcKC,
  addIndicators,
} from 'stock-sdk';
```

---

## New Indicator Examples

### OBV - On Balance Volume

```typescript
import { calcOBV } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const obv = calcOBV(klines, { maPeriod: 20 });
console.log(obv[30].obv);    // OBV value
console.log(obv[30].obvMa);  // OBV 20-day MA
```

### ROC - Rate of Change

```typescript
import { calcROC } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const roc = calcROC(klines, { period: 12, signalPeriod: 6 });
console.log(roc[20].roc);     // ROC value
console.log(roc[25].signal);  // Signal line
```

### DMI/ADX - Directional Movement Index

```typescript
import { calcDMI } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const dmi = calcDMI(klines, { period: 14 });
console.log(dmi[30].pdi);  // +DI (upward)
console.log(dmi[30].mdi);  // -DI (downward)
console.log(dmi[30].adx);  // ADX (trend strength)
```

### SAR - Parabolic SAR

```typescript
import { calcSAR } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const sar = calcSAR(klines);
console.log(sar[30].sar);    // SAR value
console.log(sar[30].trend);  // Trend: 1 = up, -1 = down
```

### KC - Keltner Channel

```typescript
import { calcKC } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const kc = calcKC(klines, { emaPeriod: 20, multiplier: 2 });
console.log(kc[30].upper);  // Upper band
console.log(kc[30].mid);    // Middle band
console.log(kc[30].lower);  // Lower band
```

See individual indicator documentation for more details.
