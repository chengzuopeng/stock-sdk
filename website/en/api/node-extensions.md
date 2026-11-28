# Node Extensions API <Badge type="tip" text="Node Only · stock-node-sdk" />

The following namespaces are exclusive to `stock-node-sdk`. All methods are orchestrated by `SourceRouter` with unified output schemas and accept an optional trailing `RouteOptions` parameter (e.g., `{ source: 'cninfo' }`).

## `financial` · Financial Statements & Fundamentals (CN / HK / US)

`indicators`, `income`, `balance`, and `cashflow` automatically detect CN, HK, and US symbols (amounts are reported in each market's native currency indicated by `currency?: 'CNY' | 'HKD' | 'USD'`): CN & HK route to Eastmoney Datacenter (direct access in mainland China), while US uses Eastmoney Datacenter with **Nasdaq** as an overseas failover for the three statements (`overseas: false` disables overseas feeds).

| Method | Description |
|---|---|
| `sdk.financial.indicators(symbol, options?, route?)` | CN/HK/US key financial metrics across reporting periods (EPS, BPS, ROE, revenue/profit YoY, gross margin) |
| `sdk.financial.income(symbol, options?, route?)` | CN/HK/US income statements (revenue, operating costs, expenses, operating/net profit) |
| `sdk.financial.balance(symbol, options?, route?)` | CN/HK/US balance sheets (total assets, cash, receivables, inventory, liabilities, equity, debt ratio) |
| `sdk.financial.cashflow(symbol, options?, route?)` | CN/HK/US cash flow statements (operating, investing, financing cash flows) |
| `sdk.financial.forecast(options?, route?)` | A-share performance forecasts (filterable by `symbol` or `reportDate`) |
| `sdk.financial.express(options?, route?)` | A-share performance express reports (filterable by `symbol` or `reportDate`) |

```ts
// Identical API & schema across CN / HK / US
const [cnInd, hkInd, usIncome] = await Promise.all([
  sdk.financial.indicators('600519', { pageSize: 4 }),
  sdk.financial.indicators('00700', { pageSize: 4 }),
  sdk.financial.income('AAPL', { pageSize: 4 }),
]);

const forecasts = await sdk.financial.forecast({ reportDate: '2026-12-31', pageSize: 20 });
```

### Core Types

```ts
export interface FinancialIndicator {
  code: string;
  name: string;
  reportDate: string;
  reportName: string;
  noticeDate: string | null;
  eps: number | null;
  bps: number | null;
  operatingCashFlowPerShare: number | null;
  totalRevenue: number | null;
  revenueYoy: number | null;
  netProfit: number | null;
  netProfitYoy: number | null;
  roe: number | null;
  grossMargin: number | null;
  currency?: 'CNY' | 'HKD' | 'USD';
  source: ProviderId;
}

export interface FinancialQueryOptions {
  page?: number;
  pageSize?: number;
}

export interface PerformanceListOptions extends FinancialQueryOptions {
  symbol?: string;
  reportDate?: string;
}
```

## `news` · 24/7 Market Flash & Announcements (CN / HK / US)

| Method | Description | Multi-Source Policy |
|---|---|---|
| `sdk.news.flash(options?, route?)` | 24/7 real-time financial news feed | Eastmoney → Sina (`page > 1` routes to Sina) |
| `sdk.news.announcements(options?, route?)` | Official company disclosures & links | **CN**: Eastmoney → CNINFO POST (`keyword` routes to CNINFO)<br>**HK**: HKEXnews (direct access in mainland China)<br>**US**: SEC EDGAR (disabled when `overseas: false`) |

```ts
const flashes = await sdk.news.flash({ pageSize: 10 });
const cnNotices = await sdk.news.announcements({ symbol: '600519', keyword: '分红', pageSize: 10 });
const hkNotices = await sdk.news.announcements({ symbol: '00700', pageSize: 10 });
const usNotices = await sdk.news.announcements({ symbol: 'AAPL', keyword: '10-K', pageSize: 10 });
```

### Core Types

```ts
export interface MarketNewsFlash {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  timestamp: number | null;
  tz: MarketTz;
  url: string | null;
  tags: string[];
  relatedCodes: string[];
  source: ProviderId;
}

export interface StockAnnouncement {
  id: string;
  code: string;
  name: string;
  title: string;
  category: string | null;
  publishedAt: string;
  timestamp: number | null;
  url: string | null;
  fileType: string | null;
  source: ProviderId;
}
```

## `corporate` · Shareholders & Governance

| Method | Description |
|---|---|
| `sdk.corporate.topHolders(symbol, options?, route?)` | Top 10 tradable shareholders and position changes |
| `sdk.corporate.holderCount(symbol, options?, route?)` | Historical shareholder counts and average holdings |

```ts
const topHolders = await sdk.corporate.topHolders('600519', { pageSize: 10 });
const holderCount = await sdk.corporate.holderCount('600519', { pageSize: 10 });
```

## `bond` · Convertible Bonds

| Method | Description |
|---|---|
| `sdk.bond.convertibleList(options?, route?)` | Convertible bond directory with ratings, issue scales, conversion prices, and maturity dates |

```ts
const bonds = await sdk.bond.convertibleList({ pageSize: 20 });
```

## `StockNodeSDKOptions` Summary

In addition to all `StockSDKOptions`, `new StockNodeSDK(options)` supports:

| Option | Type | Default | Description |
|---|---|---|---|
| `overseas` | `boolean` | `true` | Enable overseas sources (`cnbc` / `nasdaq` / `sec`); set `false` for mainland China direct access without proxies |
| `secUserAgent` | `string` | Built-in compliant UA | Custom compliant `User-Agent` header for SEC EDGAR requests |
| `proxy` | `ProxyConfig` | — | Single proxy URL, rotating pool, or per-URL resolver |
| `useEnvProxy` | `boolean` | `false` | Honor `HTTP_PROXY` / `HTTPS_PROXY` environment variables |
| `cache` | `NodeCacheConfig` | — | Injectable `FileCacheStore` or custom `CacheStore` |
| `routing` | `Omit<SourceRouterOptions, 'onRoute'>` | — | Global `forcedSource` / `preferredSources` / `disabledProviders` / cooldown |
| `customAdapters` | `readonly SourceAdapter[]` | — | Register custom or third-party `SourceAdapter` instances at startup |
| `onRoute` | `(trace: RouteTrace) => void` | — | Global routing observability callback |
