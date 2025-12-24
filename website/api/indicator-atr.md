# ATR 平均真实波幅

ATR（Average True Range）用于衡量市场波动性，数值越大表示波动越剧烈。

## calcATR

### 签名

```typescript
calcATR(
  data: OHLCV[],
  options?: ATROptions
): ATRResult[]
```

### 参数

```typescript
interface ATROptions {
  period?: number;  // 周期，默认 14
}
```

### 返回类型

```typescript
interface ATRResult {
  tr: number | null;   // 真实波幅
  atr: number | null;  // 平均真实波幅
}
```

### 计算公式

```
TR（真实波幅）= max(
  最高价 - 最低价,
  |最高价 - 昨收|,
  |最低价 - 昨收|
)

ATR = TR 的 N 日移动平均
```

### 示例

```typescript
import { calcATR } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const ohlc = klines.map(k => ({
  open: k.open,
  high: k.high,
  low: k.low,
  close: k.close,
}));

const atr = calcATR(ohlc, { period: 14 });
console.log(atr[30].atr, atr[30].tr);
```

### 使用建议

- ATR 常用于设置 **止损范围**（如 2 × ATR）
- ATR 适合衡量 **波动性**，不直接给出趋势方向
