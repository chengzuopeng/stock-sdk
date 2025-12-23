# 技术指标

Stock SDK 内置了常用的技术指标计算功能，包括均线、MACD、BOLL、KDJ、RSI、WR 等。

## 一站式获取

最简单的方式是使用 `getKlineWithIndicators` 方法，在获取 K 线数据的同时计算技术指标：

```typescript
const data = await sdk.getKlineWithIndicators('sz000001', {
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
    cci: { period: 14 },
    atr: { period: 14 },
  }
});

// 使用数据
data.forEach(k => {
  console.log(`${k.date}: ${k.close}`);
  console.log(`  MA5=${k.ma?.ma5}, MA10=${k.ma?.ma10}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: 上=${k.boll?.upper}, 中=${k.boll?.mid}, 下=${k.boll?.lower}`);
  console.log(`  KDJ: K=${k.kdj?.k}, D=${k.kdj?.d}, J=${k.kdj?.j}`);
  console.log(`  RSI6=${k.rsi?.rsi6}, WR6=${k.wr?.wr6}`);
});
```

## 市场自动识别

`getKlineWithIndicators` 支持 A 股、港股、美股，会自动识别市场类型：

```typescript
// A 股（自动识别）
const aData = await sdk.getKlineWithIndicators('sz000001', {
  indicators: { ma: true, macd: true }
});

// 港股（自动识别：5 位代码）
const hkData = await sdk.getKlineWithIndicators('00700', {
  indicators: { ma: true, macd: true }
});

// 美股（自动识别：{market}.{ticker} 格式）
const usData = await sdk.getKlineWithIndicators('105.MSFT', {
  indicators: { boll: true, rsi: true }
});

// 手动指定市场
const data = await sdk.getKlineWithIndicators('09988', {
  market: 'HK',  // 明确指定为港股
  indicators: { boll: true }
});
```

## 独立计算函数

如果需要更灵活的控制，可以使用独立的指标计算函数：

```typescript
import {
  calcMA,
  calcSMA,
  calcEMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  addIndicators,
} from 'stock-sdk';

// 获取 K 线数据
const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

// 计算均线
const ma = calcMA(closes, { periods: [5, 10, 20], type: 'sma' });
console.log(ma[10].ma5);  // 第 10 天的 5 日均线

// 计算 MACD
const macd = calcMACD(closes);
console.log(macd[50].dif, macd[50].dea, macd[50].macd);

// 计算布林带
const boll = calcBOLL(closes, { period: 20, stdDev: 2 });
console.log(boll[30].upper, boll[30].mid, boll[30].lower);

// 计算 KDJ（需要 OHLC 数据）
const ohlc = klines.map(k => ({
  open: k.open, high: k.high, low: k.low, close: k.close
}));
const kdj = calcKDJ(ohlc, { period: 9 });
console.log(kdj[20].k, kdj[20].d, kdj[20].j);
```

## 使用 addIndicators

`addIndicators` 函数可以一次性为 K 线数据添加多个指标：

```typescript
import { addIndicators } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');

const withIndicators = addIndicators(klines, {
  ma: { periods: [5, 10] },
  macd: true,
  boll: true,
  bias: true,
  cci: true,
  atr: true,
});

console.log(withIndicators[50].ma?.ma5);
console.log(withIndicators[50].macd?.dif);
console.log(withIndicators[50].bias?.bias6);
```

## 指标参数说明

### MA 均线

```typescript
interface MAOptions {
  periods?: number[];  // 周期数组，默认 [5, 10, 20, 30, 60, 120, 250]
  type?: 'sma' | 'ema' | 'wma';  // 均线类型，默认 'sma'
}
```

### MACD

```typescript
interface MACDOptions {
  short?: number;   // 短期 EMA 周期，默认 12
  long?: number;    // 长期 EMA 周期，默认 26
  signal?: number;  // 信号线周期，默认 9
}
```

### BOLL 布林带

```typescript
interface BOLLOptions {
  period?: number;  // 均线周期，默认 20
  stdDev?: number;  // 标准差倍数，默认 2
}
```

### KDJ

```typescript
interface KDJOptions {
  period?: number;   // RSV 周期，默认 9
  kPeriod?: number;  // K 平滑周期，默认 3
  dPeriod?: number;  // D 平滑周期，默认 3
}
```

### RSI

```typescript
interface RSIOptions {
  periods?: number[];  // 周期数组，默认 [6, 12, 24]
}
```

### WR 威廉指标

```typescript
interface WROptions {
  periods?: number[];  // 周期数组，默认 [6, 10]
}
```

### BIAS 乖离率

```typescript
interface BIASOptions {
  periods?: number[];  // 周期数组，默认 [6, 12, 24]
}
```

### CCI 商品通道指数

```typescript
interface CCIOptions {
  period?: number;  // 周期，默认 14
}
```

### ATR 平均真实波幅

```typescript
interface ATROptions {
  period?: number;  // 周期，默认 14
}
```

## 与图表库集成

### ECharts 示例

```typescript
const data = await sdk.getKlineWithIndicators('sz000001', {
  indicators: { ma: { periods: [5, 10, 20] }, macd: true }
});

const option = {
  xAxis: { data: data.map(d => d.date) },
  yAxis: [
    { /* K 线 */ },
    { /* MACD */ }
  ],
  series: [
    {
      type: 'candlestick',
      data: data.map(d => [d.open, d.close, d.low, d.high])
    },
    {
      type: 'line',
      name: 'MA5',
      data: data.map(d => d.ma?.ma5)
    },
    {
      type: 'line',
      name: 'MA10',
      data: data.map(d => d.ma?.ma10)
    },
    {
      type: 'bar',
      name: 'MACD',
      yAxisIndex: 1,
      data: data.map(d => d.macd?.macd)
    },
  ]
};
```

