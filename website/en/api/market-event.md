# marketEvent · Limit-Up Pools / Intraday Changes

`sdk.marketEvent` provides 6 limit-up stock pools, 22 intraday change types and sector-change details (source: East Money push2ex).

## Methods

| Method | Description |
|---|---|
| `marketEvent.ztPool(type?, date?)` | Limit-up themed stock pools (6 pools) |
| `marketEvent.stockChanges(type?)` | Market-wide intraday changes (22 types; array multi-type / `'all'` supported) |
| `marketEvent.individualChanges(symbol, opts?)` | Single stock's change-event stream for one trading day (all types) |
| `marketEvent.individualChangesHistory(symbol, opts?)` | Single stock's changes over the last N days (per-day aggregation + coverage + stats) |
| `marketEvent.boardChanges()` | Sector-change details for the day |

> Exact parameters and return fields follow the final implementation; the field tables below reflect the current data contract.

::: tip Market events are real-time intraday data
Unlike **post-close** datasets such as Dragon-Tiger or fund flow, the limit-up pool and intraday changes **update live during the session**: querying today during trading hours returns the stocks that have hit the limit / triggered a change *so far*, and the set grows as the session progresses.

So the same day queried at different times returns different row counts (fewer in the morning, more near the close) — that is expected. For the day's **final** result, query **after the close**.
:::

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

Market-wide intraday changes — 22 types in total. `type` accepts a single type, an array (multiple types in one request), or `'all'` (all 22 types; auto-paginates when the total exceeds the 5000-per-page server limit).

```ts
// Monitor large buys
const largeBuys = await sdk.marketEvent.stockChanges('large_buy');
largeBuys.slice(0, 10).forEach(c => {
  console.log(`${c.time} ${c.name}(${c.code}) ${c.changeTypeLabel} ${c.info}`);
});

// Multiple types in one request — each row's actual type comes from the response `t` code
const seals = await sdk.marketEvent.stockChanges(['limit_up_seal', 'limit_down_seal']);

// All 22 types (can exceed 10k rows on a trading day; auto-paginated)
const all = await sdk.marketEvent.stockChanges('all');
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `type` | `StockChangeType \| StockChangeType[] \| 'all'` | Change type, defaults to `'large_buy'`; array for multi-type, `'all'` for everything |

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
  time: string;                             // event time HH:MM:SS
  code: string;
  name: string;
  changeType: StockChangeType | 'unknown';  // 'unknown' for new server-side codes
  typeCode: string;                         // raw type code (server `t` field)
  changeTypeLabel: string;                  // Chinese label ('' for unknown codes)
  info: string;                             // extra info (from the upstream API)
}
```

---

## marketEvent.individualChanges

Change-event stream of a **single A-share stock** for one trading day (all types in one call, newest first; server-side codes beyond the 22 known types degrade to `'unknown'` with the raw code preserved).

```ts
// Today's events
const events = await sdk.marketEvent.individualChanges('603087');

// A specific date
const friday = await sdk.marketEvent.individualChanges('603087', { date: '20260703' });
```

::: warning Server retention window
The per-stock endpoint only retains **roughly the last few weeks** of data (about a month in practice, and **not guaranteed to be contiguous** — occasional per-date gaps exist): dates with no data and "no changes that day" both return an empty array. Use `individualChangesHistory` (per-day `available` flags) to tell them apart, and always branch on the returned `available` instead of assuming a fixed window.
:::

### Parameters

| Param | Type | Description |
|---|---|---|
| `symbol` | `string` | Stock code, e.g. `'600519'` / `'sh600519'` |
| `options.date` | `string` | Trading day `YYYYMMDD` or `YYYY-MM-DD`, defaults to today |

### Returns

`IndividualStockChangeItem[]`:

```ts
interface IndividualStockChangeItem {
  time: string;                             // HH:MM:SS
  typeCode: string;                         // raw type code (may exceed the 22 types, e.g. 8219)
  changeType: StockChangeType | 'unknown';
  changeTypeLabel: string;                  // Chinese label ('' for unknown codes)
  price: number | null;                     // trigger price
  changePercent: number | null;             // change% at trigger time
  info: string;                             // raw info CSV (format varies by type)
  v: number | null;                         // undocumented upstream field, passed through as-is
}
```

---

## marketEvent.individualChangesHistory

Aggregates a single A-share stock's intraday changes over the **last N calendar days**: trading days inside the window are enumerated via the A-share trading calendar and fetched concurrently, then merged. This covers the "changes over the past 7 / 15 / 30 days" scenario.

```ts
const his = await sdk.marketEvent.individualChangesHistory('603087', { days: 15 });

console.log(his.coverage);
// { from: '2026-06-22', to: '2026-07-06', availableFrom: '2026-06-23' }
console.log(his.stats);
// keyed by raw type code (stable); Chinese label inline:
// { '4': { count: 12, label: '封涨停板' }, '16': { count: 9, label: '打开涨停板' }, ... }
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `symbol` | `string` | Stock code |
| `options.days` | `number` | Last N calendar days, `1~60`, defaults to `7` |

::: tip Failure semantics
If any trading day's request still fails after the built-in retries, the whole call throws — **no partial results** (fail-fast). Per-day `available: false` strictly means "the server has no data for that day"; it is never used to mask a failed request.
:::

### Returns

`IndividualChangesHistory`:

```ts
interface IndividualChangesHistory {
  code: string;
  name: string;
  requestedDays: number;
  coverage: {
    from: string;                         // window start YYYY-MM-DD
    to: string;                           // window end (today, Beijing time)
    availableFrom: string | null;         // first trading day with data (gaps may follow); null if none
  };
  days: Array<{                           // ascending by date
    date: string;
    available: boolean;                   // false = server has no data for that day
    code: string;
    name: string;
    changes: IndividualStockChangeItem[];
  }>;
  stats: Record<string, { count: number; label: string }>; // keyed by raw type code; label = Chinese display name ('' for unknown codes)
}
```

> **Full 30-day view**: tick-level changes are limited by the server window; for the days beyond it combine `fundFlow.individual` (daily main-capital history), local limit-up detection from K-lines, and `dragonTiger.detail` — see the [guide: 30-day per-stock changes panorama](/en/guide/stock-changes-panorama).

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
