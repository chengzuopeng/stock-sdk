# margin · Margin Trading

`sdk.margin` exposes A-share margin trading (融资融券) data: market-level account stats and stock-level margin target details.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const account = await sdk.margin.accountInfo()
```

## Methods

| Method | Description |
|---|---|
| `margin.accountInfo()` | Margin account stats (daily, market-wide macro data) |
| `margin.targetList(date?)` | Margin target details, filterable by trading day |

> Amount fields are in CNY; quantity fields such as `loanBalance` (short-sell balance, in shares) are in shares. Items with a date follow the unified data contract and carry `date` / `timestamp` (`number | null`) / `tz`. Exact fields follow the implementation.

## margin.accountInfo

Market-wide margin account stats, returned by day, reflecting overall leverage and guarantee ratios.

### Example

```ts
const account = await sdk.margin.accountInfo()
const latest = account[0]

console.log(`Latest financing balance ${latest?.finBalance}`)
console.log(`Average guarantee ratio ${latest?.avgGuaranteeRatio}%`)

// Financing-balance change over the last 30 days
const last30 = account.slice(0, 30)
const delta = (last30[0]?.finBalance ?? 0) - (last30.at(-1)?.finBalance ?? 0)
console.log(`30-day financing-balance change ${delta}`)
```

### Returns

`MarginAccountItem[]`. Representative fields:

| Field | Description |
|---|---|
| `date` | Stat date |
| `finBalance` | Financing (margin buy) balance (CNY) |
| `loanBalance` | Short-sell balance (CNY) |
| `finBuyAmount` | Financing buy amount (CNY) |
| `loanSellAmount` | Short-sell amount (CNY) |
| `investorCount` | Number of participating investors |
| `liabilityInvestorCount` | Number of investors with margin liabilities |
| `totalGuarantee` | Total collateral value (CNY) |
| `avgGuaranteeRatio` | Average maintenance guarantee ratio (percentage) |

> Exact fields follow the implementation.

## margin.targetList

Margin target details. Each record represents one stock eligible for margin trading. When no date is given, the server's latest trading day is used.

### Example

```ts
// Server's latest trading day by default
const targets = await sdk.margin.targetList()
console.log(`${targets.length} margin targets`)

// Sort by financing balance, find the 10 most leveraged
const top10 = [...targets]
  .sort((a, b) => (b.finBalance ?? 0) - (a.finBalance ?? 0))
  .slice(0, 10)

top10.forEach((t, i) => {
  console.log(`#${i + 1} ${t.name}(${t.code}) financing balance ${t.finBalance}`)
})

// Query a specific date
const jan15 = await sdk.margin.targetList('2024-01-15')
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `date` | `string?` | Trading day, e.g. `'2024-01-15'`; defaults to the latest trading day |

### Returns

`MarginTargetItem[]`. Representative fields:

| Field | Description |
|---|---|
| `code` / `name` | Stock code / name |
| `date` | Data date |
| `finBalance` | Financing balance (CNY) |
| `finBuyAmount` | Financing buy amount (CNY) |
| `finRepayAmount` | Financing repayment amount (CNY) |
| `loanBalance` | Short-sell balance (shares) |
| `loanSellVolume` | Short-sell volume (shares) |
| `loanRepayVolume` | Short-sell repayment volume (shares) |

> Exact fields follow the implementation.
