# blockTrade · Block Trades

`sdk.blockTrade` exposes A-share block-trade (大宗交易) data: a daily market overview, trade-level details, and per-stock daily aggregates.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const stat = await sdk.blockTrade.marketStat()
```

## Methods

| Method | Description |
|---|---|
| `blockTrade.marketStat()` | Daily market-wide block-trade overview |
| `blockTrade.detail(options?)` | Trade-level block-trade records over a date range |
| `blockTrade.dailyStat(options?)` | Per-stock daily block-trade aggregates |

> All amount fields are in CNY. Items with a date follow the unified data contract and carry `date` / `timestamp` (`number | null`) / `tz`. Exact fields follow the implementation.

## blockTrade.marketStat

Daily market-wide block-trade overview, showing daily volume and the premium / discount structure.

### Example

```ts
const stat = await sdk.blockTrade.marketStat()

stat.slice(0, 5).forEach(s => {
  console.log(
    `${s.date} total ${s.totalAmount}, premium ${s.premiumRatio}%, discount ${s.discountRatio}%`,
  )
})
```

### Returns

`BlockTradeMarketStatItem[]`. Representative fields:

| Field | Description |
|---|---|
| `date` | Trading day |
| `shClose` | Shanghai Composite close |
| `shChangePercent` | Shanghai Composite change (percentage) |
| `totalAmount` | Total block-trade turnover (CNY) |
| `premiumAmount` / `premiumRatio` | Premium turnover (CNY) / share (percentage) |
| `discountAmount` / `discountRatio` | Discount turnover (CNY) / share (percentage) |

> Exact fields follow the implementation.

## blockTrade.detail

Trade-level block-trade records over a date range. Each record is a single deal.

### Example

```ts
const detail = await sdk.blockTrade.detail({
  startDate: '20240101', // YYYYMMDD or YYYY-MM-DD
  endDate: '20240131',
})

// Filter block trades of a single stock
const moutai = detail.filter(d => d.code === '600519')
for (const d of moutai) {
  console.log(`${d.date} price ${d.dealPrice}, premium ${d.premiumRate}%`)
}
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `options.startDate` | `string?` | Start date, `YYYYMMDD` or `YYYY-MM-DD` |
| `options.endDate` | `string?` | End date |

> When omitted, a default range is used per implementation.

### Returns

`BlockTradeDetailItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` / `name` | Stock code / name |
| `date` | Deal date |
| `close` / `changePercent` | Daily close (CNY) / change (percentage) |
| `dealPrice` | Block-trade price (CNY) |
| `dealVolume` | Volume (shares) |
| `dealAmount` | Turnover (CNY) |
| `premiumRate` | Premium rate (percentage; negative means discount) |
| `buyBranch` / `sellBranch` | Buy- / sell-side brokerage branch |

> Exact fields follow the implementation.

## blockTrade.dailyStat

Per-stock daily aggregates that roll up multiple deals of the same stock on the same day into one record.

### Example

```ts
const daily = await sdk.blockTrade.dailyStat({
  startDate: '20240101',
  endDate: '20240131',
})

// Stocks with the largest block-trade turnover that month
const top = [...daily]
  .sort((a, b) => (b.dealTotalAmount ?? 0) - (a.dealTotalAmount ?? 0))
  .slice(0, 10)

top.forEach(d => console.log(`${d.name}(${d.code}) total ${d.dealTotalAmount}`))
```

### Parameters

Same as `blockTrade.detail`: optional `startDate` / `endDate`.

### Returns

`BlockTradeDailyStatItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` / `name` | Stock code / name |
| `date` | Stat date |
| `close` / `changePercent` | Close (CNY) / change (percentage) |
| `dealCount` | Number of deals |
| `dealTotalAmount` | Total turnover (CNY) |
| `dealTotalVolume` | Total volume (shares) |
| `premiumAmount` / `discountAmount` | Premium / discount turnover (CNY) |

> Exact fields follow the implementation.
