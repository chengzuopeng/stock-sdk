# fund · Mutual Fund Extended Data

Deep data for mutual funds: dividends & bonuses, NAV history, intraday estimates, and same-category rank history.

For real-time fund quotes, use [`sdk.quotes.fund()`](./quotes.md); this namespace is its extension. All methods live under `sdk.fund`, served by the internal `FundService`. Data sources: EastMoney / Tian Tian Fund.

## Methods at a Glance

| Method | Description |
|---|---|
| `sdk.fund.dividendList(options?)` | Paginated, by-year dividend & bonus events across the whole market |
| `sdk.fund.navHistory(code)` | Full NAV history of a single fund (unit NAV + accumulated NAV) |
| `sdk.fund.estimate(code)` | Today's intraday estimate + latest settled NAV |
| `sdk.fund.rankHistory(code)` | Same-category rank trend (trailing-3-month rank + percentile) |

> Symbol inputs follow the v2 convention: a fund code is a plain numeric string (e.g. `'110011'`). Exact fields follow the final implementation.

## sdk.fund.dividendList

Query fund dividend & bonus events by year (from Tian Tian Fund's dividend channel).

The upstream endpoint only supports "year + whole-market + pagination" queries — **it does not support server-side filtering by fund code**. To get a single fund's full-year dividend history, combine `page: 'all'` with `code` (client-side filter).

### Options

```ts
interface FundDividendListOptions {
  /** Year, defaults to current year (Asia/Shanghai) */
  year?: number | string;
  /** Page (1-based, default 1); set to 'all' to auto-paginate and aggregate */
  page?: number | 'all';
  /** Fund type filter (e.g. '股票型', '指数型-股票', 'REITs'); empty = all */
  fundType?: string;
  /** Sort field, default 'FSRQ' (ex-dividend date) */
  rank?: 'BZDM' | 'ABBNAME' | 'DJR' | 'FSRQ' | 'FHFCZ' | 'FFR';
  /** Sort direction, default 'desc' */
  sort?: 'asc' | 'desc';
  /** Client-side filter by fund code; combine with page: 'all' */
  code?: string;
}
```

`rank` field mapping:

| Value | Meaning |
|---|---|
| `BZDM` | Fund code |
| `ABBNAME` | Fund short name |
| `DJR` | Equity record date |
| `FSRQ` | Ex-dividend date (default) |
| `FHFCZ` | Dividend per share (CNY) |
| `FFR` | Payment date |

### Example

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Page 1 of 2024 (sorted by ex-dividend date desc)
const r1 = await sdk.fund.dividendList({ year: 2024 });
console.log(r1.totalPages, r1.pageSize, r1.items.length);

// Full dividend history of a single fund in 2024
const r2 = await sdk.fund.dividendList({
  year: 2024,
  page: 'all',
  code: '110011',
});
r2.items.forEach((d) => {
  console.log(`${d.exDividendDate}  ${d.dividendPerShare} CNY/share`);
});
```

### Returns

Returns `FundDividendListResult` with pagination metadata and dividend entries:

```ts
interface FundDividendListResult {
  items: FundDividend[];
  totalPages: number;   // total pages reported by upstream
  pageSize: number;     // entries per page
  currentPage: number;  // -1 when page: 'all' (aggregated)
}

interface FundDividend {
  code: string;
  name: string;
  equityRecordDate: string | null;  // YYYY-MM-DD
  exDividendDate: string | null;    // YYYY-MM-DD
  dividendPerShare: number | null;  // CNY per share
  payDate: string | null;           // YYYY-MM-DD
}
```

> v2 removes the `raw` field from return objects (the debug escape hatch moves to provider-level `getXxxRaw()`). Exact fields follow the implementation.

## sdk.fund.navHistory

Get a single fund's full NAV history (unit NAV + accumulated NAV, time-aligned and merged).

A single request returns every NAV point from inception to the latest trading day (thousands of rows) — no pagination needed. Works for open-end / ETF / LOF / money-market / QDII funds alike.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | Fund code (numeric, e.g. `'110011'`) |

### Example

```ts
const h = await sdk.fund.navHistory('110011');

console.log(h.name, 'has', h.items.length, 'NAV points');
const latest = h.items[h.items.length - 1];
console.log(`Latest: ${latest.date}  unit ${latest.nav}  acc ${latest.accNav}`);

// Last 5 trading days
console.log(h.items.slice(-5));
```

### Returns

Returns `FundNavHistory`; `items` is sorted by date ascending:

```ts
interface FundNavHistory {
  code: string;
  name: string | null;
  items: FundNavPoint[];
}

interface FundNavPoint {
  date: string;                // NAV date YYYY-MM-DD
  timestamp: number | null;    // UTC ms; null if unparseable
  nav: number;                 // unit NAV
  accNav: number | null;       // accumulated NAV (null if alignment fails)
  dailyReturn: number | null;  // daily growth (percent, e.g. 1.23)
  unitMoney: string;           // per-10k-share yield (money funds only; otherwise empty)
}
```

::: tip Payload size
A single response is large (~600KB, ~120KB gzipped). For repeated use of the same fund, lean on the [unified cache layer](../guide/installation.md) or cache it yourself.
:::

## sdk.fund.estimate

Get a fund's intraday estimate for today (from Tian Tian Fund's fundgz endpoint).

Returns both the latest settled unit NAV (`nav` + `navDate`) and the intraday estimate (`estimatedNav` + `estimatedChangePercent` + `estimateTime`) — handy for a "live today vs. last close" comparison.

Intraday estimate fields may be empty (returned as `null`) for QDII / non-trading days / certain niche funds.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | Fund code (numeric, e.g. `'005827'`) |

### Example

```ts
const e = await sdk.fund.estimate('005827');
console.log(`${e.name}  latest NAV ${e.nav} (${e.navDate})`);
console.log(`intraday est. ${e.estimatedNav} (${e.estimatedChangePercent}%)`);
console.log(`est. time ${e.estimateTime}`);
```

### Returns

```ts
interface FundEstimate {
  code: string;
  name: string | null;
  navDate: string | null;                // settled NAV date YYYY-MM-DD
  nav: number | null;                    // settled unit NAV
  estimatedNav: number | null;           // intraday estimate
  estimatedChangePercent: number | null; // estimated change (percent, e.g. 1.23)
  estimateTime: string | null;           // estimate time, e.g. "2026-05-26 15:00"
}
```

## sdk.fund.rankHistory

Get a fund's same-category rank trend (daily trailing-3-month rank + percentile).

Shares the data source with `navHistory` (the same pingzhongdata file, different fields) — good for a "this fund's relative performance among peers" line chart.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | Fund code |

### Example

```ts
const r = await sdk.fund.rankHistory('110011');
const latest = r.items[r.items.length - 1];
console.log(`${r.name}  rank ${latest.rank}/${latest.total} (top ${latest.percentile}%)`);
```

### Returns

```ts
interface FundRankHistory {
  code: string;
  name: string | null;
  items: FundRankPoint[];
}

interface FundRankPoint {
  date: string;               // report date YYYY-MM-DD
  timestamp: number | null;   // UTC ms; null if unparseable
  rank: number | null;        // trailing-3-month rank (smaller = better)
  total: number | null;       // total funds in category
  percentile: number | null;  // category percentile (percent, smaller = better)
}
```

## Notes

1. **Data sources**: dividends via `fund.eastmoney.com/Data/funddataIndex_Interface.aspx`; NAV history / rank history via `fund.eastmoney.com/pingzhongdata/{code}.js`; intraday estimate via `fundgz.1234567.com.cn/js/{code}.js`.
2. **Same file, two methods**: `navHistory` and `rankHistory` actually download the same pingzhongdata file (~600KB). If you need both, combine the call or use the cache layer.
3. **Serialized in browsers**: in the browser these endpoints load via `<script>` injection (sources lack CORS headers). The SDK guards against concurrent global-variable clobbering with a script mutex, so `Promise.all([...])` runs serially in the browser. Node is unaffected.
4. **Request-governance difference**: in Node these methods go through `RequestClient` (`retry` / `providerPolicies` apply). In the browser the `<script>` path bypasses `fetch`, so `headers` / `rateLimit` / `circuitBreaker` do not apply; `timeout` is honored via internal parameters. See [Request Governance](../guide/request-governance.md).
5. **On-exchange ETF quotes**: for on-exchange ETFs (e.g. 510050, 159919), use the stock endpoints [`sdk.quotes.cn()`](./quotes.md) / [`sdk.kline.cn()`](./kline.md), not this namespace.
