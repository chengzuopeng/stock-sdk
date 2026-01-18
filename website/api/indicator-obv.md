# OBV 能量潮

OBV（On Balance Volume）通过成交量的累积来判断股价走势。

## calcOBV

### 签名

```typescript
calcOBV(data: OHLCV[], options?: OBVOptions): OBVResult[]
```

### 参数

```typescript
interface OBVOptions {
  maPeriod?: number;  // OBV 均线周期
}
```

### 返回类型

```typescript
interface OBVResult {
  obv: number | null;    // OBV 值
  obvMa: number | null;  // OBV 均线
}
```

### 计算公式

```
若 今日收盘 > 昨日收盘：OBV = 昨日 OBV + 今日成交量
若 今日收盘 < 昨日收盘：OBV = 昨日 OBV - 今日成交量
若 今日收盘 = 昨日收盘：OBV = 昨日 OBV
```

### 示例

```typescript
import { calcOBV } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const obv = calcOBV(klines, { maPeriod: 20 });
console.log(obv[30].obv);    // OBV 值
console.log(obv[30].obvMa);  // OBV 20 日均线
```

### 使用建议

- OBV 上升 + 价格上升：上涨趋势确认
- OBV 下降 + 价格上升：可能是假突破
- OBV 与价格背离：可能出现反转
