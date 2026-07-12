# signals · Signal Layer

The signal layer does **event detection** on top of [technical indicators](/en/api/indicators) — golden / death crosses, overbought / oversold, Bollinger breakouts, SAR reversals. Pure computation, zero network, zero dependencies; import it from the `stock-sdk/signals` subpath.

```ts
import { calcSignals } from 'stock-sdk/signals'
```

There's a single function, `calcSignals`: feed it a stretch of K-lines that **already have indicators computed** (`KlineWithIndicators[]`) and it returns an array of signal events sorted ascending by time.

## Methods

| Method | Description |
|---|---|
| `calcSignals(klines, options?)` | Detect signals from indicator-enriched K-lines, returns `Signal[]` |

## Prerequisite

`calcSignals` **does not compute indicators itself** — it reads the `ma` / `macd` / `kdj` / `rsi` / `boll` / `sar` fields already on each bar. So first attach indicators with [`addIndicators`](/en/api/indicators#addindicators) (or [`sdk.kline.withIndicators`](/en/api/kline)), then pass the result in.

> Important: the periods on the signal side must match the keys the indicator side actually produced. To detect a 5/20 MA golden cross, `addIndicators` must have computed `ma5` and `ma20`; same for RSI (signals read `rsi6` by default). A period mismatch throws `InvalidArgumentError` rather than silently returning an empty array.

## Signal types

`SignalType` has 14 members across six families:

| Family | Signal type | Trigger |
|---|---|---|
| MA cross | `ma_golden_cross` / `ma_death_cross` | fast `maFast` crosses above / below slow `maSlow` |
| MACD cross | `macd_golden_cross` / `macd_death_cross` | `dif` crosses above / below `dea` |
| KDJ cross | `kdj_golden_cross` / `kdj_death_cross` | `k` crosses above / below `d` |
| KDJ overbought / oversold | `kdj_overbought` / `kdj_oversold` | `k` > overbought threshold (default 80) / < oversold threshold (default 20) |
| RSI overbought / oversold | `rsi_overbought` / `rsi_oversold` | `rsi` > overbought threshold (default 70) / < oversold threshold (default 30) |
| BOLL breakout | `boll_break_upper` / `boll_break_lower` | close breaks above upper / below lower band |
| SAR reversal | `sar_reversal_up` / `sar_reversal_down` | SAR trend flips from down→up / up→down |

## options

Signals are computed only for the indicators you pass — omitted slots produce no signals:

```ts
interface SignalOptions {
  /** MA golden/death cross: fast crosses slow */
  ma?: { fast: number; slow: number }
  /** MACD golden/death cross: DIF crosses DEA */
  macd?: boolean
  /** KDJ cross + overbought/oversold (thresholds default 80 / 20) */
  kdj?: { overbought?: number; oversold?: number }
  /** RSI overbought/oversold (default period=6, thresholds 70 / 30) */
  rsi?: { period?: number; overbought?: number; oversold?: number }
  /** BOLL close breakout above/below the bands */
  boll?: boolean
  /** SAR trend reversal */
  sar?: boolean
}
```

> Pass `kdj` as `{}` to use default thresholds, or override `overbought` / `oversold`. The `rsi.period` must match the RSI period the indicator side computed.

## Example

```ts
import { addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'

// 1. Fetch K-lines (backward-adjusted is recommended for backtesting)
const klines = await sdk.kline.cn('600519', { adjust: 'hfq' })

// 2. Compute the indicators you need (MA/RSI periods must align with the signal side)
const enriched = addIndicators(klines, {
  ma: { periods: [5, 20] },
  macd: true,
  kdj: true,
  rsi: { periods: [6] },
  boll: true,
  sar: true,
})

// 3. Detect signals
const signals = calcSignals(enriched, {
  ma: { fast: 5, slow: 20 },
  macd: true,
  kdj: { overbought: 80, oversold: 20 },
  rsi: { period: 6, overbought: 70, oversold: 30 },
  boll: true,
  sar: true,
})

// Only golden crosses on the latest bar
const lastIdx = enriched.length - 1
const todayGolden = signals.filter(
  s => s.index === lastIdx && s.type.endsWith('golden_cross'),
)
```

## Return shape

`calcSignals` returns `Signal[]`, ordered by bar:

```ts
interface Signal {
  /** signal type, see table above */
  type: SignalType
  /** timestamp of the triggering bar (UTC ms, always non-null) */
  at: number
  /** index of the triggering bar in the input array */
  index: number
  /** extra context, e.g. the fast/slow periods of a cross, or the indicator value */
  detail?: Record<string, number>
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `SignalType` | one of the 14 signals |
| `at` | `number` | `timestamp` of the triggering bar (UTC ms); **always non-null** |
| `index` | `number` | index of the triggering bar in the input array, for looking the bar back up |
| `detail` | `Record<string, number>?` | context, e.g. `{ fast: 5, slow: 20 }` or `{ rsi: 72.4 }` |

**Time-anchor consistency**: v2 changes K-line `timestamp` to `number | null`, but `Signal.at` is always `number` — `calcSignals` **skips bars whose `timestamp` is `null`** (no valid time anchor → no signal), keeping signals and the time axis type-consistent.

> Pure computation: zero network, zero dependencies, isomorphic (browser + Node). **Exact fields follow the implementation.**

## See also

- [indicators](/en/api/indicators) — the input to signals: 14 `calc*` functions and `addIndicators`
- [kline](/en/api/kline) — `kline.withIndicators` gets you indicator-enriched K-lines in one step; `kline.signals` goes further, fetching + detecting signals in one call (also exposed as the MCP tool `get_kline_signals`)
- [Indicators & signals guide](/en/guide/indicators)
