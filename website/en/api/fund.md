# fund · Mutual Fund Extended Data

Deep data for mutual funds: dividends & bonuses, NAV history, intraday estimates, same-category rank history, and theme funds.

For real-time fund quotes, use [`sdk.quotes.fund()`](./quotes.md); this namespace is its extension. All methods live under `sdk.fund`, served by the internal `FundService`. Data sources: EastMoney / Tian Tian Fund.

## Methods at a Glance

| Method | Description |
|---|---|
| `sdk.fund.dividendList(options?)` | Paginated, by-year dividend & bonus events across the whole market |
| `sdk.fund.navHistory(code)` | Full NAV history of a single fund (unit NAV + accumulated NAV) |
| `sdk.fund.estimate(code)` | Today's intraday estimate + latest settled NAV |
| `sdk.fund.rankHistory(code)` | Same-category rank trend (trailing-3-month rank + percentile) |
| `sdk.fund.profile(code)` | Fund deep profile (holdings / asset allocation / managers / evaluation, in one call) |
| `sdk.fund.theme.*` | Theme funds: theme list, hot themes, funds by theme |

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
  nav: number | null;          // unit NAV (null when missing/non-numeric, since v2.4.0)
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

## sdk.fund.profile

Fetch a fund's deep profile in one request (the full set of Eastmoney pingzhongdata fields): top-10 stock holdings, top-5 bond holdings, quarterly asset allocation, daily position estimates, fund managers, performance evaluation, holder structure, scale changes, purchase/redemption, stage returns, and same-category peers.

Shares the data source with `navHistory` / `rankHistory` (the same pingzhongdata file, different fields). Good for assembling most of the static data a "fund detail page" needs.

> Fields may be empty depending on fund type and upstream completeness: array fields become `[]`, object fields (`performance` / `sameType`) become `null`, and scalars become `null` or `0` (for ratios).

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | Fund code (plain digits, e.g. `'000001'`) |

### Example

```ts
const p = await sdk.fund.profile('000001');

console.log(`${p.name}  ${p.holdings.length} top holdings`);
// Build an Eastmoney secid from a holding: `${marketId}.${code}`
p.holdings.forEach((h) => console.log(`${h.marketId}.${h.code}`));

// Managers (with star rating and ability scores)
p.managers.forEach((m) => {
  console.log(`${m.name}  ★${m.star}  ${m.workTime}  ${m.fundSize}`);
  if (m.power) console.log(`  overall score ${m.power.overall}`);
});

// Latest asset allocation
const a = p.assetAllocation.at(-1);
if (a) console.log(`stock ${a.stockRatio}% / bond ${a.bondRatio}% / cash ${a.cashRatio}%`);

console.log('overall score', p.performance?.overall);
console.log(p.stageReturns); // { oneMonth, threeMonth, sixMonth, oneYear }
```

### Returns

Returns `FundProfile`; array fields become `[]` and object fields become `null` when data is missing:

```ts
interface FundProfile {
  code: string;
  name: string | null;
  sourceRate: number | null;        // original subscription rate (%)
  rate: number | null;              // current subscription rate (%)
  minSubscription: number | null;   // minimum subscription amount (CNY)
  holdings: FundHolding[];          // top-10 stock holdings
  bondHoldings: FundBondHolding[];  // top-5 bond holdings
  assetAllocation: FundAssetAllocation[]; // quarterly asset allocation
  positions: FundPositionPoint[];   // daily position estimates
  managers: FundManager[];          // fund managers
  performance: FundPerformanceEvaluation | null; // performance evaluation
  holderStructure: FundHolderStructure[];        // holder structure
  scaleChanges: FundScaleChange[];  // scale changes
  buySedemption: FundBuySedemption[]; // purchase / redemption
  stageReturns: FundStageReturns;   // stage returns
  sameType: FundSameType | null;    // same-category peers
}

interface FundHolding {
  code: string;      // stock code (plain digits, e.g. "600519")
  marketId: string;  // new market id ("0"=Shenzhen, "1"=Shanghai), for secid
}

interface FundManager {
  id: string;
  name: string;
  avatarUrl: string | null;  // avatar URL
  star: number | null;       // star rating (0–5)
  workTime: string | null;   // tenure description, e.g. "14年又192天" (upstream raw)
  fundSize: string | null;   // AUM description, e.g. "78.91亿(4只基金)" (upstream raw)
  power: FundPerformanceEvaluation | null; // ability scores (same shape as evaluation)
}

interface FundPerformanceEvaluation {
  overall: number;        // overall score
  categories: string[];   // evaluation dimensions
  scores: number[];       // per-dimension scores
  descriptions: string[]; // per-dimension descriptions
}

interface FundAssetAllocation {
  date: string;        // report date YYYY-MM-DD
  timestamp: number | null; // UTC ms; null if unparseable
  stockRatio: number;  // stock ratio of NAV (%)
  bondRatio: number;   // bond ratio of NAV (%)
  cashRatio: number;   // cash ratio of NAV (%)
  otherRatio: number;  // other ratio of NAV (%); 0 when upstream omits it
  netAsset: number;    // net asset (100M CNY)
}

interface FundStageReturns {
  oneMonth: number | null;   // trailing 1 month (%)
  threeMonth: number | null; // trailing 3 months (%)
  sixMonth: number | null;   // trailing 6 months (%)
  oneYear: number | null;    // trailing 1 year (%)
}

// Same-category peers: upstream returns one group per ranking dimension.
// `groups` is outer = groups, inner = funds in that group.
interface FundSameType {
  groups: Array<Array<{ code: string; name: string; value: number | null }>>;
}
```

The remaining sub-types (`FundBondHolding` / `FundPositionPoint` / `FundHolderStructure` / `FundScaleChange` / `FundBuySedemption`) follow the same shape; see the type definitions for field meanings.

## sdk.fund.theme.getThemeList

Get the theme fund list (EastMoney / Tian Tian Fund). Can filter by industry/concept/all themes, sort by daily change or various period returns.

### Parameters

```ts
interface GetThemeListOptions {
  sort?: string;          // Sort field: ZDF(daily)/SYL_W(1w)/SYL_M(1m)/SYL_3M(3m)/SYL_6M(6m)/SYL_Y(1y)/SYL_3Y(3y)/SYL_5Y(5y), default ZDF
  order?: 'desc' | 'asc';// Sort direction: desc(default)/asc
  category?: '0' | '1' | '2'; // Theme type: '0'(industry)/'1'(concept)/'2'(all, default)
  pageSize?: number;      // Page size, default 20, max 50
  page?: number;          // Page number, default 1
}
```

### Example

```ts
// Get all themes sorted by daily change descending
const themes = await sdk.fund.theme.getThemeList({ sort: 'ZDF', order: 'desc', pageSize: 20 });
console.log(themes.items.map(t => `${t.name} ${t.dailyChange}%`));

// Get industry themes sorted by 1-year return
const industryThemes = await sdk.fund.theme.getThemeList({
  category: '0',
  sort: 'SYL_Y',
  order: 'desc',
});
```

### Return Type

```ts
interface ThemeFundListResult {
  items: ThemeFund[];
  totalPages: number;
  pageSize: number;
  currentPage: number;
}

interface ThemeFund {
  code: string;               // Theme code, e.g. 'BK0438'
  name: string;               // Theme name, e.g. 'Food & Beverage'
  dailyChange: number | null;
  weeklyReturn: number | null;
  monthlyReturn: number | null;
  quarterlyReturn: number | null;
  halfYearReturn: number | null;
  yearlyReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  type: string;
}
```

## sdk.fund.theme.getThemeFunds

Get funds under a specific theme. themeCode is the theme code (e.g. `BK0438` = Food & Beverage). Use `getThemeList` to find theme codes.

### Parameters

```ts
interface GetThemeFundsOptions {
  sortColumn?: string;    // Sort: SYL_Z(1w)/SYL_Y(1m)/SYL_3Y(3m)/SYL_1N(1y, default)/RZDF(daily)
  sort?: 'desc' | 'asc'; // Sort direction: desc(default)/asc
  pageSize?: number;      // Page size, default 10, max 30
  page?: number;          // Page number, default 1
  fundType?: string;      // Fund type filter, e.g. '股票型'/'混合型'
}
```

### Example

```ts
// Get top funds in Food & Beverage theme by 1-year return
const funds = await sdk.fund.theme.getThemeFunds('BK0438', {
  sortColumn: 'SYL_1N',
  sort: 'desc',
  pageSize: 10,
});
funds.items.forEach(f => {
  console.log(`${f.code} ${f.name}: 1Y return ${f.yearlyReturn}%`);
});
```

### Return Type

```ts
interface ThemeFundItemList {
  items: ThemeFundItem[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

interface ThemeFundItem {
  code: string;
  name: string;
  fundType: string;
  dailyChange: number | null;
  weeklyReturn: number | null;
  monthlyReturn: number | null;
  quarterlyReturn: number | null;
  yearlyReturn: number | null;
  nav: number | null;
  themeCode: string;
  themeName?: string; // not returned upstream, usually absent
}
```

## Notes

1. **Data sources**: dividends via `fund.eastmoney.com/Data/funddataIndex_Interface.aspx`; NAV history / rank history / deep profile via `fund.eastmoney.com/pingzhongdata/{code}.js`; intraday estimate via `fundgz.1234567.com.cn/js/{code}.js`.
2. **Same file, multiple methods**: `navHistory` / `rankHistory` / `profile` all download the same pingzhongdata file (~600KB), only reading different fields. If you need several, use the cache layer to avoid re-downloading.
3. **Serialized in browsers**: in the browser these endpoints load via `<script>` injection (sources lack CORS headers). The SDK guards against concurrent global-variable clobbering with a script mutex, so `Promise.all([...])` runs serially in the browser. Node is unaffected.
4. **Request-governance difference**: in Node these methods go through `RequestClient` (`retry` / `providerPolicies` apply). In the browser the `<script>` path bypasses `fetch`, so `headers` / `rateLimit` / `circuitBreaker` do not apply; `timeout` is honored via internal parameters. See [Request Governance](../guide/request-governance.md).
5. **On-exchange ETF quotes**: for on-exchange ETFs (e.g. 510050, 159919), use the stock endpoints [`sdk.quotes.cn()`](./quotes.md) / [`sdk.kline.cn()`](./kline.md), not this namespace.
