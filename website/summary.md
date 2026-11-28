# Stock SDK 文档总览

> 此页面由脚本自动生成，请不要手动编辑。

## 项目定位

- 包名：`stock-sdk`
- 当前版本：`2.5.0`
- 定位：面向浏览器与 Node.js 的全栈股票/财经数据 SDK 家族：提供零依赖双端版 stock-sdk 与多源高可用 Node 增强版 stock-node-sdk，支持多市场行情、K 线、指标、期货、期权、财报、快讯公告与 AI / MCP 集成
- 核心卖点：一仓双包：stock-sdk（零依赖 · 浏览器 + Node.js）& stock-node-sdk（Node 多源容错 · 财报/快讯/公告）| 完整 TypeScript 类型 | CLI & MCP

## 构建产物

| 文件 | 体积 | Gzip |
| --- | --- | --- |
| `packages/stock-sdk/dist/index.js` | 3.57 KB | 1.62 KB |
| `packages/stock-sdk/dist/index.cjs` | 5.15 KB | 1.71 KB |

## 请求治理能力

| 配置项 | 类型 | 说明 |
| --- | --- | --- |
| `baseUrl` | `string` | 腾讯行情请求地址，可替换为自建代理或网关。 |
| `timeout` | `number` | 全局请求超时时间，provider 未覆盖时沿用此配置。 |
| `retry` | `RetryOptions` | 请求重试策略，支持指数退避、状态码白名单和回调。 |
| `headers` | `Record<string, string>` | 追加自定义请求头。 |
| `userAgent` | `string` | 自定义 User-Agent，浏览器环境可能忽略。 |
| `rateLimit` | `RateLimiterOptions` | 全局限流器配置，控制请求速率和突发流量。 |
| `rotateUserAgent` | `boolean` | 仅 Node.js 生效，自动轮换常见 UA 以降低频控概率。 |
| `circuitBreaker` | `CircuitBreakerOptions` | 全局熔断器配置，连续失败后短暂停止请求。 |
| `providerPolicies` | `Partial<Record<ProviderName, ProviderRequestPolicy>>` | 按 provider 单独覆盖超时、重试、限流、熔断和请求头策略。 |
| `fetchImpl` | `FetchImpl` | 可注入的自定义 fetch 实现（代理 / mock / 日志），默认运行时全局 fetch。 |
| `signal` | `AbortSignal` | client 级外部取消信号；触发后该实例全部在途请求归类为 ABORTED。 |
| `hooks` | `RequestHooks` | 请求生命周期钩子（onRequest/onResponse/onError/onRetry/trace），回调抛错不影响主流程。 |

### Provider 策略覆盖

- `tencent`：腾讯财经链路，主要用于实时行情、代码列表、搜索与交易日历。
- `eastmoney`：东方财富链路，主要用于 K 线、板块、分红、期货与部分期权数据。
- `sina`：新浪链路，主要用于 ETF 期权分钟数据、A 股备源行情与快讯/分红。
- `cninfo`：巨潮资讯官方披露链路（Node 端），用于 A 股上市公司官方公告检索。
- `hkexnews`：港交所披露易官方链路（Node 端），用于港股上市公司公告检索。
- `cnbc`：CNBC 海外行情与图表链路（Node 端），用于港/美股跨区容灾备源。
- `nasdaq`：Nasdaq 官方数据链路（Node 端），用于美股行情、K 线、分红与财报备源。
- `sec`：SEC EDGAR 官方披露链路（Node 端），用于美股 10-K/10-Q/8-K 等官方公告。
- `xueqiu`：雪球数据链路（Node 端预置会话策略支持），用于自定义扩展适配器。
- `linkdiary`：项目内保留的扩展 provider 名称，用于兼容额外数据链路。
- `unknown`：未能识别 provider 时的兜底策略名称。

## 技术指标能力

- 支持的 `IndicatorOptions` 键：`ma`、`macd`、`boll`、`kdj`、`rsi`、`wr`、`bias`、`cci`、`atr`、`obv`、`roc`、`dmi`、`sar`、`kc`
- 独立导出的计算函数：`calcSMA`、`calcEMA`、`calcWMA`、`calcMA`、`calcMACD`、`calcBOLL`、`calcKDJ`、`calcRSI`、`calcWR`、`calcBIAS`、`calcCCI`、`calcATR`、`calcOBV`、`calcROC`、`calcDMI`、`calcSAR`、`calcKC`、`calcChipDistribution`

## SDK 方法分组

### 实时行情

- `quotes.cn`
- `quotes.cnSimple`
- `quotes.hk`
- `quotes.us`
- `quotes.fund`

### K 线与分时

- `kline.cn`
- `kline.hk`
- `kline.us`
- `kline.cnMinute`
- `kline.hkMinute`
- `kline.usMinute`
- `quotes.timeline`
- `kline.withIndicators`
- `kline.signals`

### 筹码分布

- `chips.cn`
- `chips.hk`
- `chips.us`

### 板块与扩展数据

- `board.industry.list`
- `board.industry.spot`
- `board.industry.constituents`
- `board.industry.kline`
- `board.industry.minuteKline`
- `board.concept.list`
- `board.concept.spot`
- `board.concept.constituents`
- `board.concept.kline`
- `board.concept.minuteKline`
- `quotes.fundFlow`
- `quotes.largeOrder`
- `search`
- `reference.tradingCalendar`
- `calendar.isTradingDay`
- `calendar.nextTradingDay`
- `calendar.prevTradingDay`
- `calendar.marketStatus`
- `reference.dividendDetail`

### 期货与期权

- `futures.kline`
- `futures.globalSpot`
- `futures.globalKline`
- `futures.inventorySymbols`
- `futures.inventory`
- `futures.comexInventory`
- `options.index.spot`
- `options.index.kline`
- `options.cffex.quotes`
- `options.etf.months`
- `options.etf.expireDay`
- `options.etf.minute`
- `options.etf.dailyKline`
- `options.etf.fiveDayMinute`
- `options.commodity.spot`
- `options.commodity.kline`
- `options.lhb`

### 批量与代码列表

- `codes.cn`
- `codes.us`
- `codes.hk`
- `codes.fund`
- `batch.cn`
- `batch.hk`
- `batch.us`
- `batch.byCodes`
- `batch.raw`

### 资金流向（深度）

- `fundFlow.individual`
- `fundFlow.market`
- `fundFlow.rank`
- `fundFlow.sectorRank`
- `fundFlow.sectorHistory`

### 沪深港通 / 北向资金

- `northbound.minute`
- `northbound.summary`
- `northbound.holdingRank`
- `northbound.history`
- `northbound.individual`

### 涨停板 / 盘口异动

- `marketEvent.ztPool`
- `marketEvent.stockChanges`
- `marketEvent.boardChanges`
- `marketEvent.individualChanges`
- `marketEvent.individualChangesHistory`
- `marketEvent.unusualFluctuation`

### 龙虎榜

- `dragonTiger.detail`
- `dragonTiger.stockStats`
- `dragonTiger.institution`
- `dragonTiger.branchRank`
- `dragonTiger.seatDetail`

### 大宗交易 / 融资融券

- `blockTrade.marketStat`
- `blockTrade.detail`
- `blockTrade.dailyStat`
- `margin.accountInfo`
- `margin.targetList`

### 基金深度数据

- `fund.dividendList`
- `fund.navHistory`
- `fund.rankHistory`
- `fund.profile`
- `fund.theme.getThemeList`
- `fund.theme.getThemeFunds`

## Node 增强版（stock-node-sdk）

- 包名：`stock-node-sdk`
- 当前版本：`0.1.0-beta.1`
- 定位：Node.js 18.17+ 多源高可用财经数据 SDK，严格超集兼容 `stock-sdk` 全部方法，并扩展以下 Node 专属能力。

| 文件 | 体积 | Gzip |
| --- | --- | --- |
| `packages/stock-node-sdk/dist/index.js` | 3.81 KB | 1.70 KB |
| `packages/stock-node-sdk/dist/index.cjs` | 5.50 KB | 1.81 KB |

### 财务与基本面（Node 专属）

- `financial.indicators`
- `financial.income`
- `financial.balance`
- `financial.cashflow`
- `financial.forecast`
- `financial.express`

### 7×24 快讯与公告（Node 专属）

- `news.flash`
- `news.announcements`

### 公司治理与股东（Node 专属）

- `corporate.topHolders`
- `corporate.holderCount`

### 可转债（Node 专属）

- `bond.convertibleList`

## 相关页面

- [快速开始](/guide/getting-started)
- [Node 增强版指南](/guide/node-sdk)
- [Node 专属扩展 API](/api/node-extensions)
- [错误处理与重试](/guide/retry)
- [请求治理](/guide/request-governance)
- [期货与期权](/guide/futures-options)
- [复权说明](/guide/dividend-adjustment)
- [API 总览](/api/)
