# KC 肯特纳通道

KC（Keltner Channel）是基于 ATR 的价格通道指标。

## calcKC

### 签名

```typescript
calcKC(data: OHLCV[], options?: KCOptions): KCResult[]
```

### 参数

```typescript
interface KCOptions {
  emaPeriod?: number;   // EMA 周期，默认 20
  atrPeriod?: number;   // ATR 周期，默认 10
  multiplier?: number;  // ATR 倍数，默认 2
}
```

### 返回类型

```typescript
interface KCResult {
  mid: number | null;    // 中轨（EMA）
  upper: number | null;  // 上轨
  lower: number | null;  // 下轨
  width: number | null;  // 通道宽度（百分比）
}
```

### 计算公式

```
中轨 = EMA(close, emaPeriod)
上轨 = 中轨 + multiplier × ATR
下轨 = 中轨 - multiplier × ATR
宽度 = (上轨 - 下轨) / 中轨 × 100
```

### 示例

```typescript
import { calcKC } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const kc = calcKC(klines, { emaPeriod: 20, multiplier: 2 });
console.log(kc[30].upper);  // 上轨
console.log(kc[30].mid);    // 中轨
console.log(kc[30].lower);  // 下轨
console.log(kc[30].width);  // 通道宽度
```

### 使用建议

- 与布林带相比，KC 使用 ATR 而非标准差，对价格变化反应更平滑
- 价格突破上轨：可能的买入信号
- 价格跌破下轨：可能的卖出信号
- 通道收窄：可能即将爆发大行情
- 可与布林带配合使用，判断"挤压"形态
