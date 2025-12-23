# KDJ

KDJ 随机指标用于判断超买超卖状态和趋势反转信号。

## calcKDJ

计算 KDJ 指标。

### 签名

```typescript
calcKDJ(
  data: OHLCV[],
  options?: KDJOptions
): KDJResult[]
```

### 参数

```typescript
interface OHLCV {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
}

interface KDJOptions {
  period?: number;   // RSV 周期，默认 9
  kPeriod?: number;  // K 平滑周期，默认 3
  dPeriod?: number;  // D 平滑周期，默认 3
}
```

### 返回类型

```typescript
interface KDJResult {
  k: number | null;  // K 值
  d: number | null;  // D 值
  j: number | null;  // J 值
}
```

### 示例

```typescript
import { calcKDJ } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const ohlc = klines.map(k => ({
  open: k.open,
  high: k.high,
  low: k.low,
  close: k.close
}));

// 使用默认参数 (9, 3, 3)
const kdj = calcKDJ(ohlc);

kdj.forEach((k, i) => {
  if (k.k !== null) {
    console.log(`Day ${i}: K=${k.k}, D=${k.d}, J=${k.j}`);
  }
});

// 自定义参数
const customKdj = calcKDJ(ohlc, {
  period: 14,
  kPeriod: 3,
  dPeriod: 3
});
```

---

## 计算公式

```
RSV = (C - L9) / (H9 - L9) × 100

其中：
  C = 当日收盘价
  L9 = 9日最低价
  H9 = 9日最高价

K = 2/3 × K(-1) + 1/3 × RSV
D = 2/3 × D(-1) + 1/3 × K
J = 3K - 2D

初始值：K = D = 50
```

---

## 信号解读

### 超买超卖

| K/D 值 | 状态 | 操作建议 |
|--------|------|---------|
| > 80 | 超买区 | 考虑卖出 |
| 50 附近 | 中性区 | 观望 |
| < 20 | 超卖区 | 考虑买入 |

### J 值特点

J 值是 K 和 D 的加权差值，波动更大：

- J > 100：严重超买
- J < 0：严重超卖

### 金叉与死叉

```typescript
function findKDJSignals(kdj: KDJResult[]) {
  const signals = [];
  
  for (let i = 1; i < kdj.length; i++) {
    const prev = kdj[i - 1];
    const curr = kdj[i];
    
    if (prev.k !== null && curr.k !== null &&
        prev.d !== null && curr.d !== null) {
      
      // 金叉：K 从下向上穿过 D
      if (prev.k <= prev.d && curr.k > curr.d) {
        const area = curr.k < 50 ? 'low' : curr.k > 80 ? 'high' : 'mid';
        signals.push({ index: i, type: 'golden_cross', area });
      }
      
      // 死叉：K 从上向下穿过 D
      if (prev.k >= prev.d && curr.k < curr.d) {
        const area = curr.k < 20 ? 'low' : curr.k > 50 ? 'high' : 'mid';
        signals.push({ index: i, type: 'death_cross', area });
      }
    }
  }
  
  return signals;
}
```

---

## 使用技巧

1. **低位金叉**：K、D 都在 20 以下金叉，买入信号较强
2. **高位死叉**：K、D 都在 80 以上死叉，卖出信号较强
3. **中位交叉**：信号较弱，需结合其他指标
4. **J 值钝化**：在强趋势中，J 值可能长时间处于超买/超卖区

```typescript
// 检测强买入信号
function strongBuySignal(kdj: KDJResult[], index: number): boolean {
  const curr = kdj[index];
  const prev = kdj[index - 1];
  
  return (
    prev.k !== null && curr.k !== null &&
    prev.d !== null && curr.d !== null &&
    prev.k <= prev.d &&  // 之前 K < D
    curr.k > curr.d &&   // 现在 K > D（金叉）
    curr.k < 30          // 在低位区域
  );
}
```

