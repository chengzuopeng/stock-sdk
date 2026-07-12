# Indicators & Signals

The indicator and signal layers in stock-sdk are **pure computation, zero network**. You feed in a K-line series and get back structured indicator values or signal events—no requests are made. Both layers ship as separate subpath exports, so you import only what you need: people who use only indicators don't pull `RequestClient` and every provider into their bundle.

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'
```

There are three layers:

- **Indicator functions** (`stock-sdk/indicators`)—14 `calc*` functions that take a numeric series or K-lines and return a structured indicator object.
- **Batch enrichment** (`addIndicators` / `sdk.kline.withIndicators`)—compute several indicators at once and attach them to every bar.
- **Signal layer** (`stock-sdk/signals`)—detect events like golden/death crosses and overbought/oversold conditions on top of indicator-enriched K-lines.

## The 14 indicator functions

All calculation functions are exported from `stock-sdk/indicators` and return **structured objects** (not bare arrays), so you can read each component directly.

| Function | Description |
|---|---|
| `calcMA` | Simple moving average (multiple periods, e.g. 5 / 10 / 20 / 60) |
| `calcMACD` | Moving Average Convergence Divergence; returns `dif` / `dea` / `macd` |
| `calcBOLL` | Bollinger Bands; returns `mid` / `upper` / `lower` / `bandwidth` |
| `calcKDJ` | Stochastic oscillator; returns `k` / `d` / `j` |
| `calcRSI` | Relative Strength Index (configurable period) |
| `calcWR` | Williams %R |
| `calcBIAS` | Bias ratio |
| `calcCCI` | Commodity Channel Index |
| `calcATR` | Average True Range |
| `calcOBV` | On-Balance Volume (depends on volume) |
| `calcROC` | Rate of Change |
| `calcDMI` | Directional Movement Index (incl. `+DI` / `-DI` / `ADX`) |
| `calcSAR` | Parabolic SAR; returns the `sar` value and `trend` direction |
| `calcKC` | Keltner Channel |

::: tip Return fields
The exact inputs and return fields of each function (period defaults, alignment, null placeholders) follow the final implementation. The examples below show typical usage; field names are authoritative in the implementation's JSDoc and type definitions.
:::

### Single-indicator calculation

```ts
import { calcMA, calcMACD, calcKDJ } from 'stock-sdk/indicators'
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const kline = await sdk.kline.cn('600519') // forward-adjusted daily K by default

// Closing-price series
const closes = kline.map(k => k.close)

const ma = calcMA(closes, [5, 10, 20])   // multi-period MAs
const macd = calcMACD(closes)            // { dif, dea, macd }
const kdj = calcKDJ(kline)               // { k, d, j }, needs high/low/close
```

OBV depends on volume, while CCI / ATR / DMI / SAR / KDJ / WR depend on high, low, and close—so you typically pass the whole K-line series and let the function pick the fields it needs. MA / MACD / RSI / BIAS / ROC only look at close, so a closing-price array suffices.

::: warning Volume units
Volume-dependent indicators like `calcOBV` produce numbers that depend on the `volume` units in your K-lines. v2's target unit is "shares", but unit conversion is deferred for now, so at runtime `volume` may still be in each provider's raw unit (e.g. "lots" for A-shares). Keep this in mind when comparing across markets or migrating v1 backtest results.
:::

::: tip Output precision
Rounding indicators (ma / macd / boll / kdj / rsi / wr / bias / cci / atr) emit 3 decimals by default, adjustable via each indicator's `decimals` option; obv / roc / dmi / sar / kc emit raw floats.
:::

## addIndicators: batch enrichment

`addIndicators` computes several indicators at once and attaches them back to each bar, producing `KlineWithIndicators<T>`. Use it when you want everything in one pass.

```ts
import { addIndicators } from 'stock-sdk/indicators'

const enriched = addIndicators(kline, {
  ma: [5, 10, 20],
  macd: true,
  boll: true,
  kdj: true,
  rsi: { period: 14 },
})

// Each bar gains the corresponding indicator components on top of its original fields
enriched.forEach(bar => {
  console.log(bar.time, bar.close, bar.ma5, bar.macd?.dif, bar.kdj?.k)
})
```

The exact options and attached field names follow the implementation; internally it orchestrates the 14 `calc*` functions above.

## sdk.kline.withIndicators: fetch with indicators attached

If you want to "fetch K-lines with indicators already on them", use `sdk.kline.withIndicators`—it fetches the K-lines inside the SDK and runs `addIndicators` for you, saving the manual two-step.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

const kline = await sdk.kline.withIndicators('600519', {
  ma: [5, 20],
  macd: true,
  boll: true,
})
// kline is already KlineWithIndicators, each bar carries indicator components
```

::: tip Fetching vs pure computation
`sdk.kline.withIndicators` makes a request (it lives on the SDK main entry); `addIndicators` / `calc*` are pure functions and, when imported from `stock-sdk/indicators` alone, do not pull in the network layer. If you already have K-line data, prefer the pure functions to keep your bundle lean.
:::

## Signal layer: calcSignals

The signal layer performs **event detection** on top of indicator-enriched K-lines, emitting a list of `Signal`s. It is likewise pure computation, exported from `stock-sdk/signals`.

```ts
import { calcSignals } from 'stock-sdk/signals'
import { addIndicators } from 'stock-sdk/indicators'

const enriched = addIndicators(kline, { ma: [5, 20], macd: true, kdj: true })

const signals = calcSignals(enriched, {
  ma: { fast: 5, slow: 20 },   // MA golden / death cross
  macd: true,                  // MACD golden / death cross
  kdj: { overbought: 80, oversold: 20 },
  rsi: { period: 14, overbought: 70, oversold: 30 },
  boll: true,                  // break upper / lower band
  sar: true,                   // SAR reversal
})
```

### Signal types

`calcSignals` recognizes events across the following categories:

| Category | Signal | Trigger |
|---|---|---|
| MA | `ma_golden_cross` / `ma_death_cross` | Fast MA crosses above / below slow MA |
| MACD | `macd_golden_cross` / `macd_death_cross` | `dif` crosses above / below `dea` |
| KDJ | `kdj_golden_cross` / `kdj_death_cross` / `kdj_overbought` / `kdj_oversold` | K/D cross, `k` past threshold |
| RSI | `rsi_overbought` / `rsi_oversold` | RSI past overbought / oversold threshold |
| BOLL | `boll_break_upper` / `boll_break_lower` | Close breaks upper / lower band |
| SAR | `sar_reversal_up` / `sar_reversal_down` | SAR trend direction flips |

### Return shape

Each `Signal` describes "which bar, what triggered, and which parameters":

```ts
interface Signal {
  type: SignalType          // e.g. 'ma_golden_cross'
  at: number                // timestamp of the triggering bar (always non-null)
  index: number             // index of the triggering bar
  detail?: Record<string, number> // e.g. { fast: 5, slow: 20 }
}
```

::: warning timestamp consistency
v2 narrows K-line `timestamp` to `number | null`, but `Signal.at` is always a `number`—`calcSignals` **skips bars whose `timestamp` is `null`** (no valid time anchor, no signal), keeping signals type-consistent with the time axis.
:::

The exact default thresholds, configurable options, and `detail` fields follow the implementation.

## Which layer when

- Need the raw values of one or two indicators → call the corresponding `calc*` directly.
- Want a batch of indicators attached to K-lines for iteration → `addIndicators`, or `sdk.kline.withIndicators` to fetch-and-attach.
- Want to detect **events** like golden/death crosses or overbought/oversold (for alerts, screener conditions, or backtest strategy inputs) → `calcSignals`.

Signal-layer output feeds directly into the [screener & backtest](/en/api/screener) strategies, wiring "indicators → events → decisions" into a fully local, reproducible pipeline.
