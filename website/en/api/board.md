# board · Industry / Concept Boards

`sdk.board` splits into two perfectly symmetric sub-namespaces:

- `sdk.board.industry` — industry boards
- `sdk.board.concept` — concept boards

Both expose the same methods: `list` / `spot` / `constituents` / `kline` / `minuteKline`. Except for `list()`, the first argument is a **board code or board name** (e.g. `'BK1027'` or `'半导体'`); the SDK maintains the name-to-code mapping internally.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// Industry board list
const industries = await sdk.board.industry.list()

// Constituents of the "Semiconductor" concept board
const stocks = await sdk.board.concept.constituents('半导体')
```

## Methods

> `industry` and `concept` share identical methods. The table below uses `board.industry.*`; `board.concept.*` behaves the same.

| Method | Description |
|---|---|
| `board.industry.list()` | Industry board list (change%, market cap, leading stock, etc.) |
| `board.industry.spot(symbol)` | Real-time metrics for one board |
| `board.industry.constituents(symbol)` | Constituent stocks of one board |
| `board.industry.kline(symbol, opts?)` | Historical K-line of one board (daily / weekly / monthly) |
| `board.industry.minuteKline(symbol, opts?)` | Minute K-line / intraday of one board |

> Data is sourced from Eastmoney. `symbol` accepts a board code (e.g. `'BK1027'`) or a board name (e.g. `'半导体'`).

## Parameters

Board historical K-line options match individual stocks:

```ts
interface BoardKlineOptions {
  /** K-line period @default 'daily' */
  period?: 'daily' | 'weekly' | 'monthly'
  /** Adjustment type @default '' */
  adjust?: '' | 'qfq' | 'hfq'
  /** Start date YYYYMMDD */
  startDate?: string
  /** End date YYYYMMDD */
  endDate?: string
}
```

Board minute K-line options only carry the period:

```ts
interface BoardMinuteKlineOptions {
  /** Period (minutes) @default '5' */
  period?: '1' | '5' | '15' | '30' | '60'
}
```

`period: '1'` returns an **intraday** structure (with `price`, the latest price); `'5' | '15' | '30' | '60'` returns a standard **minute K-line** structure. Adjustment / period semantics match individual K-lines — see [kline](/en/api/kline) and [Adjustment](/en/guide/dividend-adjustment).

> Exact fields follow the implementation.

## Examples

```ts
// Concept board list
const concepts = await sdk.board.concept.list()

// Real-time metrics for one industry board
const spot = await sdk.board.industry.spot('BK1027')

// Constituents of the "Semiconductor" concept board
const cons = await sdk.board.concept.constituents('半导体')

// Industry board weekly K-line
const klineWeekly = await sdk.board.industry.kline('BK1027', {
  period: 'weekly',
})

// Concept board 5-minute K-line
const minute = await sdk.board.concept.minuteKline('半导体', { period: '5' })
```

## Return shapes

### list()

Returns an array of boards ranked by change%. Core fields:

| Field | Type | Description |
|---|---|---|
| `rank` | `number` | Rank |
| `name` | `string` | Board name |
| `code` | `string` | Board code, e.g. `BK1027` |
| `price` | `number \| null` | Latest price |
| `change` / `changePercent` | `number \| null` | Change / change% |
| `totalMarketCap` | `number \| null` | Total market cap |
| `turnoverRate` | `number \| null` | Turnover rate% |
| `riseCount` / `fallCount` | `number \| null` | Advancers / decliners |
| `leadingStock` | `string \| null` | Leading stock name |
| `leadingStockChangePercent` | `number \| null` | Leading stock change% |

### spot(symbol)

Returns a list of `{ item, value }` metrics (latest price, change%, turnover, turnover rate, etc.) — handy for a key-value display.

### constituents(symbol)

Returns an array of constituents, each with `rank` / `code` / `name` / `price` / `changePercent` / `change` / `volume` / `amount` / `amplitude` / `high` / `low` / `open` / `prevClose` / `turnoverRate` / `pe` / `pb`.

### kline / minuteKline

Each historical bar carries `date` + OHLC (`open/close/high/low`) + `volume/amount` + `amplitude/changePercent/change/turnoverRate`. Minute bars use a `time` field; the `period: '1'` intraday item additionally carries `price` (latest price) instead of change% / turnover-rate fields.

> Percentage fields are expressed as percentages (e.g. `5.2` means 5.2%); amounts/prices are in CNY. Return values contain no `raw` field. **Exact fields follow the implementation.**

## See also

- [kline](/en/api/kline) — individual K-lines, with detailed adjustment / period parameters
- [Adjustment](/en/guide/dividend-adjustment)
- [fundFlow](/en/api/fund-flow) — sector capital flow (`sectorRank` / `sectorHistory`)
