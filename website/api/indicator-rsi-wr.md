# RSI / WR

## RSI 相对强弱指标

RSI（Relative Strength Index）用于衡量价格涨跌的相对强度。

### calcRSI

```typescript
calcRSI(
  closes: (number | null)[],
  options?: RSIOptions
): RSIResult[]
```

### 参数

```typescript
interface RSIOptions {
  periods?: number[];  // 周期数组，默认 [6, 12, 24]
}
```

### 返回类型

```typescript
interface RSIResult {
  [key: string]: number | null;  // rsi6, rsi12, rsi24...
}
```

### 计算公式

```
RS = 平均上涨幅度 / 平均下跌幅度
RSI = 100 - 100 / (1 + RS)

平均上涨幅度 = N 日内上涨总幅度 / N
平均下跌幅度 = N 日内下跌总幅度 / N
```

### 示例

```typescript
import { calcRSI } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

const rsi = calcRSI(closes);

rsi.forEach((r, i) => {
  console.log(`Day ${i}: RSI6=${r.rsi6}, RSI12=${r.rsi12}, RSI24=${r.rsi24}`);
});

// 自定义周期
const customRsi = calcRSI(closes, { periods: [6, 14] });
```

### RSI 信号解读

| RSI 值 | 状态 | 操作建议 |
|--------|------|---------|
| > 80 | 超买 | 考虑卖出 |
| 70-80 | 偏强 | 谨慎持有 |
| 30-70 | 中性 | 观望 |
| 20-30 | 偏弱 | 谨慎买入 |
| < 20 | 超卖 | 考虑买入 |

---

## WR 威廉指标

WR（Williams %R）也称威廉超买超卖指标，与 RSI 类似但计算方式不同。

### calcWR

```typescript
calcWR(
  data: OHLCV[],
  options?: WROptions
): WRResult[]
```

### 参数

```typescript
interface WROptions {
  periods?: number[];  // 周期数组，默认 [6, 10]
}
```

### 返回类型

```typescript
interface WRResult {
  [key: string]: number | null;  // wr6, wr10...
}
```

### 计算公式

```
WR = (HN - C) / (HN - LN) × 100

其中：
  HN = N 日内最高价
  LN = N 日内最低价
  C = 当日收盘价
```

### 示例

```typescript
import { calcWR } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const ohlc = klines.map(k => ({
  open: k.open,
  high: k.high,
  low: k.low,
  close: k.close
}));

const wr = calcWR(ohlc);

wr.forEach((w, i) => {
  console.log(`Day ${i}: WR6=${w.wr6}, WR10=${w.wr10}`);
});

// 自定义周期
const customWr = calcWR(ohlc, { periods: [10, 14, 20] });
```

### WR 信号解读

| WR 值 | 状态 | 操作建议 |
|-------|------|---------|
| < 20 | 超买 | 考虑卖出 |
| 20-80 | 中性 | 观望 |
| > 80 | 超卖 | 考虑买入 |

::: tip 注意
WR 的超买超卖判断与 RSI 相反：
- WR 小于 20 表示超买（价格接近最高价）
- WR 大于 80 表示超卖（价格接近最低价）
:::

---

## RSI 与 WR 对比

| 特性 | RSI | WR |
|------|-----|-----|
| 计算基础 | 涨跌幅 | 价格位置 |
| 超买阈值 | > 80 | < 20 |
| 超卖阈值 | < 20 | > 80 |
| 平滑度 | 较平滑 | 波动较大 |
| 常用周期 | 6, 12, 14, 24 | 6, 10, 14 |

---

## 综合使用示例

```typescript
// 同时检测 RSI 和 WR 的超买超卖信号
function detectOversoldSignal(rsi: RSIResult, wr: WRResult): boolean {
  return (
    (rsi.rsi6 !== null && rsi.rsi6 < 20) ||
    (wr.wr6 !== null && wr.wr6 > 80)
  );
}

function detectOverboughtSignal(rsi: RSIResult, wr: WRResult): boolean {
  return (
    (rsi.rsi6 !== null && rsi.rsi6 > 80) ||
    (wr.wr6 !== null && wr.wr6 < 20)
  );
}

// 在实际使用中
const rsiData = calcRSI(closes);
const wrData = calcWR(ohlc);

const lastRsi = rsiData[rsiData.length - 1];
const lastWr = wrData[wrData.length - 1];

if (detectOversoldSignal(lastRsi, lastWr)) {
  console.log('超卖信号');
}
```

