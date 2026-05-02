# Stock SDK 文档总览

> 此页面由脚本自动生成，请不要手动编辑。

## 项目定位

- 包名：`stock-sdk`
- 当前版本：`1.9.0`
- 定位：面向前端与 Node.js 的股票行情 SDK，支持多市场行情、K 线、指标、期货、期权和 AI / MCP 集成
- 核心卖点：零依赖 | Browser + Node.js | 轻量发布包 | 完整 TypeScript 类型

## 构建产物

| 文件 | 体积 | Gzip |
| --- | --- | --- |
| `dist/index.js` | 94.88 KB | 26.64 KB |
| `dist/index.cjs` | 95.69 KB | 27.03 KB |

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

### Provider 策略覆盖

- `tencent`：腾讯财经链路，主要用于实时行情、代码列表、搜索与交易日历。
- `eastmoney`：东方财富链路，主要用于 K 线、板块、分红、期货与部分期权数据。
- `sina`：新浪链路，主要用于 ETF 期权分钟数据和部分期权场景。
- `linkdiary`：项目内保留的扩展 provider 名称，用于兼容额外数据链路。
- `unknown`：未能识别 provider 时的兜底策略名称。

## 技术指标能力

- 支持的 `IndicatorOptions` 键：`ma`、`macd`、`boll`、`kdj`、`rsi`、`wr`、`bias`、`cci`、`atr`、`obv`、`roc`、`dmi`、`sar`、`kc`
- 独立导出的计算函数：`calcSMA`、`calcEMA`、`calcWMA`、`calcMA`、`calcMACD`、`calcBOLL`、`calcKDJ`、`calcRSI`、`calcWR`、`calcBIAS`、`calcCCI`、`calcATR`、`calcOBV`、`calcROC`、`calcDMI`、`calcSAR`、`calcKC`

## SDK 方法分组

### 实时行情

- `getFullQuotes`
- `getSimpleQuotes`
- `getHKQuotes`
- `getUSQuotes`
- `getFundQuotes`

### K 线与分时

- `getHistoryKline`
- `getHKHistoryKline`
- `getUSHistoryKline`
- `getMinuteKline`
- `getTodayTimeline`
- `getKlineWithIndicators`

### 板块与扩展数据

- `getIndustryList`
- `getIndustrySpot`
- `getIndustryConstituents`
- `getIndustryKline`
- `getConceptList`
- `getConceptSpot`
- `getConceptConstituents`
- `getConceptKline`
- `getFundFlow`
- `getPanelLargeOrder`
- `search`
- `getTradingCalendar`
- `getDividendDetail`

### 期货与期权

- `getFuturesKline`
- `getGlobalFuturesSpot`
- `getGlobalFuturesKline`
- `getFuturesInventorySymbols`
- `getFuturesInventory`
- `getComexInventory`
- `getIndexOptionSpot`
- `getIndexOptionKline`
- `getCFFEXOptionQuotes`
- `getETFOptionMonths`
- `getETFOptionExpireDay`
- `getETFOptionMinute`
- `getETFOptionDailyKline`
- `getETFOption5DayMinute`
- `getCommodityOptionSpot`
- `getCommodityOptionKline`
- `getOptionLHB`

### 批量与代码列表

- `getAShareCodeList`
- `getUSCodeList`
- `getHKCodeList`
- `getFundCodeList`
- `getAllAShareQuotes`
- `getAllHKShareQuotes`
- `getAllUSShareQuotes`
- `getAllQuotesByCodes`
- `batchRaw`

### 资金流向（深度）

- `getIndividualFundFlow`
- `getMarketFundFlow`
- `getFundFlowRank`
- `getSectorFundFlowRank`
- `getSectorFundFlowHistory`

### 沪深港通 / 北向资金

- `getNorthboundMinute`
- `getNorthboundFlowSummary`
- `getNorthboundHoldingRank`
- `getNorthboundHistory`
- `getNorthboundIndividual`

### 涨停板 / 盘口异动

- `getZTPool`
- `getStockChanges`
- `getBoardChanges`

### 龙虎榜

- `getDragonTigerDetail`
- `getDragonTigerStockStats`
- `getDragonTigerInstitution`
- `getDragonTigerBranchRank`
- `getDragonTigerStockSeatDetail`

### 大宗交易 / 融资融券

- `getBlockTradeMarketStat`
- `getBlockTradeDetail`
- `getBlockTradeDailyStat`
- `getMarginAccountInfo`
- `getMarginTargetList`

## 相关页面

- [快速开始](/guide/getting-started)
- [错误处理与重试](/guide/retry)
- [请求治理](/guide/request-governance)
- [期货与期权](/guide/futures-options)
- [分红与交易日历](/guide/dividend-calendar)
- [API 总览](/api/)

