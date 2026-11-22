# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg?label=stock-sdk)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://stock-sdk.linkdiary.cn/mcp/)
[![AI Ready](https://img.shields.io/badge/AI-Ready-orange)](https://stock-sdk.linkdiary.cn/mcp/)

**[English](./README_EN.md)** | 中文

面向 **浏览器与 Node.js 的全栈股票 / 财经数据 TypeScript SDK 家族**（Monorepo 一仓双包）。

无需 Python，在 **浏览器或 Node.js** 中以统一的 TypeScript Schema 获取 **A 股 / 港股 / 美股 / 公募基金 / 期货 / 期权 / 财报 / 7×24 快讯 / 上市公司公告**。自带 **命令行工具（CLI）** 与 **MCP server**，一条命令取数或接入 AI。

**✨ 一仓双包：`stock-sdk`（零依赖双端）& `stock-node-sdk`（Node 多源容错增强）| 📦 ESM + CJS + subpath | 🧠 完整 TypeScript 类型 | 🖥️ CLI | 🤖 MCP**

> ✨ **v2 架构**：命名空间 API、统一符号模型、`Quote` 可辨识联合、统一错误体系、CLI / MCP / subpath 导出。从 v1 升级请先读 [v1 → v2 迁移指南](https://stock-sdk.linkdiary.cn/guide/migration-v1-to-v2)（**破坏性变更，无兼容别名**）。

## 📦 一仓双包：怎么选？

本仓库通过 pnpm Monorepo 共享统一核心层（`@stock-sdk/core`），对外发布两个 API 严格对齐的包：

| 包名 | 运行环境 | 依赖 | 核心定位与能力 | 文档 |
|---|---|---|---|---|
| **[`stock-sdk`](./packages/stock-sdk)** | 浏览器 + Node.js 18+ | **0 依赖** | 轻量双端通用版：94 个命名空间方法（行情/K 线/板块/资金流/期货/期权/基金/筹码）、14 项技术指标/信号/选股回测、94 命令 CLI & 93 工具 MCP | [快速开始](https://stock-sdk.linkdiary.cn/guide/getting-started) |
| **[`stock-node-sdk`](./packages/stock-node-sdk)** | Node.js 18+ 服务端 | 仅 `undici` | **Node 多源高可用增强版（`stock-sdk` 严格超集）**：能力驱动 `SourceRouter` 多源自动容错（A/HK/US 行情 3 源、K 线/批量/分红/快讯/公告双源）、`ProxyPool` 代理池 / `CookieJar` / `FileCacheStore` 磁盘缓存；新增 **`financial`（财报/业绩）**、**`news`（7×24 快讯/巨潮公告）**、**`corporate`（股东）**、**`bond`（可转债）**；105 命令 CLI（`--source`/`--proxy`/`--cache-dir`）& 104 工具 MCP | [Node 增强版指南](https://stock-sdk.linkdiary.cn/guide/node-sdk) |

## 📖 官网文档

> ## 👉 https://stock-sdk.linkdiary.cn
>
> 双包指南、完整 API、Node 多源增强与扩展文档、CLI / MCP 指南、在线 Playground、v1 → v2 迁移文档全部在这里。先看官网再上手最快。
>
> （[v1 稳定版文档](https://v1.stock-sdk.linkdiary.cn) 已归档）

📦 [NPM (`stock-sdk`)](https://www.npmjs.com/package/stock-sdk) | 📦 [NPM (`stock-node-sdk`)](https://www.npmjs.com/package/stock-node-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线 Playground](https://stock-sdk.linkdiary.cn/playground/)

🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/)：基于 stock-sdk 搭建的股票数据大盘演示站点，欢迎体验。

## Why Stock SDK？

无论你在做**前端可视化**，还是搭建 **Node.js 数据服务 / 量化脚本 / AI Agent**，往往会遇到这些问题：

* 股票数据工具大多集中在 **Python 生态**，JS / TS 工程难以直接复用
* 做 Web 看板 / Demo 时不想额外维护后端；而跑在 Node 服务端时又受限于浏览器安全模型（缺 `Referer` / `POST` / Cookie / 代理 / 本地缓存）
* 财经公开接口字段与单位各不相同（股/手、元/万/亿、GBK 编码、HTML 表格），单个源还容易偶发限流或断连

**Stock SDK 的目标很简单：**

> 用一套统一的 TypeScript 契约同时覆盖两类场景——前端直接用零依赖的 `stock-sdk`，服务端直接切到多源自动容错、覆盖财报快讯公告的 `stock-node-sdk`。

---

## 使用场景

* 📊 Web 股票行情看板与数据可视化（ECharts / TradingView —— 推荐 `stock-sdk`）
* 🚀 Node.js 服务端高可用行情采集、多源容错、定时任务与磁盘缓存（推荐 `stock-node-sdk`）
* 📑 基本面研究：财报三大表、财务指标、业绩预告/快报、7×24 快讯与巨潮公告（`stock-node-sdk`）
* 🧪 量化策略原型验证、指标信号识别、选股与本地回测（双包通用）
* 🖥️ 终端 CLI 速查行情 / 🤖 为 Cursor / Claude / Codex / Gemini 等 AI 工具接入 MCP 数据源

---

## 特性

- ✅ **一仓双包，API 严格超集对齐**：`stock-sdk`（零依赖、浏览器 + Node.js 双端）与 `stock-node-sdk`（Node.js 18+ 多源高可用增强版），迁移只需替换 import
- ✅ **能力驱动多源自动容错（`stock-node-sdk`）**：默认无需指定数据源，按 `supports(input)` + `requiredFields` 前置过滤与健康度冷却自动切源（A/HK/US 行情 3 源、K 线/批量/分红/快讯/公告双源），`withMeta()` 并发安全溯源，`registerAdapter()` 热插拔自定义源
- ✅ **Node 专属数据与传输层（`stock-node-sdk`）**：新增 `financial`（财务指标/三大表/预告/快报）、`news`（7×24 快讯/东财+巨潮双源公告）、`corporate`（十大股东/股东户数）、`bond`（可转债）；内置 `ProxyPool`、`CookieJar`、`SessionManager` 与 `FileCacheStore` 本地磁盘缓存
- ✅ **命名空间 API**：`sdk.quotes.cn()` / `sdk.kline.cn()` / `sdk.financial.indicators()` / `sdk.options.etf.dailyKline()`，按领域分组、IDE 自动补全友好
- ✅ **统一符号模型**：`string` 一等公民，`sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` 等写法容错解析；支持中证等特殊指数（`930955` / `H30533` / `HSHCI` / `GDAXI`，[详见符号指南](https://stock-sdk.linkdiary.cn/guide/symbols.html)）
- ✅ **A 股 / 港股 / 美股 / 公募基金**实时行情、历史 K 线（日/周/月）、分钟 K 线（1/5/15/30/60）、当日分时
- ✅ **技术指标与筹码分布（CYQ）**：14 项内置技术指标（MA/MACD/BOLL/KDJ/RSI/WR/BIAS/CCI/ATR/OBV/ROC/DMI/SAR/KC）+ `sdk.chips.cn/hk/us` 筹码分布（东财算法本地计算）
- ✅ **信号 / 选股 / 回测**：`calcSignals`（金叉死叉/超买超卖等事件识别）、链式选股器、本地回测
- ✅ **期货 / 期权 / 资金流 / 龙虎榜 / 北向 / 大宗交易 / 融资融券 / 涨停板 / 基金深度数据** 全套覆盖
- ✅ **subpath 按需导出**：`{indicators,signals,symbols,screener,cache,errors}`（及 `stock-node-sdk/router`），纯计算不拖入网络层
- ✅ **统一错误与请求治理**：对外只抛带标准 `code` 的 `SdkError`；provider 级重试 / 限流 / 熔断 + 可注入 `fetchImpl` / `signal` / `hooks`
- ✅ **内置 CLI 与零依赖 MCP server**：`stock-sdk`（94 命令 / 93 工具）与 `stock-node-sdk`（105 命令 / 104 工具，支持 `--source` / `--proxy` / `--cache-dir`）

---

## 安装

```bash
# 浏览器 + Node.js 双端零依赖版
npm install stock-sdk

# Node.js 18+ 多源高可用增强版（Beta 公测中，推荐用于服务端 / 量化脚本 / AI Agent）
npm install stock-node-sdk@beta

# v1 旧版（已封存，仅维护 critical 修复）
npm install stock-sdk@legacy
```

## 快速开始

### 1. 浏览器 / Node.js 双端零依赖（`stock-sdk`）

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 命名空间 API（v2）— 符号写法容错，'600519' / 'sh600519' / '600519.SH' 都可
const quotes = await sdk.quotes.cnSimple(['sh000001', 'sz000858', 'sh600519']);
quotes.forEach((q) => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});

// 历史 K 线 + 技术指标
const kline = await sdk.kline.withIndicators('600519', {
  period: 'daily',
  indicators: { ma: { periods: [5, 10, 20] }, macd: {} },
});

// 全市场 A 股行情（5000+ 股票，内置并发控制）
const all = await sdk.batch.cn({ concurrency: 5 });
console.log(`共 ${all.length} 只`);
```

### 2. Node.js 多源高可用增强版（`stock-node-sdk`）

```ts
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk';

const sdk = new StockNodeSDK({
  timeout: 15_000,
  // 财务/股东/可转债自动落盘缓存
  cache: { store: new FileCacheStore({ dir: './.stock-cache' }) },
});

// 默认无需指定源，腾讯 → 新浪 → 东财自动容错，withMeta 并发安全溯源
const { data: quotes, trace } = await sdk.withMeta(() =>
  sdk.quotes.cn(['600519', '000001'])
);
console.log(quotes[0].price, '命中源:', trace?.selectedProvider);

// Node 专属数据域：财报指标、7×24 快讯、巨潮/东财双源公告
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 });
const flashes = await sdk.news.flash({ pageSize: 10 });
const notices = await sdk.news.announcements({ symbol: '600519', keyword: '分红' });

await sdk.close();
```

> 港股 `'00700'` / `'hk00700'`，美股 `'AAPL'` / `'105.AAPL'`，由 `normalizeSymbol` 统一容错解析。

---

## 命令行（CLI）

两个包均自带命令行工具（`stock-sdk` 94 条命令；`stock-node-sdk` 105 条命令，额外支持 `--source` / `--proxy` / `--cache-dir`）：

```bash
# 基础版 CLI（零依赖）
npx stock-sdk quote 600519 00700 AAPL
npx stock-sdk kline 600519 --period weekly --limit 30
npx stock-sdk indicators 600519 --ma 5,10,20 --macd
npx stock-sdk search 茅台

# Node 增强版 CLI（Beta，支持指定数据源 / 代理 / 本地缓存 + 财报快讯公告）
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4 --cache-dir ./.stock-cache --pretty
npx stock-node-sdk@beta news flash --pageSize 10
npx stock-node-sdk@beta news announcements --symbol 600519 --keyword 分红
```

默认输出 JSON，可加 `--format table|csv`、`--pretty`、`--limit N`。参数格式错误会返回退出码 `2`。用 `stock-sdk fundFlow rank --help` 或 `stock-node-sdk --help` 查看完整选项。

---

## 🤖 AI / MCP 集成

内置零依赖 MCP server，一条命令启动（**AI 客户端跑在 Node 端，推荐直接使用 `stock-node-sdk@beta mcp` 获取 104 个全量工具 + 多源容错 + 财报/快讯/公告能力**；若偏好零依赖极简版则用 `stock-sdk mcp`）：

```bash
npx stock-node-sdk@beta mcp   # Node 增强版（Beta，104 工具 + 多源自动容错，支持 --cache-dir / --proxy / --source）
npx stock-sdk mcp             # 零依赖基础版（93 工具）
```

接入 Cursor / Claude Desktop / Codex / Gemini 等（配置 `mcpServers`）：

```json
{
  "mcpServers": {
    "stock-node-sdk": {
      "command": "npx",
      "args": ["-y", "stock-node-sdk@beta", "mcp"]
    }
  }
}
```

环境变量 `STOCK_SDK_MCP_TOOLS=core|full|<逗号分隔工具名>` 控制工具集范围（默认 `core`）。

要通过 `npx` 暴露全量 MCP 工具，在配置中加入 `env`：

```json
{
  "mcpServers": {
    "stock-node-sdk": {
      "command": "npx",
      "args": ["-y", "stock-node-sdk@beta", "mcp"],
      "env": { "STOCK_SDK_MCP_TOOLS": "full" }
    }
  }
}
```

MCP 在调用 SDK 前校验数组元素和嵌套指标配置。K 线和信号超限时保留最近记录。基金净值和同类排名工具支持 `startDate` / `endDate`，并在 `coverage` 中标注实际返回的区间。[MCP 工具文档](https://stock-sdk.linkdiary.cn/mcp/tools)

内置 7 个场景化 AI Skills（MCP Prompts）。`STOCK_SDK_MCP_PROMPTS` 选择技能范围，客户端会发现当前工具集可以执行的技能。将工具和技能范围都设为 `full` 可使用全部 7 个。[AI Skills 文档](https://stock-sdk.linkdiary.cn/skills/)

👉 [完整 MCP 文档](https://stock-sdk.linkdiary.cn/mcp/)

---

## 信号 / 选股 / 回测

```ts
import { calcSignals } from 'stock-sdk/signals';
import { screen, backtest } from 'stock-sdk/screener';

// 金叉/死叉/超买超卖等事件识别（基于带指标的 K 线）
const signals = calcSignals(klineWithIndicators, {
  ma: { fast: 5, slow: 20 },
  rsi: {},
});

// 链式选股（输入任意行情数组，纯本地、无网络）
const picks = screen(allQuotes)
  .where((q) => q.pe != null && q.pe < 20)
  .where((q) => q.changePercent > 3)
  .sortBy((q) => q.amount)
  .top(20);

// 本地回测
const report = backtest({
  klines,
  strategy: (bar, i, all) => 'hold', // 返回 'buy' | 'sell' | 'hold'
});
console.log(report.totalReturn, report.winRate, report.maxDrawdown);
```

---

## 请求治理与错误

```ts
import { StockSDK } from 'stock-sdk';
import { HttpError, getSdkErrorCode } from 'stock-sdk/errors';

const sdk = new StockSDK({
  retry: { maxRetries: 2, baseDelay: 500 },
  providerPolicies: {
    eastmoney: { timeout: 12000, rateLimit: { requestsPerSecond: 3, maxBurst: 3 } },
  },
});

try {
  await sdk.quotes.cnSimple(['sh600519']);
} catch (error) {
  // v2 对外只抛 SdkError，带统一 code
  if (error instanceof HttpError) console.log(error.status, error.statusText);
  console.log(getSdkErrorCode(error)); // HTTP_ERROR / NETWORK_ERROR / TIMEOUT / ABORTED / PARSE_ERROR ...
}
```

---

## 子路径导出（subpath）

只用纯计算（指标 / 符号 / 信号 / 选股）时，从 subpath 导入，bundle 不会拖入 `RequestClient` 与所有 provider：

```ts
// 14 个指标、共 17 个纯函数(MA 族含 calcSMA/calcEMA/calcWMA 三个变体):
// calcSMA / calcEMA / calcWMA / calcMA / calcMACD / calcBOLL / calcKDJ /
// calcRSI / calcWR / calcBIAS / calcCCI / calcATR / calcOBV / calcROC /
// calcDMI / calcSAR / calcKC
import { calcMACD, calcKDJ } from 'stock-sdk/indicators';
import { normalizeSymbol, toTencentSymbol } from 'stock-sdk/symbols';
import { calcSignals } from 'stock-sdk/signals';
import { screen, backtest } from 'stock-sdk/screener';
import { MemoryCacheStore, cacheThrough } from 'stock-sdk/cache';
import { SdkError, isSdkError, getSdkErrorCode } from 'stock-sdk/errors';
```

---

## 市场支持矩阵

不同市场的能力覆盖度差异较大，下表帮你快速判断 SDK 是否覆盖你的场景。

- ✅ 已支持 ｜ ⚠️ 部分支持（见备注）｜ ❌ 暂未实现 ｜ — 概念不适用

| 能力 | A 股 | 港股 | 美股 | 公募基金 | 期货 | 期权 |
|------|:----:|:----:|:----:|:--------:|:----:|:----:|
| 实时行情 | ✅ | ✅ | ✅ | ✅ | ✅ 全球期货 | ✅ ETF / 中金所 / 商品 |
| 历史 K 线（日/周/月） | ✅ | ✅ | ✅ | ⚠️ 场内 ETF/LOF | ✅ 国内 + 全球 | ✅ |
| 分钟 K 线（5/15/30/60） | ✅ | ✅ `kline.hkMinute` | ✅ `kline.usMinute` | ⚠️ 场内 ETF/LOF | ❌ | ❌ |
| 筹码分布（CYQ） | ✅ `chips.cn` | ✅ `chips.hk` | ✅ `chips.us` | — | — | — |
| 当日分时（1 分钟） | ✅ `quotes.timeline` | ✅ `kline.hkMinute`(period='1') | ✅ `kline.usMinute`(period='1') | ⚠️ 场内 ETF/LOF | ❌ | ✅ ETF 期权 |
| 分红派送 | ✅ | ✅ *(Node 版)* | ✅ *(Node 版，东财/Nasdaq)* | ✅ 基金 + ETF | — | — |
| 财务指标 / 三大表 | ✅ *(Node 版)* | ✅ *(Node 版)* | ✅ *(Node 版，东财/Nasdaq)* | — | — | — |
| 上市公司公告 | ✅ *(Node 版，东财/巨潮)* | ✅ *(Node 版，港交所披露易)* | ✅ *(Node 版，SEC EDGAR)* | — | — | — |
| 资金流向 | ✅ 个股/大盘/排名/板块 | ❌ | ❌ | — | — | — |
| 板块（行业 / 概念） | ✅ | ❌ | ❌ | ❌ | — | — |
| 龙虎榜 | ✅ | — | — | — | — | ✅ 期权龙虎榜 |
| 沪深港通 / 北向资金 | ✅ 北向 | ✅ 南向 | — | — | — | — |
| 大宗交易 / 融资融券 | ✅ | ❌ | ❌ | — | — | — |
| 涨停板 / 盘口异动 | ✅ | — | — | — | — | — |
| 全市场代码列表 / 批量行情 | ✅ 5000+ | ✅ | ✅ | ✅ 代码 | ❌ | ❌ |
| 库存数据 | — | — | — | — | ✅ 国内 + COMEX | — |
| 交易日历 | ✅ `calendar.*` | ⚠️ 仅市场状态 | ⚠️ 仅市场状态 | — | — | — |

> **数据延迟**：实时行情来自腾讯财经 / 东方财富等公开接口，**非实时撮合**，通常有数十秒到数分钟延迟，不适合高频交易决策。
>
> **K 线降级**：普通 A 股历史 K 线及 5/15/30/60 分钟 K 线以东方财富为主源；遇到 `push2his` 频控断连或软限流时按腾讯、新浪顺序切换 OHLCV 备用源。不需要切换时用 `new StockSDK({ klineFallback: false })` 关闭，只请求东方财富。

---

## API 概览（命名空间）

💡 完整 API 见 [官方文档](https://stock-sdk.linkdiary.cn/api/)。v2 全部方法挂在命名空间下：

| 命名空间 | 代表方法 |
|---|---|
| `sdk.quotes` | `.cn` / `.cnSimple` / `.hk` / `.us` / `.fund` / `.fundFlow` / `.largeOrder` / `.timeline` |
| `sdk.codes` | `.cn` / `.us` / `.hk` / `.fund` |
| `sdk.batch` | `.cn` / `.hk` / `.us` / `.byCodes` / `.raw` |
| `sdk.kline` | `.cn` / `.cnMinute` / `.hk` / `.hkMinute` / `.us` / `.usMinute` / `.withIndicators` / `.signals` |
| `sdk.chips` | `.cn` / `.hk` / `.us`（筹码分布：获利比例 / 平均成本 / 成本区间 / 筹码峰） |
| `sdk.board` | `.industry.*` / `.concept.*`（`list` / `spot` / `constituents` / `kline` / `minuteKline`） |
| `sdk.options` | `.index.*` / `.etf.*` / `.commodity.*` / `.cffex.*` / `.lhb` |
| `sdk.futures` | `.kline` / `.globalSpot` / `.globalKline` / `.inventory` / `.comexInventory` … |
| `sdk.fundFlow` | `.individual` / `.market` / `.rank` / `.sectorRank`（排名均支持 `page` / `pageSize` 分页） / `.sectorHistory` |
| `sdk.northbound` | `.minute` / `.summary` / `.holdingRank` / `.history` / `.individual` |
| `sdk.marketEvent` | `.ztPool` / `.stockChanges`(支持多类型 / `'all'` / `page` 分页) / `.boardChanges` / `.individualChanges` / `.individualChangesHistory`(个股异动) / `.unusualFluctuation`(监管异动) |
| `sdk.dragonTiger` | `.detail` / `.stockStats` / `.institution` / `.branchRank` / `.seatDetail` |
| `sdk.blockTrade` / `sdk.margin` | 大宗交易 / 融资融券 |
| `sdk.fund` | `.dividendList` / `.navHistory` / `.rankHistory` / `.profile` / `.theme.*`（`getThemeList` / `getThemeFunds`） |
| `sdk.calendar` | `.isTradingDay` / `.nextTradingDay` / `.prevTradingDay` / `.marketStatus` |
| `sdk.reference` | `.dividendDetail`（Node 版东财/新浪双源） / `.tradingCalendar` |
| 顶层 | `sdk.search(keyword)` |
| `sdk.financial` *(Node 专属)* | `.indicators` / `.income` / `.balance` / `.cashflow` / `.forecast` / `.express` |
| `sdk.news` *(Node 专属)* | `.flash`（东财/新浪 7×24 双源） / `.announcements`（东财/巨潮双源） |
| `sdk.corporate` *(Node 专属)* | `.topHolders` / `.holderCount` |
| `sdk.bond` *(Node 专属)* | `.convertibleList` |

其中 `sdk.quotes.fundFlow(codes)` 提供东方财富源的 A 股实时资金流快照，按代码返回主力与小单流入、流出、净额及占比；历史、排名和板块资金流使用 `sdk.fundFlow.*`。Node 专属 API 与多源路由详情见 [Node 专属扩展 API](https://stock-sdk.linkdiary.cn/api/node-extensions)。

> 指标计算从主包改为 subpath：`import { calcMACD } from 'stock-sdk/indicators'`（`stock-node-sdk` 额外提供 `stock-node-sdk/router`）。
> 从 v1 扁平 API 迁移？见 [v1 → v2 迁移指南](https://stock-sdk.linkdiary.cn/guide/migration-v1-to-v2)（含完整 `sdk.getXxx()` → `sdk.<ns>.<method>()` 映射表）。

---

## 开发校验

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm docs:check
pnpm test:integration:smoke   # 双端冒烟集成（真实网络）
pnpm test:integration:node    # stock-node-sdk 多源真实上游集成
pnpm test:integration:full    # 全量集成回归
```

---

## 许可证

[ISC](./LICENSE)

---

🌐 [官网](https://stock-sdk.linkdiary.cn) | 📦 [NPM (`stock-sdk`)](https://www.npmjs.com/package/stock-sdk) | 📦 [NPM (`stock-node-sdk`)](https://www.npmjs.com/package/stock-node-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://stock-sdk.linkdiary.cn/playground/) | 🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

如果这个项目对你有帮助，欢迎 Star ⭐ 或提出 Issue 反馈。
