# API 参考 · 命名空间地图

v2 把 v1 扁平的 `sdk.getXxx()` 重构为**按领域组织的命名空间**。所有取数能力挂在 `sdk.<命名空间>.<方法>()` 下；纯计算能力（指标、信号、符号解析）通过 subpath 独立导出，按需引入、对 tree-shaking 友好。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

const quotes = await sdk.quotes.cn(['600519', '000001']) // 命名空间调用
const kline = await sdk.kline.cn('600519', { period: 'day' })
const k = await sdk.options.etf.dailyKline('10004336') // 二级命名空间
```

> 符号入参 `string` 是一等公民：`'sh600519'` / `'600519'` / `'00700'` / `'AAPL'` 均可，由 `normalizeSymbol` 容错解析；也可传 `SymbolRef` 带提示。详见 [符号与代码规则](/guide/symbols)。

## 行情与批量

| 命名空间 | 用途 | 文档 |
|---|---|---|
| `sdk.quotes` | 实时行情：A股全量/简要、港股、美股、基金、资金流(简版)、盘口大单、当日分时 | [quotes](/api/quotes) |
| `sdk.codes` | 各市场代码列表：A股 / 美股 / 港股 / 基金 | [codes](/api/codes) |
| `sdk.batch` | 全市场批量行情：A股 / 港股 / 美股 / 按代码批量 / 原始批量 | [batch](/api/batch) |

## K 线与板块

| 命名空间 | 用途 | 文档 |
|---|---|---|
| `sdk.kline` | A/HK/US 历史 K 线、分钟 K 线、带指标 K 线 | [kline](/api/kline) |
| `sdk.board.industry` · `sdk.board.concept` | 行业 / 概念板块：列表、行情、成分股、K线、分时 | [board](/api/board) |

## 衍生品

| 命名空间 | 用途 | 文档 |
|---|---|---|
| `sdk.options` | 期权：股指(`index`) / ETF(`etf`) / 商品(`commodity`) / 中金所(`cffex`) + 期权龙虎榜(`lhb`) | [options](/api/options) |
| `sdk.futures` | 期货：国内/全球 K 线、库存品种与库存数据 | [futures](/api/futures) |

## 资金面

| 命名空间 | 用途 | 文档 |
|---|---|---|
| `sdk.fundFlow` | 资金流向(深度)：个股 / 大盘 / 排名 / 板块排名 / 板块历史 | [fundFlow](/api/fund-flow) |
| `sdk.northbound` | 沪深港通 / 北向资金：分时 / 概览 / 持股排名 / 历史 / 个股 | [northbound](/api/northbound) |
| `sdk.marketEvent` | 市场异动：涨停池 / 盘口异动 / 板块异动 | [marketEvent](/api/market-event) |
| `sdk.dragonTiger` | 龙虎榜：明细 / 个股统计 / 机构 / 营业部排名 / 席位明细 | [dragonTiger](/api/dragon-tiger) |
| `sdk.blockTrade` | 大宗交易：市场统计 / 明细 / 每日统计 | [blockTrade](/api/block-trade) |
| `sdk.margin` | 融资融券：账户信息 / 标的列表 | [margin](/api/margin) |

## 基金与工具

| 命名空间 | 用途 | 文档 |
|---|---|---|
| `sdk.fund` | 公募基金扩展：分红列表 / 净值历史 / 估值 / 排名历史 | [fund](/api/fund) |
| `sdk.calendar` | 交易日历：是否交易日 / 下一交易日 / 上一交易日 / 市场状态 | [calendar](/api/calendar) |
| `sdk.reference` | 参考数据：分红明细 / A股交易日历 | [reference](/api/reference) |
| `sdk.search(keyword)` | 股票搜索（顶层快捷方法） | [search](/api/search) |

## 纯计算 · subpath 导出

指标、信号、符号解析是**纯函数、零网络**，不依赖 `StockSDK` 实例，从各自 subpath 独立引入：

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'
import { normalizeSymbol } from 'stock-sdk/symbols'
```

| 模块 | 导入路径 | 用途 | 文档 |
|---|---|---|---|
| 指标 | `stock-sdk/indicators` | 14 个技术指标：`calcMA` / `calcMACD` / `calcBOLL` / `calcKDJ` / `calcRSI` / `calcWR` / `calcBIAS` / `calcCCI` / `calcATR` / `calcOBV` / `calcROC` / `calcDMI` / `calcSAR` / `calcKC` + `addIndicators` | [indicators](/api/indicators) |
| 信号 | `stock-sdk/signals` | `calcSignals`：金叉 / 死叉 / 超买 / 超卖等事件识别 | [signals](/api/signals) |
| 符号 | `stock-sdk/symbols` | `normalizeSymbol`、`SymbolRef` 类型：符号容错解析 | [符号与代码规则](/guide/symbols) |

## 约定

- **方法表 → 调用示例 → 返回说明** 是每个 API 页的统一结构。
- 返回值遵循 v2 统一数据契约：基础字段 `symbol` / `market` / `assetType` / `exchange` / `currency` / `timestamp` / `tz` / `source`；`raw` 字段已移除；`timestamp` 为 `number | null`（无法解析为 `null`）；百分比为百分数（如 `5.2`）；金额 / 价格为各市场**计价货币主单位**，成交量单位为**股**。详见 [统一数据契约](/guide/migration-v1-to-v2)。
- v2 SDK 仍在实现中，命名空间与方法名稳定，**精确参数 / 返回字段以最终实现为准**。
