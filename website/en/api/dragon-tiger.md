# dragonTiger · Dragon-Tiger List

`sdk.dragonTiger` exposes A-share Dragon-Tiger (龙虎榜) data: daily listing details, per-stock aggregate stats, institutional buying/selling, brokerage branch rankings, and the seat-level breakdown of a single stock on a given day.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const detail = await sdk.dragonTiger.detail({ startDate: '20240101', endDate: '20240131' })
```

## Methods

| Method | Description |
|---|---|
| `dragonTiger.detail(options)` | Daily Dragon-Tiger listings over a date range |
| `dragonTiger.stockStats(period?)` | Per-stock aggregate stats (listing count, cumulative buy/sell amount, ...) |
| `dragonTiger.institution(options)` | Institutional buy/sell stats over a date range |
| `dragonTiger.branchRank(period?)` | Brokerage branch (seat) ranking |
| `dragonTiger.seatDetail(symbol, date)` | Seat-level breakdown for one stock on one day (buy + sell side) |

> All amount fields are in CNY. Items with a date follow the unified data contract and carry `date` / `timestamp` (`number | null`) / `tz`. Exact fields follow the implementation.

## dragonTiger.detail

Fetch daily Dragon-Tiger listings over a date range. Each record represents one stock's listing on one day.

### Example

```ts
const details = await sdk.dragonTiger.detail({
  startDate: '20240101', // YYYYMMDD
  endDate: '20240131',
})

console.log(`${details.length} listings in January`)

// Sort by net buy amount, take top 10
const topNet = [...details]
  .sort((a, b) => (b.netBuyAmount ?? 0) - (a.netBuyAmount ?? 0))
  .slice(0, 10)

for (const d of topNet) {
  console.log(`${d.date} ${d.name}(${d.code}) net buy ${d.netBuyAmount}`)
}
```

### Returns

`DragonTigerDetailItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` / `name` | Stock code / name |
| `date` | Listing date |
| `close` | Closing price for the day (CNY, `number \| null`) |
| `changePercent` | Daily change as a percentage (e.g. `5.2`) |
| `netBuyAmount` | Net buy amount on the list (CNY) |
| `buyAmount` / `sellAmount` | Buy / sell amount on the list (CNY) |
| `dealAmount` | Turnover on the list (CNY) |
| `totalAmount` | Stock's total market turnover that day (CNY) |
| `netBuyRatio` | Net buy amount as a share of total turnover (percentage) |
| `turnoverRate` | Turnover rate (percentage) |
| `reason` | Reason for listing |
| `afterChange1d` / `afterChange2d` / `afterChange5d` / `afterChange10d` | Change N days after listing (percentage) |

> Exact fields follow the implementation.

## dragonTiger.stockStats

Per-stock aggregate stats, surfacing the most active names over a period.

### Example

```ts
const stats = await sdk.dragonTiger.stockStats('3month')

const hot = stats
  .filter(s => (s.count ?? 0) >= 5)
  .sort((a, b) => (b.totalNetAmount ?? 0) - (a.totalNetAmount ?? 0))

console.log(`${hot.length} stocks listed 5+ times in the last 3 months`)
```

### Parameters

`period?: '1month' | '3month' | '6month' | '1year'`, defaults to the last month per implementation.

### Returns

`DragonTigerStockStatItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` / `name` | Stock code / name |
| `latestDate` | Most recent listing date |
| `close` / `changePercent` | Latest close (CNY) / change (percentage) |
| `count` | Number of listings in the period |
| `totalBuyAmount` / `totalSellAmount` | Cumulative buy / sell amount (CNY) |
| `totalNetAmount` | Cumulative net amount (CNY) |
| `totalDealAmount` | Cumulative turnover (CNY) |
| `buyOrgCount` / `sellOrgCount` | Cumulative buy- / sell-side institution counts |

> Exact fields follow the implementation.

## dragonTiger.institution

Institutional seat buy/sell stats over a date range.

### Example

```ts
const inst = await sdk.dragonTiger.institution({
  startDate: '20240101',
  endDate: '20240131',
})

const netBuy = inst.filter(i => (i.orgNetAmount ?? 0) > 0)
console.log(`${netBuy.length} records with net institutional buying`)
```

### Returns

`DragonTigerInstitutionItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` / `name` | Stock code / name |
| `date` | Listing date |
| `close` / `changePercent` | Close (CNY) / change (percentage) |
| `buyOrgCount` / `sellOrgCount` | Buy- / sell-side institution counts |
| `orgBuyAmount` / `orgSellAmount` | Institutional buy / sell amount (CNY) |
| `orgNetAmount` | Institutional net buy amount (CNY) |

> Exact fields follow the implementation.

## dragonTiger.branchRank

Brokerage branch (seat) ranking, ranked by cumulative buy/sell amount over the period.

### Example

```ts
const branches = await sdk.dragonTiger.branchRank('1month')

const topBuy = [...branches]
  .sort((a, b) => (b.totalBuyAmount ?? 0) - (a.totalBuyAmount ?? 0))
  .slice(0, 10)

for (const b of topBuy) {
  console.log(`${b.name} cumulative buy ${b.totalBuyAmount}`)
}
```

### Parameters

`period?: '1month' | '3month' | '6month' | '1year'`.

### Returns

`DragonTigerBranchItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` | Branch code |
| `name` | Branch name |
| `totalBuyAmount` / `totalSellAmount` | Cumulative buy / sell amount (CNY) |
| `buyCount` / `sellCount` | Buy / sell listing counts |
| `totalCount` | Total listing count |

> Exact fields follow the implementation.

## dragonTiger.seatDetail

Seat-level breakdown of one stock's listing on a given day. The buy side and sell side are returned together, distinguished by `side`.

### Example

```ts
const seats = await sdk.dragonTiger.seatDetail('600519', '20240115')

const buySide = seats.filter(s => s.side === 'buy')
const sellSide = seats.filter(s => s.side === 'sell')

console.log(`${buySide.length} buy-side seats`)
buySide.forEach(s => console.log(`  ${s.branchName} bought ${s.buyAmount}`))

console.log(`${sellSide.length} sell-side seats`)
sellSide.forEach(s => console.log(`  ${s.branchName} sold ${s.sellAmount}`))
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `symbol` | `string` | Stock symbol, e.g. `'600519'` / `'sh600519'` |
| `date` | `string` | Listing date, e.g. `'20240115'` |

### Returns

`DragonTigerSeatItem[]`. Representative fields:

| Field | Description |
|---|---|
| `rank` | Seat rank |
| `branchName` | Brokerage branch / seat name |
| `buyAmount` / `buyAmountRatio` | Buy amount (CNY) / share (percentage) |
| `sellAmount` / `sellAmountRatio` | Sell amount (CNY) / share (percentage) |
| `netAmount` | Net amount (CNY) |
| `side` | `'buy'` (buy side) / `'sell'` (sell side) |

> Exact fields follow the implementation.
