# Node 专属扩展 API <Badge type="tip" text="Node Only · stock-node-sdk" />

以下命名空间仅在 `stock-node-sdk` 中提供，全部接入 `SourceRouter` 多源路由与统一归一化输出，且最后一个可选参数均支持 `RouteOptions`（如 `{ source: 'cninfo' }`）。

## `financial` · 财务与基本面（支持 A 股 / 港股 / 美股）

`indicators` / `income` / `balance` / `cashflow` 自动识别三市场代码（报表金额按各市场原币种计，通过 `currency` 字段标识 `'CNY' | 'HKD' | 'USD'`）：A 股与港股走东财数据中心（大陆可直连）；美股以东财数据中心为主源，三大表并由 **Nasdaq** 提供海外容灾备源（默认开启，`overseas: false` 可关闭）。

| 方法 | 说明 |
|---|---|
| `sdk.financial.indicators(symbol, options?, route?)` | A/HK/US 个股多报告期核心财务指标（EPS / BPS / ROE / 营收与净利同比 / 毛利率） |
| `sdk.financial.income(symbol, options?, route?)` | A/HK/US 个股利润表（营业总收入 / 成本费用 / 营业利润 / 归母净利润） |
| `sdk.financial.balance(symbol, options?, route?)` | A/HK/US 个股资产负债表（总资产 / 货币资金 / 应收 / 存货 / 总负债 / 股东权益 / 资产负债率） |
| `sdk.financial.cashflow(symbol, options?, route?)` | A/HK/US 个股现金流量表（经营 / 投资 / 筹资现金流净额） |
| `sdk.financial.forecast(options?, route?)` | A 股业绩预告列表（支持按 `symbol` 或 `reportDate` 过滤） |
| `sdk.financial.express(options?, route?)` | A 股业绩快报列表（支持按 `symbol` 或 `reportDate` 过滤） |

```ts
// A 股 / 港股 / 美股统一调用方式与 Schema
const [cnInd, hkInd, usIncome] = await Promise.all([
  sdk.financial.indicators('600519', { pageSize: 4 }),
  sdk.financial.indicators('00700', { pageSize: 4 }),
  sdk.financial.income('AAPL', { pageSize: 4 }),
]);

const forecasts = await sdk.financial.forecast({ reportDate: '2026-12-31', pageSize: 20 });
```

### 核心类型定义

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

## `news` · 7×24 快讯与上市公司公告（支持 A 股 / 港股 / 美股）

| 方法 | 说明 | 多源策略 |
|---|---|---|
| `sdk.news.flash(options?, route?)` | 7×24 实时财经快讯 | 东财快讯 → 新浪 7×24（`page > 1` 自动切新浪） |
| `sdk.news.announcements(options?, route?)` | 上市公司公告列表与官方原文链接 | **A 股**：东财 → 巨潮 POST（带 `keyword` 直走巨潮）<br>**港股**：港交所披露易 (`HKEXnews`，大陆可直连)<br>**美股**：SEC EDGAR（`overseas: false` 时禁用） |

```ts
const flashes = await sdk.news.flash({ pageSize: 10 });
const cnNotices = await sdk.news.announcements({ symbol: '600519', keyword: '分红', pageSize: 10 });
const hkNotices = await sdk.news.announcements({ symbol: '00700', pageSize: 10 });
const usNotices = await sdk.news.announcements({ symbol: 'AAPL', keyword: '10-K', pageSize: 10 });
```

### 核心类型定义

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

## `corporate` · 公司治理与股东

| 方法 | 说明 |
|---|---|
| `sdk.corporate.topHolders(symbol, options?, route?)` | 个股历期十大流通股东持股与变动 |
| `sdk.corporate.holderCount(symbol, options?, route?)` | 个股历期股东户数、较上期增减比例与户均持股 |

```ts
const topHolders = await sdk.corporate.topHolders('600519', { pageSize: 10 });
const holderCount = await sdk.corporate.holderCount('600519', { pageSize: 10 });
```

## `bond` · 可转债

| 方法 | 说明 |
|---|---|
| `sdk.bond.convertibleList(options?, route?)` | 可转债列表（转债代码/正股代码/信用评级/发行规模/转股价/到期日） |

```ts
const bonds = await sdk.bond.convertibleList({ pageSize: 20 });
```

## `StockNodeSDKOptions` 构造配置摘要

除完整兼容 `StockSDKOptions` 外，`new StockNodeSDK(options)` 支持以下 Node 专属选项：

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `overseas` | `boolean` | `true` | 是否启用海外源（`cnbc` / `nasdaq` / `sec`）；中国大陆无代理直连环境可设为 `false` 一键关闭 |
| `secUserAgent` | `string` | 内置合规 UA | 访问 SEC EDGAR 官方接口的自定义合规 `User-Agent` |
| `proxy` | `ProxyConfig` | — | 单代理 URL、代理池数组或按 URL 动态解析函数 |
| `useEnvProxy` | `boolean` | `false` | 是否读取环境变量 `HTTP_PROXY` / `HTTPS_PROXY` |
| `cache` | `NodeCacheConfig` | — | 可注入 `FileCacheStore` 或自定义 `CacheStore` |
| `routing` | `Omit<SourceRouterOptions, 'onRoute'>` | — | 全局 `forcedSource` / `preferredSources` / `disabledProviders` / 冷却策略 |
| `customAdapters` | `readonly SourceAdapter[]` | — | 启动时注入自定义或第三方数据源适配器 |
| `onRoute` | `(trace: RouteTrace) => void` | — | 路由完成后的全局观测回调 |
