# ROC 变动率指标

ROC（Rate of Change）衡量价格变化的速度和幅度。

## calcROC

### 签名

```typescript
calcROC(data: OHLCV[], options?: ROCOptions): ROCResult[]
```

### 参数

```typescript
interface ROCOptions {
  period?: number;       // 周期，默认 12
  signalPeriod?: number; // 信号线周期
}
```

### 返回类型

```typescript
interface ROCResult {
  roc: number | null;     // ROC 值（百分比）
  signal: number | null;  // 信号线
}
```

### 计算公式

```
ROC = (当日收盘价 - N日前收盘价) / N日前收盘价 × 100
```

### 示例

```typescript
import { calcROC } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const roc = calcROC(klines, { period: 12, signalPeriod: 6 });
console.log(roc[20].roc);     // ROC 值
console.log(roc[25].signal);  // 信号线
```

### 使用建议

- ROC 由负转正：买入信号
- ROC 由正转负：卖出信号
- ROC 与价格背离：可能的反转信号
