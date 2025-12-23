# MA 均线

移动平均线（Moving Average）是最常用的技术指标，用于平滑价格波动，识别趋势方向。

## calcMA

批量计算多周期均线。

### 签名

```typescript
calcMA(
  closes: (number | null)[],
  options?: MAOptions
): MAResult[]
```

### 参数

```typescript
interface MAOptions {
  periods?: number[];  // 周期数组，默认 [5, 10, 20, 30, 60, 120, 250]
  type?: 'sma' | 'ema' | 'wma';  // 均线类型，默认 'sma'
}
```

### 返回类型

```typescript
interface MAResult {
  [key: string]: number | null;  // ma5, ma10, ma20...
}
```

### 示例

```typescript
import { calcMA } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

// 使用默认参数
const ma = calcMA(closes);
console.log(ma[10].ma5);   // 第 10 天的 5 日均线
console.log(ma[10].ma10);  // 第 10 天的 10 日均线

// 自定义参数
const customMa = calcMA(closes, {
  periods: [5, 10, 20],
  type: 'ema'
});
```

---

## calcSMA

计算简单移动平均线。

### 公式

```
SMA(N) = (C1 + C2 + ... + CN) / N

其中：C = 收盘价，N = 周期
```

### 签名

```typescript
calcSMA(data: (number | null)[], period: number): (number | null)[]
```

### 示例

```typescript
import { calcSMA } from 'stock-sdk';

const closes = klines.map(k => k.close);
const sma5 = calcSMA(closes, 5);
const sma20 = calcSMA(closes, 20);

console.log(sma5[10]);   // 第 10 天的 5 日 SMA
console.log(sma20[30]);  // 第 30 天的 20 日 SMA
```

---

## calcEMA

计算指数移动平均线。

### 公式

```
EMA(N) = α × C + (1 - α) × EMA(N-1)

其中：
  α = 2 / (N + 1)
  C = 当日收盘价
  EMA(N-1) = 前一日 EMA

初始化方式：
  - 前 N-1 天：返回 null（数据不足）
  - 第 N 天：EMA 初始值 = 前 N 天的 SMA
  - 第 N+1 天起：使用标准 EMA 公式递推
```

### 签名

```typescript
calcEMA(data: (number | null)[], period: number): (number | null)[]
```

### 示例

```typescript
import { calcEMA } from 'stock-sdk';

const closes = klines.map(k => k.close);
const ema12 = calcEMA(closes, 12);
const ema26 = calcEMA(closes, 26);

console.log(ema12[20]);  // 第 20 天的 12 日 EMA
```

---

## calcWMA

计算加权移动平均线。

### 公式

```
WMA(N) = (C1×1 + C2×2 + ... + CN×N) / (1 + 2 + ... + N)

权重随时间线性递增，最新数据权重最大
```

### 签名

```typescript
calcWMA(data: (number | null)[], period: number): (number | null)[]
```

### 示例

```typescript
import { calcWMA } from 'stock-sdk';

const closes = klines.map(k => k.close);
const wma10 = calcWMA(closes, 10);

console.log(wma10[15]);  // 第 15 天的 10 日 WMA
```

---

## 均线类型对比

| 类型 | 特点 | 适用场景 |
|------|------|---------|
| **SMA** | 简单平均，所有数据权重相同 | 长期趋势分析 |
| **EMA** | 指数加权，新数据权重更大 | 短期趋势、MACD 计算 |
| **WMA** | 线性加权，新数据权重更大 | 中短期分析 |

```typescript
// 对比三种均线
const closes = klines.map(k => k.close);

const sma10 = calcSMA(closes, 10);
const ema10 = calcEMA(closes, 10);
const wma10 = calcWMA(closes, 10);

// EMA 和 WMA 对价格变化更敏感
```

---

## 常用均线周期

| 周期 | 名称 | 用途 |
|------|------|------|
| 5 | 周线 | 短期趋势 |
| 10 | 半月线 | 短期趋势 |
| 20 | 月线 | 中期趋势 |
| 30 | 月半线 | 中期趋势 |
| 60 | 季线 | 中长期趋势 |
| 120 | 半年线 | 长期趋势 |
| 250 | 年线 | 牛熊分界线 |

