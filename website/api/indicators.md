# indicators · 技术指标

技术指标是一组**纯计算函数**：零网络、零依赖、双端可用。从 subpath `stock-sdk/indicators` 导入，按需引入——只用指标的用户不会把 `RequestClient` 与所有 provider 拖进 bundle。

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
```

共 14 个 `calc*` 计算函数 + 1 个 `addIndicators` 附加器。输入是你已经拿到的 K 线序列（可来自 `sdk.kline.cn(...)`，也可以是任意自备数据），输出是与输入**等长**的结果数组（前若干项因数据不足为 `null`，与下标一一对应）。

## 输入约定

按依赖的数据维度，函数分两类：

- **仅依赖收盘价**：入参是 `(number | null)[]`（收盘价数组）—— `calcMA` / `calcMACD` / `calcBOLL` / `calcRSI` / `calcBIAS`。
- **依赖 OHLCV**：入参是 `OHLCV[]`（开高低收量）—— `calcKDJ` / `calcWR` / `calcCCI` / `calcATR` / `calcOBV` / `calcROC` / `calcDMI` / `calcSAR` / `calcKC`。

```ts
interface OHLCV {
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume?: number | null
}
```

> K 线接口返回的对象已带 `open/high/low/close/volume`，可直接喂给 OHLCV 类函数；收盘价类函数则取 `klines.map(k => k.close)`。

## 方法表

| 函数 | 说明 |
|---|---|
| `calcMA(closes, opts?)` | 移动平均线（支持 SMA / EMA / WMA，多周期），返回 `{ ma5, ma10, ... }` |
| `calcMACD(closes, opts?)` | 指数平滑异同移动平均，返回 `{ dif, dea, macd }` |
| `calcBOLL(closes, opts?)` | 布林带，返回 `{ mid, upper, lower, bandwidth }` |
| `calcKDJ(data, opts?)` | 随机指标，返回 `{ k, d, j }` |
| `calcRSI(closes, opts?)` | 相对强弱指标（多周期），返回 `{ rsi6, rsi12, ... }` |
| `calcWR(data, opts?)` | 威廉指标（多周期），返回 `{ wr6, wr10, ... }` |
| `calcBIAS(closes, opts?)` | 乖离率（多周期），返回 `{ bias6, bias12, ... }` |
| `calcCCI(data, opts?)` | 顺势指标，返回 `{ cci }` |
| `calcATR(data, opts?)` | 平均真实波幅，返回 `{ tr, atr }` |
| `calcOBV(data, opts?)` | 能量潮（量价），返回 `{ obv, obvMa }` |
| `calcROC(data, opts?)` | 变动率，返回 `{ roc, signal }` |
| `calcDMI(data, opts?)` | 动向指标，返回 `{ pdi, mdi, adx, adxr }` |
| `calcSAR(data, opts?)` | 抛物线转向，返回 `{ sar, trend, ep, af }` |
| `calcKC(data, opts?)` | 肯特纳通道，返回 `{ mid, upper, lower, width }` |
| `addIndicators(klines, opts?)` | 一次性把多个指标贴到 K 线上，返回 `KlineWithIndicators[]` |

> 每个函数都接受可选的 options（周期、参数倍数等），不传则用常用默认值。具体字段与默认值以实现为准。

## calcMA

移动平均线。`type` 选 `'sma'`（默认）/ `'ema'` / `'wma'`，`periods` 指定要算的周期，结果对象的键形如 `ma5`、`ma20`。

```ts
import { calcMA } from 'stock-sdk/indicators'

const closes = klines.map(k => k.close)
const ma = calcMA(closes, { periods: [5, 10, 20], type: 'sma' })
// ma[last] => { ma5: 1712.3, ma10: 1698.1, ma20: 1675.4 }
```

## calcMACD

指数平滑异同移动平均，输出快线 `dif`、慢线 `dea` 与柱 `macd`。默认 `short=12, long=26, signal=9`。

```ts
import { calcMACD } from 'stock-sdk/indicators'

const macd = calcMACD(closes, { short: 12, long: 26, signal: 9 })
// macd[last] => { dif: 3.2, dea: 1.8, macd: 2.8 }
```

## calcBOLL

布林带，输出中轨 `mid`、上轨 `upper`、下轨 `lower` 与带宽 `bandwidth`。默认 `period=20, stdDev=2`。

```ts
import { calcBOLL } from 'stock-sdk/indicators'

const boll = calcBOLL(closes, { period: 20, stdDev: 2 })
// boll[last] => { mid: 1700, upper: 1760, lower: 1640, bandwidth: 0.07 }
```

## calcKDJ

随机指标。需要 OHLCV（用到最高 / 最低 / 收盘）。默认 `period=9, kPeriod=3, dPeriod=3`。

```ts
import { calcKDJ } from 'stock-sdk/indicators'

const kdj = calcKDJ(klines, { period: 9 })
// kdj[last] => { k: 82.1, d: 75.6, j: 95.1 }
```

## calcRSI

相对强弱指标，多周期。结果键形如 `rsi6`、`rsi12`、`rsi24`，默认 `periods=[6, 12, 24]`。

```ts
import { calcRSI } from 'stock-sdk/indicators'

const rsi = calcRSI(closes, { periods: [6, 12, 24] })
// rsi[last] => { rsi6: 71.2, rsi12: 64.8, rsi24: 58.3 }
```

## calcWR

威廉指标（超买超卖），多周期。需要 OHLCV，结果键形如 `wr6`、`wr10`，默认 `periods=[6, 10]`。

```ts
import { calcWR } from 'stock-sdk/indicators'

const wr = calcWR(klines, { periods: [6, 10] })
// wr[last] => { wr6: -12.4, wr10: -20.1 }
```

## calcBIAS

乖离率，多周期。结果键形如 `bias6`、`bias12`、`bias24`，默认 `periods=[6, 12, 24]`。

```ts
import { calcBIAS } from 'stock-sdk/indicators'

const bias = calcBIAS(closes, { periods: [6, 12, 24] })
// bias[last] => { bias6: 2.1, bias12: 3.4, bias24: 5.0 }
```

## calcCCI

顺势指标。需要 OHLCV，默认 `period=14`。

```ts
import { calcCCI } from 'stock-sdk/indicators'

const cci = calcCCI(klines, { period: 14 })
// cci[last] => { cci: 118.5 }
```

## calcATR

平均真实波幅，输出真实波幅 `tr` 与平均值 `atr`。需要 OHLCV，默认 `period=14`。

```ts
import { calcATR } from 'stock-sdk/indicators'

const atr = calcATR(klines, { period: 14 })
// atr[last] => { tr: 24.5, atr: 21.3 }
```

## calcOBV

能量潮（量价指标），输出 `obv` 与其均线 `obvMa`。需要带 `volume` 的 OHLCV。

```ts
import { calcOBV } from 'stock-sdk/indicators'

const obv = calcOBV(klines, { maPeriod: 30 })
// obv[last] => { obv: 1.23e8, obvMa: 1.15e8 }
```

## calcROC

变动率，输出 `roc`（百分比）与信号线 `signal`。需要 OHLCV，默认 `period=12`。

```ts
import { calcROC } from 'stock-sdk/indicators'

const roc = calcROC(klines, { period: 12 })
// roc[last] => { roc: 4.7, signal: 3.1 }
```

## calcDMI

动向指标，输出 `+DI`(`pdi`) / `-DI`(`mdi`) / `adx` / `adxr`。需要 OHLCV，默认 `period=14`。

```ts
import { calcDMI } from 'stock-sdk/indicators'

const dmi = calcDMI(klines, { period: 14 })
// dmi[last] => { pdi: 28.4, mdi: 14.1, adx: 32.7, adxr: 30.2 }
```

## calcSAR

抛物线转向（SAR），输出 `sar` 值、趋势方向 `trend`（`1` 上升 / `-1` 下降）、极值点 `ep` 与加速因子 `af`。需要 OHLCV。

```ts
import { calcSAR } from 'stock-sdk/indicators'

const sar = calcSAR(klines, { afStart: 0.02, afIncrement: 0.02, afMax: 0.2 })
// sar[last] => { sar: 1655.0, trend: 1, ep: 1720.0, af: 0.1 }
```

## calcKC

肯特纳通道（基于 EMA + ATR），输出中轨 `mid` / 上轨 `upper` / 下轨 `lower` 与通道宽度 `width`。需要 OHLCV。

```ts
import { calcKC } from 'stock-sdk/indicators'

const kc = calcKC(klines, { emaPeriod: 20, atrPeriod: 10, multiplier: 2 })
// kc[last] => { mid: 1700, upper: 1742, lower: 1658, width: 0.05 }
```

## addIndicators

一次性把多个指标计算并贴回 K 线，返回 `KlineWithIndicators[]`——每根 K 线在原字段之上多出 `ma` / `macd` / `boll` 等可选属性。比逐个 `calc*` 再手动对齐下标更省事，也是 [`sdk.kline.withIndicators`](/api/kline) 的底层实现。

每个指标位接受 `boolean`（用默认参数开启）或对应的 options 对象（自定义参数）：

```ts
import { addIndicators } from 'stock-sdk/indicators'

const klines = await sdk.kline.cn('600519', { adjust: 'hfq' })

const enriched = addIndicators(klines, {
  ma: { periods: [5, 20], type: 'sma' },
  macd: true,                 // 用默认参数
  boll: { period: 20 },
  kdj: true,
  rsi: { periods: [6, 12] },
})

const last = enriched.at(-1)!
last.ma?.ma5     // 移动平均
last.macd?.dif   // MACD 快线
last.boll?.upper // 布林上轨
last.kdj?.k      // KDJ
```

支持的指标位与对应 options：`ma` / `macd` / `boll` / `kdj` / `rsi` / `wr` / `bias` / `cci` / `atr` / `obv` / `roc` / `dmi` / `sar` / `kc`，未开启的位为 `undefined`。

## 返回说明

- 所有 `calc*` 返回**与输入等长**的数组，第 `i` 项对应输入的第 `i` 根 K 线；数据不足时该项的数值字段为 `null`。
- 多周期指标（MA / RSI / WR / BIAS）的结果是动态键对象（如 `ma5` / `rsi12`），键名随你传入的 `periods` 变化。
- `addIndicators` 把各指标结果贴成 K 线上的可选属性，原始 K 线字段保持不变。
- 纯计算、零网络、零依赖、浏览器 + Node 双端可用。**具体字段以实现为准。**

## 相关

- [kline](/api/kline) —— `kline.withIndicators` 直接返回带指标的 K 线
- [signals](/api/signals) —— 在指标之上识别金叉 / 死叉 / 超买 / 超卖等信号
- [技术指标与信号指南](/guide/indicators)
