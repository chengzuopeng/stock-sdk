# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://stock-sdk.linkdiary.cn/mcp/)
[![AI Ready](https://img.shields.io/badge/AI-Ready-orange)](https://stock-sdk.linkdiary.cn/mcp/)

**[English](./README_EN.md)** | 中文

为 **前端和 Node.js 设计的股票行情 JavaScript SDK**。

无需 Python、无需后端服务，直接在 **浏览器或 Node.js** 中获取 **A 股 / 港股 / 美股 / 公募基金** 的实时行情与 K 线数据。还自带 **命令行工具** 与 **MCP server**，一条命令取行情或接入 AI。

**✨ 零依赖、轻量发布包 | 🌐 Browser + Node.js | 📦 ESM + CJS + subpath | 🧠 完整 TypeScript 类型 | 🖥️ CLI | 🤖 MCP**

> ✨ **v2.0.0**：v2 是一次架构跃迁（命名空间 API、统一符号模型、`Quote` 可辨识联合、统一错误体系、CLI / MCP / subpath 导出）。
> 安装：`npm i stock-sdk`。从 v1 升级请先读 [v1 → v2 迁移指南](https://stock-sdk.linkdiary.cn/guide/migration-v1-to-v2)（**破坏性变更，无兼容别名**）。

## 📖 官网文档

> ## 👉 https://stock-sdk.linkdiary.cn
>
> 完整 API、命名空间总览、CLI / MCP 指南、在线 Playground、v1 → v2 迁移文档全部在这里。先看官网再上手最快。
>
> （[v1 稳定版文档](https://v1.stock-sdk.linkdiary.cn) 已归档）

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线 Playground](https://stock-sdk.linkdiary.cn/playground/)

🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/)：基于 stock-sdk 搭建的股票数据大盘演示站点，欢迎体验。

## Why stock-sdk？

如果你是前端工程师，可能遇到过这些问题：

* 股票行情工具大多是 **Python 生态**，前端难以直接使用
* 想做行情看板 / Demo，不想额外维护后端服务
* 财经接口返回格式混乱、编码复杂（GBK / 并发 / 批量）

**stock-sdk 的目标很简单：**

> 让前端工程师，用最熟悉的 JavaScript / TypeScript，优雅地获取股票行情数据。

---

## 使用场景

* 📊 股票行情看板（Web / Admin）
* 📈 数据可视化（ECharts / TradingView）
* 🎓 股票 / 金融课程 Demo
* 🧪 量化策略原型验证（JS / Node）
* 🕒 Node.js 定时抓取行情数据
* 🖥️ 命令行临时查行情 / 🤖 给 AI 工具接数据源

---

## 特性

- ✅ **零依赖**，浏览器 + Node.js 18+ 双端运行；同时提供 **ESM** 和 **CommonJS**
- ✅ **命名空间 API**：`sdk.quotes.cn()` / `sdk.kline.cn()` / `sdk.options.etf.dailyKline()`，按领域分组、IDE 自动补全友好
- ✅ **统一符号模型**：`string` 一等公民，`sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` 等写法容错解析；支持中证等特殊指数（`930955` / `H30533` / `HSHCI` / `GDAXI`，[详见符号指南](https://stock-sdk.linkdiary.cn/guide/symbols.html)）
- ✅ **A 股 / 港股 / 美股 / 公募基金**实时行情、历史 K 线（日/周/月）、分钟 K 线（1/5/15/30/60）、当日分时
- ✅ **技术指标**：MA / MACD / BOLL / KDJ / RSI / WR / BIAS / CCI / ATR / OBV / ROC / DMI / SAR / KC
- ✅ **筹码分布（CYQ）**：`sdk.chips.cn/hk/us` 获利比例 / 平均成本 / 90-70 成本区间与集中度 / 筹码峰直方图（东财算法本地计算，零新增数据源）
- ✅ **信号 / 选股 / 回测**：`calcSignals`（金叉死叉/超买超卖等事件识别）、链式选股器、本地回测
- ✅ **期货 / 期权 / 资金流 / 龙虎榜 / 北向 / 大宗交易 / 融资融券 / 涨停板** 等全套扩展数据
- ✅ **基金深度数据**：历史净值、实时估值、同类排名走势、基金/ETF 分红送配、**主题基金**
- ✅ **subpath 导出**：`stock-sdk/{indicators,signals,symbols,screener,cache,errors}`，纯计算不拖入网络层，tree-shake 友好
- ✅ **统一错误体系**：对外只抛 `SdkError`，带标准 `code`，可从 `stock-sdk/errors` 导入
- ✅ **请求治理**：provider 级重试 / 限流 / 熔断 + 可注入 `fetchImpl` / `signal` / 生命周期 `hooks`
- ✅ **CLI**：`stock-sdk quote 600519` 终端直接取行情
- ✅ **内置 MCP server**：`stock-sdk mcp` 一行接入 Cursor / Claude / Codex 等 AI 工具（零依赖手写，无 `@modelcontextprotocol/sdk`）

---

## 安装

```bash
# 最新版（v2：命名空间 API / CLI / MCP）
npm install stock-sdk

# v1 旧版（已封存，仅维护 critical 修复）
npm install stock-sdk@legacy
```

## 快速开始

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

> 港股 `'00700'` / `'hk00700'`，美股 `'AAPL'` / `'105.AAPL'`，由 `normalizeSymbol` 统一容错解析。

---

## 命令行（CLI）

安装后即得 `stock-sdk` 命令（或用 `npx`）：

```bash
# 行情（按代码自动识别市场）
npx stock-sdk quote 600519 00700 AAPL
# K 线 + 输出截断
npx stock-sdk kline 600519 --period weekly --limit 30
# 带技术指标
npx stock-sdk indicators 600519 --ma 5,10,20 --macd
# 搜索
npx stock-sdk search 茅台
# 任意命名空间方法直达
npx stock-sdk quotes cn sh600519 sz000001
```

默认 JSON 输出，可加 `--format table|csv`、`--pretty`、`--limit N`。

---

## 🤖 AI / MCP 集成

v2 内置零依赖 MCP server，一条命令启动：

```bash
npx stock-sdk mcp
```

接入 Cursor / Claude Desktop / Codex / Gemini 等（配置 `mcpServers`）：

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

环境变量 `STOCK_SDK_MCP_TOOLS=core|full|<逗号分隔工具名>` 控制工具集范围（默认 `core`）。

除工具外还内置 **7 个场景化 AI Skills**（MCP Prompts，如 `analyze_stock` / `screen_stocks` / `diagnose_stock`），支持的客户端可一键触发；`STOCK_SDK_MCP_PROMPTS=core|full|<名单>` 控制技能集（默认 `core`）。详见 [AI Skills 文档](https://stock-sdk.linkdiary.cn/skills/)。

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
| 分红派送 | ✅ | ❌ | ❌ | ✅ 基金 + ETF | — | — |
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
| `sdk.fundFlow` | `.individual` / `.market` / `.rank` / `.sectorRank` / `.sectorHistory` |
| `sdk.northbound` | `.minute` / `.summary` / `.holdingRank` / `.history` / `.individual` |
| `sdk.marketEvent` | `.ztPool` / `.stockChanges`(支持多类型 / `'all'`) / `.boardChanges` / `.individualChanges` / `.individualChangesHistory`(个股异动) |
| `sdk.dragonTiger` | `.detail` / `.stockStats` / `.institution` / `.branchRank` / `.seatDetail` |
| `sdk.blockTrade` / `sdk.margin` | 大宗交易 / 融资融券 |
| `sdk.fund` | `.dividendList` / `.navHistory` / `.estimate` / `.rankHistory` / `.theme` |
| `sdk.calendar` | `.isTradingDay` / `.nextTradingDay` / `.prevTradingDay` / `.marketStatus` |
| `sdk.reference` | `.dividendDetail` / `.tradingCalendar` |
| 顶层 | `sdk.search(keyword)` |

> 指标计算从主包改为 subpath：`import { calcMACD } from 'stock-sdk/indicators'`。
> 从 v1 扁平 API 迁移？见 [v1 → v2 迁移指南](https://stock-sdk.linkdiary.cn/guide/migration-v1-to-v2)（含完整 `sdk.getXxx()` → `sdk.<ns>.<method>()` 映射表）。

---

## 开发校验

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration:smoke   # 冒烟集成（真实网络）
pnpm test:integration:full    # 全量集成回归
```

---

## 许可证

[ISC](./LICENSE)

---

🌐 [官网](https://stock-sdk.linkdiary.cn) | 📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://stock-sdk.linkdiary.cn/playground/) | 🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

如果这个项目对你有帮助，欢迎 Star ⭐ 或提出 Issue 反馈。
