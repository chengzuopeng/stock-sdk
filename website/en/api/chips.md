# chips · Chip Distribution

`sdk.chips` provides **chip distribution (CYQ, cost-transfer distribution)** for A-shares / HK / US stocks: daily profit ratio, average cost, 90% / 70% cost ranges with concentration, plus the chip-peak histogram itself.

There is no public query API for chip distribution — every charting app derives it locally from daily K-lines and turnover rates. This SDK ports Eastmoney's original front-end algorithm (the same logic akshare's `stock_cyq_em` runs) and computes everything on your side: the raw material comes from the existing daily K-line endpoints, **no new data-source dependency**, works in both browser and Node.js.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// Kweichow Moutai: chip distribution for the latest 90 trading days
// (default: qfq adjustment, 120-bar lookback window)
const rows = await sdk.chips.cn('600519')
console.log(rows.at(-1))
// {
//   date: '2026-07-06',
//   profitRatio: 0.923,      // share of chips whose cost is below the close
//   avgCost: 1420.5,         // cost at the 50% chip percentile (Eastmoney's "average cost")
//   cost90Low: 1350.2,       // 90% chip cost range
//   cost90High: 1489.7,
//   concentration90: 0.049,  // (high - low) / (high + low)
//   cost70Low: 1382.4,
//   cost70High: 1461.3,
//   concentration70: 0.028,
// }

// Attach the latest chip-peak shape (distribution over 150 price buckets)
const withPeak = await sdk.chips.cn('600519', { days: 30, includeHistogram: 'last' })
const peak = withPeak.at(-1)!.histogram!
// peak.prices: [1350.2, 1351.1, ...]  150 bucket prices (low → high)
// peak.ratios: [0.0021, 0.0038, ...]  chip share per bucket, sums to ≈ 1
```

## Methods

| Method | Description |
|---|---|
| `chips.cn(symbol, opts?)` | A-share chip distribution (symbol forms same as `kline.cn`, e.g. `'600519'` / `'sh600519'`) |
| `chips.hk(symbol, opts?)` | HK-stock chip distribution (e.g. `'00700'` / `'hk00700'`) |
| `chips.us(symbol, opts?)` | US-stock chip distribution (bare ticker `'AAPL'` or secid `'105.AAPL'`) |

> Raw material: Eastmoney daily K-lines (with turnover rate) of the corresponding market. Indices / ETFs have no turnover-rate concept and are out of scope for this model.

## Options

```ts
interface ChipDistributionRequestOptions {
  /** Number of most recent trading days to return @default 90 */
  days?: number
  /** Price adjustment (same as kline) @default 'qfq' */
  adjust?: '' | 'qfq' | 'hfq'
  /**
   * Distribution lookback window (bars)
   * - 120 (default): matches what the Eastmoney app displays
   * - 0: accumulate from the first listed day — akshare stock_cyq_em's
   *   convention (more computation)
   * @default 120
   */
  range?: number
  /**
   * Chip-peak histogram:
   * - omitted / false: not attached
   * - 'last' or true: attached to the last row only
   * - 'all': attached to every row (mind the payload: 150 buckets × 2 arrays per row)
   */
  includeHistogram?: boolean | 'last' | 'all'
  /** Rounding decimals for ratio-like fields (prices are fixed at 2 decimals) @default 3 */
  decimals?: number
}
```

## Return value

`Promise<ChipDistributionItem[]>`, ascending by date:

| Field | Type | Description |
|---|---|---|
| `date` | `string` | `YYYY-MM-DD` |
| `profitRatio` | `number \| null` | 0~1, share of chips whose cost is below the close |
| `avgCost` | `number \| null` | Cost at the 50% chip percentile (median cost — Eastmoney's "average cost" convention) |
| `cost90Low` / `cost90High` | `number \| null` | Cost range holding the middle 90% of chips |
| `concentration90` | `number \| null` | `(high - low) / (high + low)`, smaller = more concentrated |
| `cost70Low` / `cost70High` | `number \| null` | Cost range holding the middle 70% of chips |
| `concentration70` | `number \| null` | 70% concentration |
| `histogram` | `ChipHistogram?` | Chip peak: `prices` (150 buckets) + `ratios` (share per bucket, sums to ≈ 1) |

When turnover is entirely missing / zero inside the window (nothing to derive from), the row's stats are `null`.

## Algorithm & conventions

- **Algorithm**: faithful port of Eastmoney's front-end `CYQCalculator` — price domain split into 150 buckets (precision floor 0.01); each day the existing chips decay by `× (1 - turnover)`, then the day's traded chips spread over `[low, high]` as a triangular distribution peaking at `(O+C+H+L)/4`; limit-locked days (high == low) stack into a single bucket. Unit tests assert per-day, per-field parity against the original JS.
- **`range` vs akshare**: the Eastmoney app actually uses a 120-bar window; akshare invokes the original JS with the window parameter unset, which degenerates to full-history accumulation. **The two conventions produce different numbers for the same day.** The default `120` matches the Eastmoney app; to reproduce akshare output pass `{ range: 0, adjust: '' }`.
- **Adjustment**: values change with the adjustment convention. Default `qfq` is consistent with the SDK's K-line default; akshare defaults to unadjusted.
- **Pure-function entry**: the computation core `calcChipDistribution(klines, options)` is exported from `stock-sdk/indicators` and accepts your own K-lines (requires `open/high/low/close/turnoverRate`); the `tail` option limits output to the last N bars (avoids O(N²) work in full-accumulation mode).

```ts
import { calcChipDistribution } from 'stock-sdk/indicators'

const klines = await sdk.kline.cn('600519', { startDate: '20250101' })
const rows = calcChipDistribution(klines, { range: 120, tail: 30 })
```

## Applicability notes

- **Individual stocks only**: indices / ETFs have no turnover-rate concept;
- **Low-turnover distortion**: for long-suspended or ultra-low-turnover names (e.g. some HK penny stocks) the window's cumulative turnover is tiny and the distribution is dominated by the first bar's stacking — treat with care;
- **HK penny-stock granularity**: the 0.01 precision floor coarsens histograms for 3-decimal-tick low-priced HK stocks;
- **US turnover convention**: Eastmoney's convention (exchange-reported volume / float), dark-pool details not included — read the model for relative shape.

## CLI / MCP

```bash
stock-sdk chips cn 600519 --days 30 --histogram last
stock-sdk chips hk 00700 --range 0 --adjust none
stock-sdk chips us 105.AAPL --days 60
```

MCP tools: `get_chip_distribution` (core toolset) / `get_hk_chip_distribution` / `get_us_chip_distribution`.
