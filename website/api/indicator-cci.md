# CCI 商品通道指数

CCI（Commodity Channel Index）用于衡量价格偏离其统计均值的程度，可用于识别超买/超卖。

## calcCCI

### 签名

```typescript
calcCCI(
  data: OHLCV[],
  options?: CCIOptions
): CCIResult[]
```

### 参数

```typescript
interface CCIOptions {
  period?: number;  // 周期，默认 14
}
```

### 返回类型

```typescript
interface CCIResult {
  cci: number | null;
}
```

### 计算公式

```
TP（典型价格）= (最高价 + 最低价 + 收盘价) / 3
MA = TP 的 N 日简单移动平均
MD = TP 与 MA 的平均绝对偏差
CCI = (TP - MA) / (0.015 × MD)
```

### 示例

```typescript
import { calcCCI } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const ohlc = klines.map(k => ({
  open: k.open,
  high: k.high,
  low: k.low,
  close: k.close,
}));

const cci = calcCCI(ohlc, { period: 14 });
console.log(cci[30].cci);
```

### 解读建议

- **CCI > 100**：可能处于超买区域
- **CCI < -100**：可能处于超卖区域
- **-100 ~ 100**：价格相对均衡区间
