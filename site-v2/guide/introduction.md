# 介绍

`stock-sdk` 是一个**零运行时依赖**、面向**浏览器与 Node.js 18+ 双端**的股票行情 SDK。它在统一的数据契约之上，提供 A 股 / 港股 / 美股 / 基金 / 期货 / 期权 的行情、K 线、资金面、龙虎榜等数据，并内置技术指标与信号、选股器与回测、命令行（CLI）与 MCP 服务。

v2 是一次**架构级升级**：在 v1 已有的三源数据能力之上，重做了 API 表面、符号模型、数据契约与请求层，并新增了上层增值能力。它**不扩展数据源、不引入实时订阅**，目标是产出一个统一、干净、可 tree-shake、对程序友好的 SDK。

## v2 的定位

- **零依赖**：`package.json` 无任何运行时依赖。符号解析、技术指标、信号、选股回测、缓存乃至 MCP 协议，全部为手写纯逻辑。
- **双端可用**：同一套代码在浏览器与 Node.js 18+ 均可运行；同时产出 ESM 与 CJS。
- **按需导入**：主入口之外提供 subpath 导出（`stock-sdk/indicators`、`/signals`、`/symbols` 等），只用纯计算时不会拖入请求层与全部 provider。
- **类型完整**：公共 API 全部带 TypeScript 类型与 JSDoc。

## 与 v1 的核心差异

### 1. 命名空间 API

v1 把上百个方法平铺在门面上（`sdk.getFullQuotes()`、`sdk.getETFOptionDailyKline()`）。v2 按领域把它们组织成**命名空间**，告别扁平长方法名：

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// v2 命名空间调用
await sdk.quotes.cn(['sh600519'])              // A 股全量行情
await sdk.kline.cn('600519', { period: 'daily' }) // A 股历史 K 线
await sdk.options.etf.dailyKline('10004336')    // ETF 期权日 K
```

命名空间一览：`quotes` / `codes` / `batch` / `kline` / `board` / `options` / `futures` / `fundFlow` / `northbound` / `marketEvent` / `dragonTiger` / `blockTrade` / `margin` / `fund` / `calendar` / `reference`，以及顶层 `sdk.search(keyword)`。完整方法映射见 [API 总览](/api/) 与 [从 v1 迁移](/guide/migration-v1-to-v2)。

> v2 为**单轨硬切**，不提供兼容入口，也不保留旧方法别名。从 v1 升级请参考迁移指南。

### 2. 统一符号模型

v1 中同一只标的在不同方法里写法各异（A 股 `sh600519`、港股 `00700` / `hk00700`、美股分钟 K 线要 `105.AAPL`），符号处理散落十多处。v2 引入统一的 `normalizeSymbol`，**`string` 是一等公民**，同时支持「带提示的 string」`SymbolRef`：

```ts
import { normalizeSymbol } from 'stock-sdk/symbols'

normalizeSymbol('sh600519')   // 容错解析
normalizeSymbol('600519')
normalizeSymbol('00700')
normalizeSymbol('AAPL')
normalizeSymbol('105.AAPL')
normalizeSymbol({ code: '000001', assetType: 'index' }) // 用 hint 消歧
```

详见 [符号与代码规则](/guide/symbols)。

### 3. 统一数据契约

v2 把行情类型收敛为按 `assetType` 区分的**可辨识联合** `Quote`，并统一基础字段：

- 基础字段：`symbol` / `market` / `assetType` / `exchange` / `currency` / `timestamp` / `tz` / `source`。
- `timestamp` 为 `number | null`（无法解析时为 `null`，替代 v1 的 `NaN`）。
- 百分比统一为**百分数**（如 `5.2` 表示 5.2%）。
- 金额 / 价格目标口径为**各市场计价货币的主单位**（A 股=人民币元 / 港股=港元 / 美股=美元，不跨币种折算），成交量目标口径为「股」；当前 beta 的运行值仍以各 provider 原始口径为准。
- `raw` 字段已从数据对象中彻底移除（调试逃生舱改为 provider 层 `getXxxRaw()`）。

```ts
const [q] = await sdk.quotes.cn(['sh600519'])
switch (q.assetType) {
  case 'stock':
    console.log(q.price, q.changePercent) // 类型在 switch 中天然收窄
    break
}
```

> 具体字段以最终实现为准。

### 4. CLI 与内置 MCP

v2 在主包内提供命令行与 MCP 服务，且**不影响 `import stock-sdk` 的体积、不破坏零依赖定位**：

- **CLI**：`npx stock-sdk quote sh600519` 直接在终端取数，参数解析零依赖手写。
- **MCP**：`stock-sdk mcp` 一条命令启动 MCP server，供 Cursor / Claude / Codex 等 AI 工具接入；协议为零依赖手写的最小实现（`stdio + tools` 子集），不引入第三方 SDK。

CLI / MCP 走独立入口，一字节都不会进用户 bundle。详见 [CLI](/cli/) 与 [MCP](/mcp/)。

### 5. 选股器与回测

基于全市场行情、板块与资金流的声明式选股器，以及本地回测引擎（纯计算、可复现）：

```ts
import { screen } from 'stock-sdk/screener'

const all = await sdk.batch.cn()
const picks = screen(all)
  .where(q => q.pe != null && q.pe < 20)
  .where(q => q.changePercent > 3)
  .sortBy(q => q.amount, 'desc')
  .top(20)
```

## 能力总览

| 领域 | 命名空间 / 入口 | 内容 |
|---|---|---|
| 实时行情 | `sdk.quotes` | A 股全量 / 简要、港股、美股、基金、资金流（简版）、盘口大单、当日分时 |
| 代码与批量 | `sdk.codes` / `sdk.batch` | 各市场代码列表、全市场批量行情、按代码批量 |
| K 线 | `sdk.kline` | A / HK / US 历史 K 线、分钟 K 线、带指标 K 线 |
| 板块 | `sdk.board` | 行业 / 概念板块的列表、行情、成分股、K 线 |
| 衍生品 | `sdk.options` / `sdk.futures` | 股指 / ETF / 商品 / 中金所期权、国内与全球期货 K 线、库存 |
| 资金面 | `sdk.fundFlow` / `sdk.northbound` / `sdk.marketEvent` / `sdk.dragonTiger` / `sdk.blockTrade` / `sdk.margin` | 资金流向、北向资金、涨停 / 异动、龙虎榜、大宗交易、融资融券 |
| 基金与工具 | `sdk.fund` / `sdk.calendar` / `sdk.reference` / `sdk.search` | 公募基金扩展、交易日历、分红明细、搜索 |
| 指标 | `stock-sdk/indicators` | 14 个技术指标计算函数 + `addIndicators` |
| 信号 | `stock-sdk/signals` | `calcSignals`：金叉 / 死叉 / 超买 / 超卖等 |
| 符号 | `stock-sdk/symbols` | `normalizeSymbol`、`SymbolRef` |
| 选股回测 | `stock-sdk/screener` | 声明式选股器、本地回测引擎 |
| 缓存 | `stock-sdk/cache` | 可注入的统一缓存层（TTL / LRU） |
| CLI · MCP | `stock-sdk` (bin) / `stock-sdk mcp` | 命令行取数、内置 MCP server |

## 下一步

- [安装](/guide/installation)：npm / yarn / pnpm、subpath 导入、CLI 与 MCP。
- [快速开始](/guide/getting-started)：10 行命名空间 demo 与常见用法。
- [从 v1 迁移](/guide/migration-v1-to-v2)：方法映射与契约变化。
