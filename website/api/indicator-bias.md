# BIAS 乖离率

乖离率（BIAS）衡量价格与均线之间的偏离程度，用于观察超买/超卖状态。

## calcBIAS

### 签名

```typescript
calcBIAS(
  closes: (number | null)[],
  options?: BIASOptions
): BIASResult[]
```

### 参数

```typescript
interface BIASOptions {
  periods?: number[];  // 周期数组，默认 [6, 12, 24]
}
```

### 返回类型

```typescript
interface BIASResult {
  [key: string]: number | null;  // bias6, bias12, bias24...
}
```

### 计算公式

```
BIAS = (收盘价 - MA) / MA × 100
```

### 示例

```typescript
import { calcBIAS } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

const bias = calcBIAS(closes, { periods: [6, 12, 24] });
console.log(bias[30].bias6, bias[30].bias12, bias[30].bias24);
```

### 解读建议

- **正乖离**：价格在均线上方，偏离过大可能出现回调
- **负乖离**：价格在均线下方，偏离过大可能出现反弹
- 建议结合趋势与成交量综合判断
