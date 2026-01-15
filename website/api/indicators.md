# 技术指标概览

Stock SDK 提供两种方式使用技术指标：

1. **一站式 API**：`getKlineWithIndicators` 获取 K 线时自动计算指标
2. **独立计算函数**：`calcMA`、`calcMACD` 等，灵活控制

## getKlineWithIndicators

获取带技术指标的 K 线数据。支持 A 股、港股、美股，自动识别市场。

### 签名

```typescript
getKlineWithIndicators(
  symbol: string,
  options?: {
    market?: 'A' | 'HK' | 'US';
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
    indicators?: IndicatorOptions;
  }
): Promise<KlineWithIndicators[]>
```

::: tip 计算说明
`getKlineWithIndicators` 会自动向前补拉足够的历史数据用于指标计算，并在返回时裁剪为你指定的日期范围。
:::

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 股票代码 |
| `market` | `string` | 自动识别 | 市场类型：`'A'` / `'HK'` / `'US'` |
| `period` | `string` | `'daily'` | K 线周期 |
| `adjust` | `string` | `'qfq'` | 复权类型 |
| `startDate` | `string` | - | 开始日期 |
| `endDate` | `string` | - | 结束日期 |
| `indicators` | `object` | - | 指标配置 |

### indicators 配置

```typescript
interface IndicatorOptions {
  ma?: MAOptions | boolean;      // 均线
  macd?: MACDOptions | boolean;  // MACD
  boll?: BOLLOptions | boolean;  // 布林带
  kdj?: KDJOptions | boolean;    // KDJ
  rsi?: RSIOptions | boolean;    // RSI
  wr?: WROptions | boolean;      // WR 威廉指标
  bias?: BIASOptions | boolean;  // 乖离率
  cci?: CCIOptions | boolean;    // CCI
  atr?: ATROptions | boolean;    // ATR
}
```

### 示例

```typescript
const data = await sdk.getKlineWithIndicators('sz000001', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
    rsi: { periods: [6, 12] },
    wr: true,
    bias: { periods: [6, 12, 24] },
    cci: { period: 14 },
    atr: { period: 14 },
  }
});

data.forEach(k => {
  console.log(`${k.date}: ${k.close}`);
  console.log(`  MA5=${k.ma?.ma5}, MA10=${k.ma?.ma10}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: 上=${k.boll?.upper}, 中=${k.boll?.mid}, 下=${k.boll?.lower}`);
  console.log(`  KDJ: K=${k.kdj?.k}, D=${k.kdj?.d}, J=${k.kdj?.j}`);
  console.log(`  RSI6=${k.rsi?.rsi6}, WR6=${k.wr?.wr6}`);
  console.log(`  BIAS6=${k.bias?.bias6}, CCI=${k.cci?.cci}, ATR=${k.atr?.atr}`);
});
```

---

## 市场自动识别

SDK 会根据代码格式自动识别市场：

```typescript
// A 股（自动识别）
const aData = await sdk.getKlineWithIndicators('sz000001', {
  indicators: { ma: true, macd: true }
});

// 港股（5 位代码，自动识别）
const hkData = await sdk.getKlineWithIndicators('00700', {
  indicators: { ma: true, macd: true }
});

// 美股（{market}.{ticker} 格式，自动识别）
const usData = await sdk.getKlineWithIndicators('105.MSFT', {
  indicators: { boll: true, rsi: true }
});
```

### 识别规则

| 格式 | 市场 | 示例 |
|------|------|------|
| 6 位数字或 `sh/sz/bj` 前缀 | A 股 | `000001`, `sz000001` |
| 5 位数字 | 港股 | `00700`, `09988` |
| `{市场}.{代码}` | 美股 | `105.MSFT`, `106.BABA` |

---

## 支持的指标

| 指标 | 方法 | 说明 |
|------|------|------|
| [MA](/api/indicator-ma) | `calcMA` | 均线（SMA/EMA/WMA） |
| [MACD](/api/indicator-macd) | `calcMACD` | 指数平滑异同移动平均线 |
| [BOLL](/api/indicator-boll) | `calcBOLL` | 布林带 |
| [KDJ](/api/indicator-kdj) | `calcKDJ` | 随机指标 |
| [RSI](/api/indicator-rsi-wr) | `calcRSI` | 相对强弱指标 |
| [WR](/api/indicator-rsi-wr) | `calcWR` | 威廉指标 |
| [BIAS](/api/indicator-bias) | `calcBIAS` | 乖离率 |
| [CCI](/api/indicator-cci) | `calcCCI` | 商品通道指数 |
| [ATR](/api/indicator-atr) | `calcATR` | 平均真实波幅 |

---

## 独立计算函数

所有指标计算函数都可以独立导入使用：

```typescript
import {
  calcMA,
  calcSMA,
  calcEMA,
  calcWMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  addIndicators,
} from 'stock-sdk';
```

`addIndicators` 可以把多个指标一次性挂到 K 线数组上，适合图表渲染场景。

详细用法请参考各指标的专属文档。
