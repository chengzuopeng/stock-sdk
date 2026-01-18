# DMI/ADX 趋向指标

DMI（Directional Movement Index）判断趋势的方向和强度。

## calcDMI

### 签名

```typescript
calcDMI(data: OHLCV[], options?: DMIOptions): DMIResult[]
```

### 参数

```typescript
interface DMIOptions {
  period?: number;     // 周期，默认 14
  adxPeriod?: number;  // ADX 平滑周期
}
```

### 返回类型

```typescript
interface DMIResult {
  pdi: number | null;   // +DI 上升方向指标
  mdi: number | null;   // -DI 下降方向指标
  adx: number | null;   // ADX 趋势强度
  adxr: number | null;  // ADXR
}
```

### 计算说明

DMI 包含四个指标：
- **+DI**：上升方向指标，衡量上涨动能
- **-DI**：下降方向指标，衡量下跌动能
- **ADX**：平均趋向指数，衡量趋势强度（不区分方向）
- **ADXR**：ADX 的平均值，更平滑

### 示例

```typescript
import { calcDMI } from 'stock-sdk';

const klines = await sdk.getHistoryKline('sz000001');
const dmi = calcDMI(klines, { period: 14 });
console.log(dmi[30].pdi);  // +DI
console.log(dmi[30].mdi);  // -DI
console.log(dmi[30].adx);  // ADX
```

### 使用建议

- +DI > -DI：上升趋势
- -DI > +DI：下降趋势
- ADX > 25：趋势明显，适合趋势跟踪策略
- ADX < 20：横盘整理，适合震荡策略
- +DI 与 -DI 交叉：趋势转换信号
