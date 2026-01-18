# SAR 抛物线转向

SAR（Parabolic SAR）用于判断趋势反转点和止损位。

## calcSAR

### 签名

```typescript
calcSAR(data: OHLCV[], options?: SAROptions): SARResult[]
```

### 参数

```typescript
interface SAROptions {
  afStart?: number;      // 加速因子初始值，默认 0.02
  afIncrement?: number;  // 加速因子增量，默认 0.02
  afMax?: number;        // 加速因子最大值，默认 0.2
}
```

### 返回类型

```typescript
interface SARResult {
  sar: number | null;      // SAR 值
  trend: 1 | -1 | null;    // 趋势方向：1 上升，-1 下降
  ep: number | null;       // 极值点
  af: number | null;       // 加速因子
}
```

### 计算说明

Parabolic SAR 是一个跟随价格的点：
- 上升趋势时，SAR 点在价格下方
- 下降趋势时，SAR 点在价格上方
- 当价格穿越 SAR 点时，趋势反转

### 示例

```typescript
import { calcSAR } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const sar = calcSAR(klines);
console.log(sar[30].sar);    // SAR 值
console.log(sar[30].trend);  // 趋势方向：1 或 -1
```

### 使用建议

- 价格在 SAR 之上（trend = 1）：持有多头
- 价格在 SAR 之下（trend = -1）：持有空头
- SAR 可用作动态止损位
- 调整 afStart 和 afMax 可改变灵敏度
