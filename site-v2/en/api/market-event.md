# marketEvent · Limit-Up Pools / Intraday Changes

`sdk.marketEvent` provides 6 limit-up stock pools, 22 intraday change types and sector-change details (source: East Money push2ex).

## Methods

| Method | Description |
|---|---|
| `marketEvent.ztPool(type?, date?)` | Limit-up themed stock pools (6 pools) |
| `marketEvent.stockChanges(type?)` | Per-stock intraday changes (22 change types) |
| `marketEvent.boardChanges()` | Sector-change details for the day |

> Exact parameters and return fields follow the final implementation; the field tables below reflect the current data contract.

---

## marketEvent.ztPool

Fetch limit-up themed stock-pool data — 6 pools in total. Some fields are only populated for specific pools (e.g. `continuousBoardCount` only for the limit-up pool, `sealAmount` only for the limit-down pool).

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Today's limit-up pool
const ztPool = await sdk.marketEvent.ztPool('zt');
console.log(`${ztPool.length} stocks hit the limit up today`);

// Filter for 3+ consecutive boards
ztPool
  .filter(s => (s.continuousBoardCount ?? 0) >= 3)
  .forEach(s => console.log(`${s.name}(${s.code}) ${s.continuousBoardCount} boards - ${s.industry}`));

// Limit-down pool for a specific date
const dtPool = await sdk.marketEvent.ztPool('dt', '20240115');
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `type` | `ZTPoolType` | Pool type, defaults to `'zt'` (see below) |
| `date` | `string` | `YYYYMMDD` or `YYYY-MM-DD`, defaults to today |

#### Pool type `ZTPoolType`

| Value | Description |
|---|---|
| `'zt'` | Limit-up pool (default) |
| `'yesterday'` | Yesterday's limit-up pool |
| `'strong'` | Strong pool (60-day highs / repeat limit-ups) |
| `'sub_new'` | Sub-new pool (first broken one-word board within 1 year of listing) |
| `'broken'` | Broken-board pool (touched limit but did not seal) |
| `'dt'` | Limit-down pool |

### Returns

`ZTPoolItem[]` (uniform fields; some are `null` depending on the pool):

```ts
interface ZTPoolItem {
  code: string;
  name: string;
  price: number | null;                  // latest price
  changePercent: number | null;          // change (percentage number)
  limitPrice: number | null;             // limit price (some pools)
  amount: number | null;                 // turnover (currency main unit)
  floatMarketValue: number | null;       // floating market value
  totalMarketValue: number | null;       // total market value
  turnoverRate: number | null;           // turnover rate (percentage number)
  continuousBoardCount: number | null;   // consecutive boards (limit-up pool only)
  firstBoardTime: string | null;         // first seal time HHMMSS (limit-up / broken pools)
  lastBoardTime: string | null;          // last seal time HHMMSS (limit-up pool)
  boardAmount: number | null;            // sealing funds (limit-up pool)
  sealAmount: number | null;             // sealing funds (limit-down pool)
  failedCount: number | null;            // number of board breaks
  industry: string;                      // industry
  ztStatistics: string;                  // limit-up stats (e.g. '3/5' = 3 limit-ups in 5 days)
  amplitude: number | null;              // amplitude (percentage number, some pools)
  speed: number | null;                  // change speed (some pools)
}
```

---

## marketEvent.stockChanges

Per-stock intraday changes — 22 change types in total.

```ts
// Monitor large buys
const largeBuys = await sdk.marketEvent.stockChanges('large_buy');
largeBuys.slice(0, 10).forEach(c => {
  console.log(`${c.time} ${c.name}(${c.code}) ${c.changeTypeLabel} ${c.info}`);
});

// Monitor limit-up seals
const sealUp = await sdk.marketEvent.stockChanges('limit_up_seal');
console.log(`currently sealed at limit up: ${sealUp.length}`);
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `type` | `StockChangeType` | Change type, defaults to `'large_buy'` (see below) |

#### Change type `StockChangeType`

| Type | Label | Type | Label |
|---|---|---|---|
| `rocket_launch` | Rocket launch | `large_sell` | Large sell |
| `quick_rebound` | Quick rebound | `accelerate_down` | Accelerating down |
| `large_buy` | Large buy (default) | `high_dive` | High dive |
| `limit_up_seal` | Sealed limit up | `limit_down_seal` | Sealed limit down |
| `limit_down_open` | Opened limit down | `limit_up_open` | Opened limit up |
| `big_buy_order` | Big buy order | `big_sell_order` | Big sell order |
| `auction_up` | Auction up | `auction_down` | Auction down |
| `high_open_5d` | High open 5-day | `low_open_5d` | Low open 5-day |
| `gap_up` | Gap up | `gap_down` | Gap down |
| `high_60d` | 60-day high | `low_60d` | 60-day low |
| `surge_60d` | 60-day surge | `drop_60d` | 60-day drop |

### Returns

`StockChangeItem[]`:

```ts
interface StockChangeItem {
  time: string;                  // event time HH:MM:SS
  code: string;
  name: string;
  changeType: StockChangeType;   // change type
  changeTypeLabel: string;       // change-type label
  info: string;                  // extra info (from the upstream API)
}
```

---

## marketEvent.boardChanges

Sector-change details for the day, including the change-type distribution and the most active stock.

```ts
const boards = await sdk.marketEvent.boardChanges();
boards
  .sort((a, b) => (b.totalChangeCount ?? 0) - (a.totalChangeCount ?? 0))
  .slice(0, 5)
  .forEach(b => {
    console.log(`${b.name}: ${b.totalChangeCount} changes, top ${b.topStockName} (${b.topStockDirection})`);
  });
```

### Returns

`BoardChangeItem[]`:

```ts
interface BoardChangeItem {
  name: string;                              // sector name
  changePercent: number | null;             // change (percentage number)
  mainNetInflow: number | null;             // main net inflow (currency main unit)
  totalChangeCount: number | null;          // total number of changes
  topStockCode: string;                     // most active stock code
  topStockName: string;                     // most active stock name
  topStockDirection: string;                // 'large buy' | 'large sell'
  changeTypeDistribution: Record<string, number>; // change-type distribution (type code -> count)
}
```
