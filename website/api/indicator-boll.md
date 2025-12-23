# BOLL 布林带

布林带（Bollinger Bands）由中轨、上轨和下轨组成，用于衡量价格波动范围和超买超卖状态。

## calcBOLL

计算布林带指标。

### 签名

```typescript
calcBOLL(
  closes: (number | null)[],
  options?: BOLLOptions
): BOLLResult[]
```

### 参数

```typescript
interface BOLLOptions {
  period?: number;  // 均线周期，默认 20
  stdDev?: number;  // 标准差倍数，默认 2
}
```

### 返回类型

```typescript
interface BOLLResult {
  mid: number | null;       // 中轨（N日均线）
  upper: number | null;     // 上轨
  lower: number | null;     // 下轨
  bandwidth: number | null; // 带宽 %
}
```

### 示例

```typescript
import { calcBOLL } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

// 使用默认参数 (20, 2)
const boll = calcBOLL(closes);

boll.forEach((b, i) => {
  if (b.mid !== null) {
    console.log(`Day ${i}: 上轨=${b.upper}, 中轨=${b.mid}, 下轨=${b.lower}`);
    console.log(`  带宽=${b.bandwidth}%`);
  }
});

// 自定义参数
const customBoll = calcBOLL(closes, {
  period: 26,
  stdDev: 2.5
});
```

---

## 计算公式

```
中轨 = MA(N)
标准差 = √(Σ(Ci - MA)² / N)
上轨 = 中轨 + K × 标准差
下轨 = 中轨 - K × 标准差
带宽 = (上轨 - 下轨) / 中轨 × 100

其中：N = 20（默认），K = 2（默认）
```

---

## 信号解读

### 价格与轨道关系

| 情况 | 含义 |
|------|------|
| 价格触及上轨 | 短期超买，可能回调 |
| 价格触及下轨 | 短期超卖，可能反弹 |
| 价格在中轨上方运行 | 多头趋势 |
| 价格在中轨下方运行 | 空头趋势 |

### 带宽分析

```typescript
function analyzeBandwidth(boll: BOLLResult[]) {
  const recent = boll.slice(-20).filter(b => b.bandwidth !== null);
  const avgBandwidth = recent.reduce((sum, b) => sum + b.bandwidth!, 0) / recent.length;
  const current = boll[boll.length - 1].bandwidth;
  
  if (current !== null) {
    if (current < avgBandwidth * 0.5) {
      return 'squeeze';  // 收口，可能即将突破
    } else if (current > avgBandwidth * 1.5) {
      return 'expansion';  // 张口，趋势延续
    }
  }
  return 'normal';
}
```

### 常见形态

| 形态 | 特征 | 含义 |
|------|------|------|
| 收口（Squeeze） | 带宽收窄 | 波动降低，即将突破 |
| 张口（Expansion） | 带宽扩大 | 趋势延续 |
| 上轨走平 + 价格突破 | - | 强势上涨 |
| 下轨走平 + 价格跌破 | - | 强势下跌 |

---

## 使用技巧

1. **趋势行情**：价格沿上轨运行表示强势上涨，沿下轨运行表示强势下跌
2. **震荡行情**：价格在上下轨之间波动，可在下轨买入、上轨卖出
3. **突破确认**：收口后的突破往往预示新趋势的开始

```typescript
// 检测突破信号
function detectBreakout(closes: number[], boll: BOLLResult[]) {
  const i = closes.length - 1;
  if (boll[i].upper && closes[i] > boll[i].upper!) {
    return 'breakout_up';
  }
  if (boll[i].lower && closes[i] < boll[i].lower!) {
    return 'breakout_down';
  }
  return null;
}
```

