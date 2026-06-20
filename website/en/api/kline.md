# kline · K-line & Intraday

`sdk.kline` provides historical K-lines, minute K-lines, and indicator-enriched K-lines for CN / HK / US markets. The first argument is always a symbol string (parsed leniently by `normalizeSymbol`); the second is an optional options object for period / adjustment / date range.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// CN daily K-line (forward-adjusted by default)
const daily = await sdk.kline.cn('600519')

// US 15-minute K-line
const us15 = await sdk.kline.us('AAPL', { period: '15' })
```

## Methods

| Method | Description |
|---|---|
| `kline.cn(symbol, opts?)` | CN historical K-line (daily / weekly / monthly) |
| `kline.cnMinute(symbol, opts?)` | CN minute K-line / intraday (1 / 5 / 15 / 30 / 60 min) |
| `kline.hk(symbol, opts?)` | HK historical K-line |
| `kline.hkMinute(symbol, opts?)` | HK minute K-line / intraday |
| `kline.us(symbol, opts?)` | US historical K-line |
| `kline.usMinute(symbol, opts?)` | US minute K-line / intraday |
| `kline.withIndicators(symbol, opts?)` | Historical K-line + built-in indicators (MA / MACD / KDJ, etc.) |

> Data is sourced from Eastmoney. HK / US K-lines cover regular trading hours only (no pre-/post-market).

## Parameters

Historical K-line options (`cn` / `hk` / `us`):

```ts
interface HistoryKlineOptions {
  /** K-line period @default 'daily' */
  period?: 'daily' | 'weekly' | 'monthly'
  /** Adjustment type @default 'qfq' */
  adjust?: '' | 'qfq' | 'hfq'
  /** Start date YYYYMMDD */
  startDate?: string
  /** End date YYYYMMDD */
  endDate?: string
}
```

Minute K-line options (`cnMinute` / `hkMinute` / `usMinute`):

```ts
interface MinuteKlineOptions {
  /** Period (minutes) @default '1' */
  period?: '1' | '5' | '15' | '30' | '60'
  /** Adjustment (only 5/15/30/60; 1-min intraday is never adjusted) @default 'qfq' */
  adjust?: '' | 'qfq' | 'hfq'
  startDate?: string
  endDate?: string
}
```

> Exact fields follow the final implementation.

### Period

| Scope | Values | Meaning |
|---|---|---|
| Historical | `'daily'` / `'weekly'` / `'monthly'` | Daily (default) / weekly / monthly |
| Minute | `'1'` / `'5'` / `'15'` / `'30'` / `'60'` | 1 (default) / 5 / 15 / 30 / 60 minutes |

With `period: '1'`, the minute methods return an **intraday** structure (with `avgPrice`); with `'5' | '15' | '30' | '60'` they return a standard **minute K-line** structure (with `amplitude` / `changePercent` / `turnoverRate`).

### Adjustment

| Value | Meaning | When to use |
|---|---|---|
| `'qfq'` | Forward-adjusted (**default**) | Past prices rebased to the latest price; best for charting and trend viewing |
| `'hfq'` | Backward-adjusted | Past prices fixed, dividends/splits rolled forward; best for **backtesting / long-term return / compounding** |
| `''` | Unadjusted | Raw exchange prices |

> For backtesting or return calculations, **explicitly** pass `'hfq'` or `''` rather than relying on the forward-adjusted default — see [Adjustment](/en/guide/dividend-adjustment). The 1-minute intraday series is never adjusted.

## Examples

```ts
// CN weekly, backward-adjusted, bounded date range
const cnWeekly = await sdk.kline.cn('600519', {
  period: 'weekly',
  adjust: 'hfq',
  startDate: '20240101',
  endDate: '20241231',
})

// CN 5-minute K-line
const cn5m = await sdk.kline.cnMinute('600519', { period: '5' })

// CN intraday (period defaults to '1')
const cnTimeline = await sdk.kline.cnMinute('600519')

// HK daily (symbol may be '00700' / 'hk00700' / '00700.HK')
const hk = await sdk.kline.hk('00700')

// US daily, unadjusted
const us = await sdk.kline.us('AAPL', { adjust: '' })

// K-line with indicators
const withInd = await sdk.kline.withIndicators('600519', { period: 'daily' })
```

## Return shape

Historical K-line methods return an array, one item per bar, sorted ascending by time. Core fields:

| Field | Type | Description |
|---|---|---|
| `date` | `string` | Date `YYYY-MM-DD` (market local tz) |
| `timestamp` | `number \| null` | UTC ms of 00:00 that day; `null` if unparseable |
| `tz` | `string` | Market timezone, e.g. `Asia/Shanghai` |
| `code` | `string` | Instrument code |
| `open` / `close` / `high` / `low` | `number \| null` | OHLC |
| `volume` / `amount` | `number \| null` | Volume / turnover |
| `amplitude` / `changePercent` / `change` / `turnoverRate` | `number \| null` | Amplitude% / change% / change / turnover rate% |

HK / US historical K-lines additionally carry `currency` (`'HKD'` / `'USD'`) and `name`; HK also carries `lotSize` (not returned by the K-line endpoint, fixed `null` — use `sdk.quotes.hk` for lot size).

Minute K-lines (`'5'~'60'`) mirror historical fields but use a `time` field (`YYYY-MM-DD HH:mm`); the intraday series (`'1'`) carries `time` + OHLC + `volume/amount` + `avgPrice`.

> Percentage fields are expressed as percentages (e.g. `5.2` means 5.2%). Amount / price / volume have unified target units, but in the current beta runtime values still follow each provider's raw convention. `timestamp` is `null` when invalid (no more `NaN`). **Exact fields follow the implementation.**

## K-line with indicators

`kline.withIndicators` attaches built-in technical indicators (MA / MACD / BOLL / KDJ / RSI, etc.) on top of the historical K-line, returning a `KlineWithIndicators` structure and saving you the wiring.

```ts
const klines = await sdk.kline.withIndicators('600519', {
  period: 'daily',
  adjust: 'hfq',
})
```

If you already have a K-line array, you can compute indicators with the pure functions from the subpath export — no network involved:

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'

const macd = calcMACD(klines)
const enriched = addIndicators(klines, { ma: [5, 20], macd: true })
const signals = calcSignals(enriched, { ma: { fast: 5, slow: 20 }, macd: true })
```

See [indicators](/en/api/indicators) and [signals](/en/api/signals).

## See also

- [Symbols & Codes](/en/guide/symbols) — `string` / `SymbolRef` and `normalizeSymbol`
- [Adjustment](/en/guide/dividend-adjustment) — qfq / hfq / unadjusted
- [quotes](/en/api/quotes) — real-time quotes
- [board](/en/api/board) — board K-lines
