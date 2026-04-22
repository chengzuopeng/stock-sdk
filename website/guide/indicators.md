# 技术指标

Stock SDK 支持两种指标工作流：

- 使用 `getKlineWithIndicators`，一次性拉取 K 线并计算指标
- 使用独立函数，例如 `calcMA`、`calcMACD`、`calcOBV`

## 一站式获取

```ts
const data = await sdk.getKlineWithIndicators('sz000001', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
    rsi: { periods: [6, 12, 24] },
    obv: { maPeriod: 20 },
    roc: { period: 12, signalPeriod: 6 },
    dmi: { period: 14, adxPeriod: 6 },
    sar: true,
    kc: { emaPeriod: 20, atrPeriod: 10, multiplier: 2 },
  },
});

console.log(data[30].ma?.ma5);
console.log(data[30].obv?.obvMa);
console.log(data[30].roc?.signal);
console.log(data[30].dmi?.adx);
console.log(data[30].sar?.sar);
console.log(data[30].kc?.upper);
```

## 支持的指标

- `ma`
- `macd`
- `boll`
- `kdj`
- `rsi`
- `wr`
- `bias`
- `cci`
- `atr`
- `obv`
- `roc`
- `dmi`
- `sar`
- `kc`

## 独立计算函数

```ts
import {
  calcMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcOBV,
  calcROC,
  calcDMI,
  calcSAR,
  calcKC,
} from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map((item) => item.close);
const ohlc = klines.map((item) => ({
  open: item.open,
  high: item.high,
  low: item.low,
  close: item.close,
  volume: item.volume,
}));

const ma = calcMA(closes, { periods: [5, 10, 20], type: 'sma' });
const macd = calcMACD(closes);
const boll = calcBOLL(closes, { period: 20, stdDev: 2 });
const kdj = calcKDJ(ohlc, { period: 9, kPeriod: 3, dPeriod: 3 });
const obv = calcOBV(ohlc, { maPeriod: 20 });
const roc = calcROC(ohlc, { period: 12, signalPeriod: 6 });
const dmi = calcDMI(ohlc, { period: 14, adxPeriod: 6 });
const sar = calcSAR(ohlc, { afStart: 0.02, afIncrement: 0.02, afMax: 0.2 });
const kc = calcKC(ohlc, { emaPeriod: 20, atrPeriod: 10, multiplier: 2 });

console.log(ma[20].ma20);
console.log(macd[20].dif);
console.log(kdj[20].k);
console.log(obv[20].obvMa);
console.log(roc[20].signal);
console.log(dmi[20].adx);
console.log(sar[20].sar);
console.log(kc[20].upper);
```

## 使用 addIndicators

```ts
import { addIndicators } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');

const withIndicators = addIndicators(klines, {
  ma: { periods: [5, 10] },
  macd: true,
  obv: { maPeriod: 20 },
  roc: true,
  dmi: true,
  sar: true,
  kc: true,
});

console.log(withIndicators[40].obv?.obv);
console.log(withIndicators[40].roc?.roc);
console.log(withIndicators[40].dmi?.pdi);
```

## 计算说明

- 大多数指标在样本不足时会返回 `null`
- `getKlineWithIndicators` 会自动补齐向前所需的历史数据
- `calcMA` 接收收盘价数组，其余多数趋势类指标接收 `OHLCV[]`
- 如果需要批量叠加多个指标，优先使用 `addIndicators`

## 相关页面

- [指标 API 总览](/api/indicators)
- [快速开始](/guide/getting-started)
