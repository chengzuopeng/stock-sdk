# indicators · Technical Indicators

The indicators are a set of **pure functions**: zero network, zero dependencies, isomorphic (browser + Node). Import them from the `stock-sdk/indicators` subpath so consumers who only need indicators don't pull `RequestClient` and every provider into their bundle.

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
```

There are 14 `calc*` functions plus one `addIndicators` enricher. The input is a K-line series you already have (from `sdk.kline.cn(...)`, or any data of your own); the output is an array of **equal length** (the leading items are `null` where there isn't enough data), index-aligned with the input.

## Input contract

Functions split into two groups by the data they need:

- **Close-only**: takes `(number | null)[]` (an array of closes) — `calcMA` / `calcMACD` / `calcBOLL` / `calcRSI` / `calcBIAS`.
- **OHLCV**: takes `OHLCV[]` (open/high/low/close/volume) — `calcKDJ` / `calcWR` / `calcCCI` / `calcATR` / `calcOBV` / `calcROC` / `calcDMI` / `calcSAR` / `calcKC`.

```ts
interface OHLCV {
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume?: number | null
}
```

> K-line objects already carry `open/high/low/close/volume`, so they can be fed directly to OHLCV functions; for close-only functions, take `klines.map(k => k.close)`.

## Methods

| Function | Description |
|---|---|
| `calcMA(closes, opts?)` | Moving averages (SMA / EMA / WMA, multi-period), returns `{ ma5, ma10, ... }` |
| `calcMACD(closes, opts?)` | MACD, returns `{ dif, dea, macd }` |
| `calcBOLL(closes, opts?)` | Bollinger Bands, returns `{ mid, upper, lower, bandwidth }` |
| `calcKDJ(data, opts?)` | Stochastic oscillator, returns `{ k, d, j }` |
| `calcRSI(closes, opts?)` | Relative Strength Index (multi-period), returns `{ rsi6, rsi12, ... }` |
| `calcWR(data, opts?)` | Williams %R (multi-period), returns `{ wr6, wr10, ... }` |
| `calcBIAS(closes, opts?)` | Bias ratio (multi-period), returns `{ bias6, bias12, ... }` |
| `calcCCI(data, opts?)` | Commodity Channel Index, returns `{ cci }` |
| `calcATR(data, opts?)` | Average True Range, returns `{ tr, atr }` |
| `calcOBV(data, opts?)` | On-Balance Volume, returns `{ obv, obvMa }` |
| `calcROC(data, opts?)` | Rate of Change, returns `{ roc, signal }` |
| `calcDMI(data, opts?)` | Directional Movement Index, returns `{ pdi, mdi, adx, adxr }` |
| `calcSAR(data, opts?)` | Parabolic SAR, returns `{ sar, trend, ep, af }` |
| `calcKC(data, opts?)` | Keltner Channel, returns `{ mid, upper, lower, width }` |
| `addIndicators(klines, opts?)` | Attach multiple indicators onto K-lines at once, returns `KlineWithIndicators[]` |

> Each function takes optional options (periods, multipliers, etc.); omit them to use common defaults. Exact fields and defaults follow the implementation.

## calcMA

Moving averages. `type` is `'sma'` (default) / `'ema'` / `'wma'`, `periods` lists the windows to compute, and result keys look like `ma5`, `ma20`.

```ts
import { calcMA } from 'stock-sdk/indicators'

const closes = klines.map(k => k.close)
const ma = calcMA(closes, { periods: [5, 10, 20], type: 'sma' })
// ma[last] => { ma5: 1712.3, ma10: 1698.1, ma20: 1675.4 }
```

## calcMACD

MACD — fast line `dif`, slow line `dea`, and the histogram `macd`. Defaults: `short=12, long=26, signal=9`.

```ts
import { calcMACD } from 'stock-sdk/indicators'

const macd = calcMACD(closes, { short: 12, long: 26, signal: 9 })
// macd[last] => { dif: 3.2, dea: 1.8, macd: 2.8 }
```

## calcBOLL

Bollinger Bands — `mid`, `upper`, `lower`, and `bandwidth`. Defaults: `period=20, stdDev=2`.

```ts
import { calcBOLL } from 'stock-sdk/indicators'

const boll = calcBOLL(closes, { period: 20, stdDev: 2 })
// boll[last] => { mid: 1700, upper: 1760, lower: 1640, bandwidth: 0.07 }
```

## calcKDJ

Stochastic oscillator. Needs OHLCV (uses high / low / close). Defaults: `period=9, kPeriod=3, dPeriod=3`.

```ts
import { calcKDJ } from 'stock-sdk/indicators'

const kdj = calcKDJ(klines, { period: 9 })
// kdj[last] => { k: 82.1, d: 75.6, j: 95.1 }
```

## calcRSI

Relative Strength Index, multi-period. Result keys look like `rsi6`, `rsi12`, `rsi24`; default `periods=[6, 12, 24]`.

```ts
import { calcRSI } from 'stock-sdk/indicators'

const rsi = calcRSI(closes, { periods: [6, 12, 24] })
// rsi[last] => { rsi6: 71.2, rsi12: 64.8, rsi24: 58.3 }
```

## calcWR

Williams %R (overbought/oversold), multi-period. Needs OHLCV; result keys look like `wr6`, `wr10`; default `periods=[6, 10]`.

```ts
import { calcWR } from 'stock-sdk/indicators'

const wr = calcWR(klines, { periods: [6, 10] })
// wr[last] => { wr6: -12.4, wr10: -20.1 }
```

## calcBIAS

Bias ratio, multi-period. Result keys look like `bias6`, `bias12`, `bias24`; default `periods=[6, 12, 24]`.

```ts
import { calcBIAS } from 'stock-sdk/indicators'

const bias = calcBIAS(closes, { periods: [6, 12, 24] })
// bias[last] => { bias6: 2.1, bias12: 3.4, bias24: 5.0 }
```

## calcCCI

Commodity Channel Index. Needs OHLCV; default `period=14`.

```ts
import { calcCCI } from 'stock-sdk/indicators'

const cci = calcCCI(klines, { period: 14 })
// cci[last] => { cci: 118.5 }
```

## calcATR

Average True Range — true range `tr` and its average `atr`. Needs OHLCV; default `period=14`.

```ts
import { calcATR } from 'stock-sdk/indicators'

const atr = calcATR(klines, { period: 14 })
// atr[last] => { tr: 24.5, atr: 21.3 }
```

## calcOBV

On-Balance Volume (price-volume) — `obv` and its moving average `obvMa`. Needs OHLCV with `volume`.

```ts
import { calcOBV } from 'stock-sdk/indicators'

const obv = calcOBV(klines, { maPeriod: 30 })
// obv[last] => { obv: 1.23e8, obvMa: 1.15e8 }
```

## calcROC

Rate of Change — `roc` (percentage) and a signal line `signal`. Needs OHLCV; default `period=12`.

```ts
import { calcROC } from 'stock-sdk/indicators'

const roc = calcROC(klines, { period: 12 })
// roc[last] => { roc: 4.7, signal: 3.1 }
```

## calcDMI

Directional Movement Index — `+DI`(`pdi`) / `-DI`(`mdi`) / `adx` / `adxr`. Needs OHLCV; default `period=14`.

```ts
import { calcDMI } from 'stock-sdk/indicators'

const dmi = calcDMI(klines, { period: 14 })
// dmi[last] => { pdi: 28.4, mdi: 14.1, adx: 32.7, adxr: 30.2 }
```

## calcSAR

Parabolic SAR — the `sar` value, trend direction `trend` (`1` up / `-1` down), extreme point `ep`, and acceleration factor `af`. Needs OHLCV.

```ts
import { calcSAR } from 'stock-sdk/indicators'

const sar = calcSAR(klines, { afStart: 0.02, afIncrement: 0.02, afMax: 0.2 })
// sar[last] => { sar: 1655.0, trend: 1, ep: 1720.0, af: 0.1 }
```

## calcKC

Keltner Channel (EMA + ATR based) — `mid` / `upper` / `lower` and channel `width`. Needs OHLCV.

```ts
import { calcKC } from 'stock-sdk/indicators'

const kc = calcKC(klines, { emaPeriod: 20, atrPeriod: 10, multiplier: 2 })
// kc[last] => { mid: 1700, upper: 1742, lower: 1658, width: 0.05 }
```

## addIndicators

Compute several indicators and attach them back onto the K-lines in one pass, returning `KlineWithIndicators[]` — each bar gains optional `ma` / `macd` / `boll`, etc. on top of its original fields. More convenient than calling each `calc*` and aligning indices by hand; this is also what backs [`sdk.kline.withIndicators`](/en/api/kline).

Each indicator slot accepts a `boolean` (enable with defaults) or its options object (custom params):

```ts
import { addIndicators } from 'stock-sdk/indicators'

const klines = await sdk.kline.cn('600519', { adjust: 'hfq' })

const enriched = addIndicators(klines, {
  ma: { periods: [5, 20], type: 'sma' },
  macd: true,                 // use defaults
  boll: { period: 20 },
  kdj: true,
  rsi: { periods: [6, 12] },
})

const last = enriched.at(-1)!
last.ma?.ma5     // moving average
last.macd?.dif   // MACD fast line
last.boll?.upper // Bollinger upper band
last.kdj?.k      // KDJ
```

Supported slots and their options: `ma` / `macd` / `boll` / `kdj` / `rsi` / `wr` / `bias` / `cci` / `atr` / `obv` / `roc` / `dmi` / `sar` / `kc`; slots left off are `undefined`.

## Return shape

- Every `calc*` returns an array of **equal length** to the input; item `i` corresponds to bar `i`, and numeric fields are `null` where there isn't enough data.
- Multi-period indicators (MA / RSI / WR / BIAS) return dynamic-keyed objects (e.g. `ma5` / `rsi12`); the keys vary with the `periods` you pass.
- `addIndicators` attaches each indicator result as an optional property on the K-line, leaving the original fields untouched.
- Pure computation: zero network, zero dependencies, isomorphic (browser + Node). **Exact fields follow the implementation.**

## See also

- [kline](/en/api/kline) — `kline.withIndicators` returns indicator-enriched K-lines directly
- [signals](/en/api/signals) — detect golden / death crosses, overbought / oversold, etc. on top of indicators
- [Indicators & signals guide](/en/guide/indicators)
