# Fund Extended Data (v1.10.0+)

Deep data for mutual funds: dividends, NAV history, intraday estimates, similar-type rank history.

For real-time quotes see [Fund Quotes](./fund-quotes.md); this page is its extension. All methods live on the `StockSDK` instance, served by the internal `FundService`. Data sources: EastMoney / Tian Tian Fund.

## getFundDividendList

Get fund dividend & bonus events (from Tian Tian Fund's dividend channel).

The upstream endpoint only supports "year + full market + paginated" queries — **it does not support server-side filtering by fund code**. To get a single fund's full-year dividend history, combine `page: 'all'` with `code`.

### Signature

```typescript
getFundDividendList(options?: FundDividendListOptions): Promise<FundDividendListResult>
```

### Options

```typescript
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

### Return Type

```typescript
interface FundDividendListResult {
  items: FundDividend[];
  totalPages: number;
  pageSize: number;
  currentPage: number;   // -1 when page: 'all' (aggregated)
}

interface FundDividend {
  code: string;
  name: string;
  equityRecordDate: string | null;    // YYYY-MM-DD
  exDividendDate: string | null;      // YYYY-MM-DD
  dividendPerShare: number | null;    // CNY per share
  payDate: string | null;             // YYYY-MM-DD
  raw: string[];                      // raw 7-field tuple
}
```

### Example

```typescript
// Page 1 of 2024 (sorted by ex-dividend date desc)
const r1 = await sdk.getFundDividendList({ year: 2024 });

// Full dividend history of fund 110011 in 2024
const r2 = await sdk.getFundDividendList({
  year: 2024,
  page: 'all',
  code: '110011',
});
r2.items.forEach(d => {
  console.log(`${d.exDividendDate}  ${d.dividendPerShare} CNY/share`);
});
```

---

## getFundNavHistory

Get fund NAV history (unit NAV + accumulated NAV, aligned by timestamp).

One request returns the fund's complete NAV series from inception to the latest trading day (thousands of points), no pagination needed. Works for open-end, ETF, LOF, money-market, and QDII funds.

### Signature

```typescript
getFundNavHistory(code: string): Promise<FundNavHistory>
```

### Return Type

```typescript
interface FundNavHistory {
  code: string;
  name: string | null;
  items: FundNavPoint[];   // ascending by date
}

interface FundNavPoint {
  date: string;             // YYYY-MM-DD
  timestamp: number;        // ms; UTC midnight of NAV date
  nav: number;              // unit NAV
  accNav: number | null;    // accumulated NAV (aligned; null if unmatched)
  dailyReturn: number | null;  // daily change %
  unitMoney: string;        // 10k-share daily income (money-market funds only)
}
```

### Example

```typescript
const h = await sdk.getFundNavHistory('110011');
console.log(h.name, h.items.length, 'NAV points');
const latest = h.items[h.items.length - 1];
console.log(`Latest: ${latest.date}  unit ${latest.nav}  acc ${latest.accNav}`);
```

### Note

Response is ~600KB (~120KB gzipped). For frequent same-fund access, cache at the application layer.

---

## getFundEstimate

Get fund intraday NAV estimate (from Tian Tian Fund's `fundgz` endpoint).

Returns both the latest settled NAV (`nav` + `navDate`) and the intraday estimate (`estimatedNav` + `estimatedChangePercent` + `estimateTime`), ideal for "intraday vs last-close" comparison charts.

QDII / non-trading-day / niche funds may have null estimate fields.

### Signature

```typescript
getFundEstimate(code: string): Promise<FundEstimate>
```

### Return Type

```typescript
interface FundEstimate {
  code: string;
  name: string | null;
  navDate: string | null;                // settled NAV date YYYY-MM-DD
  nav: number | null;                    // settled unit NAV
  estimatedNav: number | null;           // intraday estimate
  estimatedChangePercent: number | null; // estimate change %
  estimateTime: string | null;           // e.g. "2026-05-26 15:00"
}
```

### Example

```typescript
const e = await sdk.getFundEstimate('005827');
console.log(`${e.name}  last NAV ${e.nav} (${e.navDate})`);
console.log(`Intraday est ${e.estimatedNav}  (${e.estimatedChangePercent}%)`);
console.log(`As of ${e.estimateTime}`);
```

---

## getFundRankHistory

Get fund similar-type rank history (daily 3-month rank + percentile).

Same data source as `getFundNavHistory` (same pingzhongdata file, different fields). Suited for "fund's relative performance among similar funds" charts.

### Signature

```typescript
getFundRankHistory(code: string): Promise<FundRankHistory>
```

### Return Type

```typescript
interface FundRankHistory {
  code: string;
  name: string | null;
  items: FundRankPoint[];
}

interface FundRankPoint {
  date: string;
  timestamp: number;
  rank: number | null;       // similar-type 3M rank (lower = better)
  total: number | null;      // total funds in same type
  percentile: number | null; // percentile % (lower = better)
}
```

### Example

```typescript
const r = await sdk.getFundRankHistory('110011');
const latest = r.items[r.items.length - 1];
console.log(`${r.name}  rank ${latest.rank}/${latest.total} (top ${latest.percentile}%)`);
```

---

## Browser Concurrency & Request Governance

### Concurrency safety

These methods load via `<script>` injection in browsers (data sources `fund.eastmoney.com` / `fundgz.1234567.com.cn` have no CORS headers), which is inherently vulnerable to global-variable overwriting. The SDK guards this with `withScriptMutex`:

- All browser `fetchJsVars` calls share a single global mutex (key `'jsVars'`) — any two browser calls are serialized in submission order
- fundgz JSONP uses a separate serial queue (key `'fundgz:jsonpgz'`)
- Node.js is unaffected — real concurrency works

This is transparent to callers, but be aware that `Promise.all([...])` is effectively serial on the browser path; expect higher latency than on Node.

### Request governance (Node only)

The `FundService` methods integrate with `RequestClient` on Node:

```typescript
const sdk = new StockSDK({
  retry: { maxRetries: 3, baseDelay: 500 },
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: { requestsPerSecond: 3, maxBurst: 3 },
    },
  },
});

// All four getFund* methods inherit retry / rateLimit / circuitBreaker /
// fallback host / providerPolicies on Node.
```

⚠️ **Browser limitation**: the `<script>` injection path does not go through `fetch`, so `headers` / `circuitBreaker` / `rateLimit` only take effect on Node. `timeout` is honored via the tool's own parameter.

---

## Notes

1. **Data sources**: dividends → `https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx`; NAV / rank → `https://fund.eastmoney.com/pingzhongdata/{code}.js`; estimate → `https://fundgz.1234567.com.cn/js/{code}.js?rt={ts}`
2. **NAV history size**: `getFundNavHistory` returns thousands of points per call; cache at the application layer if accessed frequently
3. **Same-fund shared file**: `getFundNavHistory` and `getFundRankHistory` actually download the same ~600KB pingzhongdata file. The SDK does not request-level cache yet — if both are needed simultaneously, dedupe or cache yourself
4. **On-exchange ETF quotes / K-line**: for on-exchange ETFs (e.g. 510050, 159919), use stock endpoints like [`getFullQuotes`](./quotes.md) / [`getHistoryKline`](./kline.md) — not the methods on this page
