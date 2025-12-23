# MACD

MACD（Moving Average Convergence Divergence）指数平滑异同移动平均线，用于判断趋势的强度和方向。

## calcMACD

计算 MACD 指标。

### 签名

```typescript
calcMACD(
  closes: (number | null)[],
  options?: MACDOptions
): MACDResult[]
```

### 参数

```typescript
interface MACDOptions {
  short?: number;   // 短期 EMA 周期，默认 12
  long?: number;    // 长期 EMA 周期，默认 26
  signal?: number;  // 信号线 EMA 周期，默认 9
}
```

### 返回类型

```typescript
interface MACDResult {
  dif: number | null;   // DIF 快线
  dea: number | null;   // DEA 慢线
  macd: number | null;  // MACD 柱状图
}
```

### 示例

```typescript
import { calcMACD } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

// 使用默认参数 (12, 26, 9)
const macd = calcMACD(closes);

macd.forEach((m, i) => {
  console.log(`Day ${i}: DIF=${m.dif}, DEA=${m.dea}, MACD=${m.macd}`);
});

// 自定义参数
const customMacd = calcMACD(closes, {
  short: 10,
  long: 22,
  signal: 7
});
```

---

## 计算公式

```
DIF = EMA(12) - EMA(26)
DEA = EMA(DIF, 9)
MACD = (DIF - DEA) × 2
```

### 各指标含义

| 指标 | 含义 | 说明 |
|------|------|------|
| **DIF** | 差离值 | 短期 EMA 与长期 EMA 的差值 |
| **DEA** | 信号线 | DIF 的 9 日 EMA，平滑 DIF 波动 |
| **MACD** | 柱状图 | DIF 与 DEA 差值的 2 倍 |

---

## 信号解读

### 金叉与死叉

```typescript
function findCrossSignals(macd: MACDResult[]) {
  const signals = [];
  
  for (let i = 1; i < macd.length; i++) {
    const prev = macd[i - 1];
    const curr = macd[i];
    
    if (prev.dif !== null && curr.dif !== null &&
        prev.dea !== null && curr.dea !== null) {
      
      // 金叉：DIF 从下向上穿过 DEA
      if (prev.dif <= prev.dea && curr.dif > curr.dea) {
        signals.push({ index: i, type: 'golden_cross' });
      }
      
      // 死叉：DIF 从上向下穿过 DEA
      if (prev.dif >= prev.dea && curr.dif < curr.dea) {
        signals.push({ index: i, type: 'death_cross' });
      }
    }
  }
  
  return signals;
}
```

### 柱状图分析

| 情况 | 含义 |
|------|------|
| MACD > 0 且递增 | 多头力量增强 |
| MACD > 0 且递减 | 多头力量减弱 |
| MACD < 0 且递减 | 空头力量增强 |
| MACD < 0 且递增 | 空头力量减弱 |

---

## 使用注意

1. **滞后性**：MACD 是滞后指标，不适合抓顶抄底
2. **参数调整**：短周期交易可使用 (6, 13, 5) 参数
3. **结合其他指标**：建议与 K 线形态、成交量等配合使用

```typescript
// 自定义快速 MACD
const fastMacd = calcMACD(closes, {
  short: 6,
  long: 13,
  signal: 5
});
```

