# northbound · Stock Connect / Northbound Flow

`sdk.northbound` provides Northbound (Shanghai + Shenzhen Connect) and Southbound (Hong Kong Connect) capital data: intraday minutes, summary, holding ranks, history and per-stock holdings (source: East Money open data center).

::: tip Browser-friendly
All endpoints hit East Money open data directly with no CORS restrictions, so they can be called straight from the browser.
:::

Most methods take a `direction` argument to select the flow direction: `'north'` (Northbound, default) / `'south'` (Southbound).

## Methods

| Method | Description |
|---|---|
| `northbound.minute(direction?)` | Intraday net inflow (one point per minute) |
| `northbound.summary()` | Stock Connect market flow summary |
| `northbound.holdingRank(opts?)` | Northbound per-stock holding ranking |
| `northbound.history(direction?, opts?)` | Northbound / Southbound daily history |
| `northbound.individual(symbol, opts?)` | Per-stock Northbound holding history |

> Exact parameters and return fields follow the final implementation; the field tables below reflect the current data contract. **Amount units follow each field's comment (`minute` is in units of 10k, others in yuan); v2 targets a unified "yuan" convention — follow the implementation.**

---

## northbound.minute

Intraday Northbound / Southbound flow for the day (one point per minute).

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const north = await sdk.northbound.minute('north');
const last = north.at(-1);
console.log(`${last?.date} ${last?.time} total net inflow: ${last?.totalNetInflow} (10k)`);
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `direction` | `'north' \| 'south'` | Flow direction, defaults to `'north'` |

### Returns

`NorthboundMinuteItem[]`:

```ts
interface NorthboundMinuteItem {
  date: string;                       // YYYY-MM-DD
  time: string;                       // HH:MM
  shanghaiNetInflow: number | null;   // Shanghai Connect net inflow (in 10k)
  shenzhenNetInflow: number | null;   // Shenzhen Connect net inflow (in 10k)
  totalNetInflow: number | null;      // total net inflow (in 10k)
}
```

---

## northbound.summary

Stock Connect market flow summary (Northbound + Southbound, split by Shanghai / Shenzhen Connect). Typically returns 4 rows.

```ts
const summary = await sdk.northbound.summary();
summary.forEach(s => {
  console.log(`${s.boardName} (${s.direction}) net inflow: ${s.netInflow}`);
});
```

### Returns

`NorthboundFlowSummary[]`:

```ts
interface NorthboundFlowSummary {
  date: string;                      // YYYY-MM-DD
  type: string;                      // type id
  boardName: string;                 // Shanghai / Shenzhen Connect / HK Connect (SH/SZ)
  direction: string;                 // Northbound / Southbound
  status: string;                    // trading status
  netBuyAmount: number | null;       // net buy amount (currency main unit)
  netInflow: number | null;          // net capital inflow
  remainAmount: number | null;       // remaining daily quota
  upCount: number | null;            // advancers
  flatCount: number | null;          // unchanged
  downCount: number | null;          // decliners
  indexCode: string;                 // related index code
  indexName: string;                 // related index name
  indexChangePercent: number | null; // index change (percentage number)
}
```

---

## northbound.holdingRank

Northbound / Shanghai Connect / Shenzhen Connect per-stock holding ranking.

```ts
const rank = await sdk.northbound.holdingRank({ market: 'all', period: '5day' });
rank.slice(0, 10).forEach((item, i) => {
  console.log(`#${i + 1} ${item.name}(${item.code}) holding value: ${item.holdMarketValue}`);
});
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `options.market` | `'all' \| 'shanghai' \| 'shenzhen'` | Holding market, defaults to `'all'` |
| `options.period` | `'today' \| '3day' \| '5day' \| '10day' \| 'month' \| 'quarter' \| 'year'` | Stat window |
| `options.date` | `string` | `YYYY-MM-DD`, defaults to the latest trading day on the server |

### Returns

`NorthboundHoldingRankItem[]`:

```ts
interface NorthboundHoldingRankItem {
  date: string;
  code: string;
  name: string;
  close: number | null;                 // today's close
  changePercent: number | null;         // today's change (percentage number)
  holdShares: number | null;            // today's shares held
  holdMarketValue: number | null;       // today's holding value (currency main unit)
  holdRatioFloat: number | null;        // % of floating shares (percentage number)
  holdRatioTotal: number | null;        // % of total shares (percentage number)
  addShares: number | null;             // estimated added shares over the window
  addMarketValue: number | null;        // estimated added value over the window
  addMarketValuePercent: number | null; // estimated added-value growth (percentage number)
  sector: string;                       // sector
}
```

---

## northbound.history

Daily Northbound / Southbound capital history.

```ts
const history = await sdk.northbound.history('north', {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
console.log(`fetched ${history.length} trading days`);
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `direction` | `'north' \| 'south'` | Flow direction, defaults to `'north'` |
| `options.startDate` | `string` | Start date `YYYY-MM-DD` |
| `options.endDate` | `string` | End date `YYYY-MM-DD` |

### Returns

`NorthboundHistoryItem[]`:

```ts
interface NorthboundHistoryItem {
  date: string;
  netBuyAmount: number | null;            // net buy amount
  buyAmount: number | null;               // buy turnover
  sellAmount: number | null;              // sell turnover
  accNetBuyAmount: number | null;         // cumulative net buy amount
  netInflow: number | null;               // net inflow for the day
  remainAmount: number | null;            // remaining daily quota
  topStockCode: string | null;            // leading stock code
  topStockName: string | null;            // leading stock name
  topStockChangePercent: number | null;   // leading stock change (percentage number)
}
```

---

## northbound.individual

Per-stock Northbound holding history.

```ts
const moutai = await sdk.northbound.individual('600519', { startDate: '2024-01-01' });
const recent = moutai.slice(-5).map(i => `${i.date}: ${i.holdShares}`);
console.log('last 5 days of Northbound holdings:\n' + recent.join('\n'));
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `symbol` | `string \| SymbolRef` | Stock code |
| `options.startDate` | `string` | Start date `YYYY-MM-DD` |
| `options.endDate` | `string` | End date `YYYY-MM-DD` |

### Returns

`NorthboundIndividualItem[]`:

```ts
interface NorthboundIndividualItem {
  date: string;
  holdShares: number | null;       // shares held
  holdMarketValue: number | null;  // holding value (currency main unit)
  holdRatioFloat: number | null;   // % of floating shares (percentage number)
  holdRatioTotal: number | null;   // % of total shares (percentage number)
  close: number | null;            // close price
  changePercent: number | null;    // change (percentage number)
}
```
