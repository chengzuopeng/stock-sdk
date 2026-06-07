# fundFlow · Capital Flow (Deep)

`sdk.fundFlow` exposes capital-flow data across four dimensions — **individual stock / market / rank / sector** (source: East Money data center). It returns historical series, ranking boards and sector summaries, as opposed to `sdk.quotes.fundFlow`, which returns a single-day snapshot batched by code (Tencent, lightweight).

::: tip Namespace distinction
- `sdk.quotes.fundFlow(codes)` — **lightweight**, single-day capital-flow snapshot batched by code.
- `sdk.fundFlow.*` — **deep** (this page): historical, ranking and sector dimensions.
:::

Capital-flow fields follow a uniform **main / super-large / large / medium / small** order structure. Each tier reports both a net amount (in the listing currency's main unit) and a net ratio (as a percentage number, e.g. `5.2` means 5.2%).

## Methods

| Method | Description |
|---|---|
| `fundFlow.individual(symbol, opts?)` | Per-stock capital-flow history (daily / weekly / monthly) |
| `fundFlow.market()` | Market-wide capital-flow history (SSE + SZSE) |
| `fundFlow.rank(opts?)` | Per-stock capital-flow ranking (by main net inflow) |
| `fundFlow.sectorRank(opts?)` | Sector capital-flow ranking (industry / concept / region) |
| `fundFlow.sectorHistory(symbol, opts?)` | Capital-flow history for a single sector |

> Exact parameters and return fields follow the final implementation; the field tables below reflect the current data contract.

---

## fundFlow.individual

Per-stock capital-flow history (daily / weekly / monthly bars).

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const flow = await sdk.fundFlow.individual('600519', { period: 'daily' });
const latest = flow.at(-1);
console.log(`${latest?.date} main net inflow: ${latest?.mainNetInflow}`);
```

`symbol` accepts a bare string or a `SymbolRef` (e.g. `'sh600519'` / `'600519'` / `{ code: '600519' }`), resolved fault-tolerantly by `normalizeSymbol`.

### Parameters

| Param | Type | Description |
|---|---|---|
| `symbol` | `string \| SymbolRef` | Stock code |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | Period, defaults to `'daily'` |

### Returns

`StockFundFlowDaily[]`, sorted by date ascending:

```ts
interface StockFundFlowDaily {
  date: string;                          // YYYY-MM-DD
  close: number | null;                  // close price
  changePercent: number | null;          // change (percentage number)
  mainNetInflow: number | null;          // main net inflow amount (currency main unit)
  mainNetInflowPercent: number | null;   // main net inflow ratio (percentage number)
  superLargeNetInflow: number | null;
  superLargeNetInflowPercent: number | null;
  largeNetInflow: number | null;
  largeNetInflowPercent: number | null;
  mediumNetInflow: number | null;
  mediumNetInflowPercent: number | null;
  smallNetInflow: number | null;
  smallNetInflowPercent: number | null;
}
```

---

## fundFlow.market

Market-wide capital-flow history. Each record covers both the SSE Composite and SZSE Component indices.

```ts
const market = await sdk.fundFlow.market();
const today = market.at(-1);
console.log(`SSE ${today?.shClose} (${today?.shChangePercent}%)`);
console.log(`main net inflow ${today?.mainNetInflow}`);
```

### Returns

`MarketFundFlow[]`:

```ts
interface MarketFundFlow {
  date: string;
  shClose: number | null;          // SSE Composite close
  shChangePercent: number | null;  // SSE Composite change (percentage number)
  szClose: number | null;          // SZSE Component close
  szChangePercent: number | null;  // SZSE Component change (percentage number)
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  // super-large / large / medium / small follow the same structure (amount + ratio)
}
```

---

## fundFlow.rank

Per-stock capital-flow ranking by main net inflow. `changePercent` and each tier's net inflow correspond to the chosen indicator window (e.g. `5day` returns 5-day figures).

```ts
const rank = await sdk.fundFlow.rank({ indicator: '5day' });
rank.slice(0, 10).forEach((item, i) => {
  console.log(`#${i + 1} ${item.name}(${item.code}) main net inflow ${item.mainNetInflow}`);
});
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `options.indicator` | `'today' \| '3day' \| '5day' \| '10day'` | Stat window, defaults to `'today'` |

### Returns

`FundFlowRankItem[]`:

```ts
interface FundFlowRankItem {
  code: string;
  name: string;
  price: number | null;                  // latest price
  changePercent: number | null;          // change for the window (percentage number)
  mainNetInflow: number | null;          // main net inflow amount
  mainNetInflowPercent: number | null;
  superLargeNetInflow: number | null;
  superLargeNetInflowPercent: number | null;
  largeNetInflow: number | null;
  largeNetInflowPercent: number | null;
  mediumNetInflow: number | null;
  mediumNetInflowPercent: number | null;
  smallNetInflow: number | null;
  smallNetInflowPercent: number | null;
}
```

---

## fundFlow.sectorRank

Sector capital-flow ranking across industry / concept / region dimensions.

```ts
const sectors = await sdk.fundFlow.sectorRank({
  indicator: 'today',
  sectorType: 'industry',
});
sectors.slice(0, 5).forEach(s => {
  console.log(`${s.name}: net inflow ${s.mainNetInflow}, top stock ${s.topStockName}`);
});
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `options.indicator` | `'today' \| '3day' \| '5day' \| '10day'` | Stat window, defaults to `'today'` |
| `options.sectorType` | `'industry' \| 'concept' \| 'region'` | Sector dimension, defaults to `'industry'` |

### Returns

`SectorFundFlowItem[]`:

```ts
interface SectorFundFlowItem {
  code: string;                  // sector code (East Money BK id, e.g. BK0475)
  name: string;                  // sector name
  changePercent: number | null;  // percentage number
  mainNetInflow: number | null;  // main net inflow amount
  mainNetInflowPercent: number | null;
  superLargeNetInflow: number | null;
  largeNetInflow: number | null;
  mediumNetInflow: number | null;
  smallNetInflow: number | null;
  topStockName?: string;         // name of the top main-inflow stock
  topStockCode?: string;         // code of the top main-inflow stock
}
```

---

## fundFlow.sectorHistory

Capital-flow history for a single sector. `symbol` accepts a BK id (e.g. `BK0475`) or a prefixed East Money secid (e.g. `90.BK0475`).

```ts
const banking = await sdk.fundFlow.sectorHistory('BK0475');
console.log(`banking sector history: ${banking.length} records`);
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `symbol` | `string \| SymbolRef` | Sector code (BK id or East Money secid) |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | Period, defaults to `'daily'` |

### Returns

`StockFundFlowDaily[]`, identical in shape to [`fundFlow.individual`](#fundflow-individual) (here `close` / `changePercent` refer to the sector itself).
