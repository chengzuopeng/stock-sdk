# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://stock-sdk.linkdiary.cn/en/mcp/)
[![AI Ready](https://img.shields.io/badge/AI-Ready-orange)](https://stock-sdk.linkdiary.cn/en/mcp/)

English | **[中文](./README.md)**

A **stock market data JavaScript SDK for frontend and Node.js**.

No Python. No backend service. Fetch real-time quotes and K-line data for **A-shares / Hong Kong stocks / US stocks / mutual funds** directly in **the browser or Node.js**. It also ships a **command-line tool** and an **MCP server** — one command to pull quotes or wire up AI tools.

**✨ Zero dependencies, Lightweight distribution | 🌐 Browser + Node.js | 📦 ESM + CJS + subpaths | 🧠 Full TypeScript typings | 🖥️ CLI | 🤖 MCP**

> ✨ **v2.0.0**: v2 is an architectural leap (namespaced API, unified symbol model, `Quote` discriminated union, unified error system, CLI / MCP / subpath exports).
> Install: `npm i stock-sdk`. Upgrading from v1? Read the [v1 → v2 migration guide](https://stock-sdk.linkdiary.cn/en/guide/migration-v1-to-v2) first (**breaking changes, no compat aliases**).

## 📖 Official docs

> ## 👉 https://stock-sdk.linkdiary.cn/en/
>
> Full API, namespace overview, CLI / MCP guides, the online Playground, and the v1 → v2 migration guide all live here. Start with the docs for the fastest onboarding.
>
> ([v1 stable docs](https://v1.stock-sdk.linkdiary.cn/en/) are archived)

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Playground](https://stock-sdk.linkdiary.cn/playground/)

🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/): A stock market dashboard demo built with stock-sdk. Feel free to try it.

## Why stock-sdk?

If you're a frontend engineer, you may have encountered these problems:

* Most stock market tools are in the **Python ecosystem**, making them hard to use directly in frontend
* You want to build a quote dashboard / demo without maintaining an extra backend service
* Financial APIs return messy, complex formats (GBK encoding / concurrency / batching)

**stock-sdk's goal is simple:**

> Let frontend engineers fetch stock market data elegantly, using the JavaScript / TypeScript they already know.

---

## Use cases

* 📊 Stock quote dashboards (Web / Admin)
* 📈 Data visualization (ECharts / TradingView)
* 🎓 Stock / finance course demos
* 🧪 Quant strategy prototyping (JS / Node)
* 🕒 Scheduled quote scraping in Node.js
* 🖥️ Ad-hoc quotes from the terminal / 🤖 a data source for AI tools

---

## Features

- ✅ **Zero dependencies**, runs in both the browser and Node.js 18+; ships both **ESM** and **CommonJS**
- ✅ **Namespaced API**: `sdk.quotes.cn()` / `sdk.kline.cn()` / `sdk.options.etf.dailyKline()`, grouped by domain, great IDE autocomplete
- ✅ **Unified symbol model**: `string` as a first-class input — `sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` are all parsed tolerantly
- ✅ **A-shares / HK / US / mutual funds**: real-time quotes, daily/weekly/monthly K-lines, minute K-lines (1/5/15/30/60), intraday time-series
- ✅ **Technical indicators**: MA / MACD / BOLL / KDJ / RSI / WR / BIAS / CCI / ATR / OBV / ROC / DMI / SAR / KC
- ✅ **Signals / screener / backtest**: `calcSignals` (golden/death cross, overbought/oversold, etc.), a chainable screener, local backtesting
- ✅ **Futures / options / fund flow / dragon-tiger list / northbound / block trades / margin / limit-up pool** and more
- ✅ **Mutual-fund deep data**: NAV history, intraday estimates, peer-ranking trends, fund/ETF dividends
- ✅ **Subpath exports**: `stock-sdk/{indicators,signals,symbols,screener,cache,errors}` — pure-compute imports don't pull in the network layer (tree-shake friendly)
- ✅ **Unified error system**: only `SdkError` is thrown to callers, each with a stable `code`, importable from `stock-sdk/errors`
- ✅ **Request governance**: per-provider retry / rate-limit / circuit-breaker + injectable `fetchImpl` / `signal` / lifecycle `hooks`
- ✅ **CLI**: `stock-sdk quote 600519` to pull quotes straight from the terminal
- ✅ **Built-in MCP server**: `stock-sdk mcp` wires up Cursor / Claude / Codex and other AI tools in one line (hand-written, zero deps, no `@modelcontextprotocol/sdk`)

---

## Installation

```bash
# Latest (v2: namespaced API / CLI / MCP)
npm install stock-sdk

# v1 legacy (frozen, critical fixes only)
npm install stock-sdk@legacy
```

## Quick start

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Namespaced API (v2) — symbol input is tolerant: '600519' / 'sh600519' / '600519.SH' all work
const quotes = await sdk.quotes.cnSimple(['sh000001', 'sz000858', 'sh600519']);
quotes.forEach((q) => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});

// History K-line + technical indicators
const kline = await sdk.kline.withIndicators('600519', {
  period: 'daily',
  indicators: { ma: { periods: [5, 10, 20] }, macd: {} },
});

// Whole-market A-share quotes (5000+ stocks, built-in concurrency control)
const all = await sdk.batch.cn({ concurrency: 5 });
console.log(`${all.length} stocks`);
```

> HK `'00700'` / `'hk00700'`, US `'AAPL'` / `'105.AAPL'` — all normalized by `normalizeSymbol`.

---

## Command line (CLI)

After install you get the `stock-sdk` command (or use `npx`):

```bash
# Quotes (market auto-detected from the code)
npx stock-sdk quote 600519 00700 AAPL
# K-line with output truncation
npx stock-sdk kline 600519 --period weekly --limit 30
# With technical indicators
npx stock-sdk indicators 600519 --ma 5,10,20 --macd
# Search
npx stock-sdk search 茅台
# Direct access to any namespace method
npx stock-sdk quotes cn sh600519 sz000001
```

JSON output by default; add `--format table|csv`, `--pretty`, `--limit N`.

---

## 🤖 AI / MCP integration

v2 ships a built-in, zero-dependency MCP server — start it with one command:

```bash
npx stock-sdk mcp
```

Wire it into Cursor / Claude Desktop / Codex / Gemini, etc. (`mcpServers` config):

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

`STOCK_SDK_MCP_TOOLS=core|full|<comma-separated tool names>` controls the tool set (default `core`).

👉 [Full MCP docs](https://stock-sdk.linkdiary.cn/en/mcp/)

---

## Signals / screener / backtest

```ts
import { calcSignals } from 'stock-sdk/signals';
import { screen, backtest } from 'stock-sdk/screener';

// Event detection (golden/death cross, overbought/oversold) on indicator-enriched K-lines
const signals = calcSignals(klineWithIndicators, {
  ma: { fast: 5, slow: 20 },
  rsi: {},
});

// Chainable screening over any quote array — purely local, no network
const picks = screen(allQuotes)
  .where((q) => q.pe != null && q.pe < 20)
  .where((q) => q.changePercent > 3)
  .sortBy((q) => q.amount)
  .top(20);

// Local backtest
const report = backtest({
  klines,
  strategy: (bar, i, all) => 'hold', // return 'buy' | 'sell' | 'hold'
});
console.log(report.totalReturn, report.winRate, report.maxDrawdown);
```

---

## Request governance & errors

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
  // v2 only throws SdkError, each carrying a stable code
  if (error instanceof HttpError) console.log(error.status, error.statusText);
  console.log(getSdkErrorCode(error)); // HTTP_ERROR / NETWORK_ERROR / TIMEOUT / ABORTED / PARSE_ERROR ...
}
```

---

## Subpath exports

For pure-compute use (indicators / symbols / signals / screener), import from a subpath so the bundle doesn't pull in `RequestClient` or any provider:

```ts
// 14 indicators, 17 pure functions in total (the MA family ships calcSMA /
// calcEMA / calcWMA variants): calcSMA / calcEMA / calcWMA / calcMA /
// calcMACD / calcBOLL / calcKDJ / calcRSI / calcWR / calcBIAS / calcCCI /
// calcATR / calcOBV / calcROC / calcDMI / calcSAR / calcKC
import { calcMACD, calcKDJ } from 'stock-sdk/indicators';
import { normalizeSymbol, toTencentSymbol } from 'stock-sdk/symbols';
import { calcSignals } from 'stock-sdk/signals';
import { screen, backtest } from 'stock-sdk/screener';
import { MemoryCacheStore, cacheThrough } from 'stock-sdk/cache';
import { SdkError, isSdkError, getSdkErrorCode } from 'stock-sdk/errors';
```

---

## Market coverage matrix

Coverage varies by market — this table helps you quickly check whether the SDK fits your scenario.

- ✅ Supported ｜ ⚠️ Partial (see notes) ｜ ❌ Not yet ｜ — Not applicable

| Capability | A-share | HK | US | Mutual fund | Futures | Options |
|------|:----:|:----:|:----:|:--------:|:----:|:----:|
| Real-time quotes | ✅ | ✅ | ✅ | ✅ | ✅ global | ✅ ETF / CFFEX / commodity |
| History K-line (D/W/M) | ✅ | ✅ | ✅ | ⚠️ listed ETF/LOF | ✅ domestic + global | ✅ |
| Minute K-line (5/15/30/60) | ✅ | ✅ `kline.hkMinute` | ✅ `kline.usMinute` | ⚠️ listed ETF/LOF | ❌ | ❌ |
| Intraday (1-min) | ✅ `quotes.timeline` | ✅ `kline.hkMinute`(period='1') | ✅ `kline.usMinute`(period='1') | ⚠️ listed ETF/LOF | ❌ | ✅ ETF options |
| Dividends | ✅ | ❌ | ❌ | ✅ fund + ETF | — | — |
| Fund flow | ✅ stock/market/rank/sector | ❌ | ❌ | — | — | — |
| Sectors (industry / concept) | ✅ | ❌ | ❌ | ❌ | — | — |
| Dragon-tiger list | ✅ | — | — | — | — | ✅ option LHB |
| Stock Connect / northbound | ✅ northbound | ✅ southbound | — | — | — | — |
| Block trades / margin | ✅ | ❌ | ❌ | — | — | — |
| Limit-up pool / abnormal moves | ✅ | — | — | — | — | — |
| Code list / batch quotes | ✅ 5000+ | ✅ | ✅ | ✅ codes | ❌ | ❌ |
| Inventory data | — | — | — | — | ✅ domestic + COMEX | — |
| Trading calendar | ✅ `calendar.*` | ⚠️ market status only | ⚠️ market status only | — | — | — |

> **Data latency**: real-time quotes come from public endpoints (Tencent Finance / Eastmoney, etc.), **not exchange matching feeds** — typically delayed by seconds to minutes. Not suitable for high-frequency trading decisions.

---

## API overview (namespaces)

💡 Full API in the [documentation](https://stock-sdk.linkdiary.cn/en/api/). In v2, every method lives under a namespace:

| Namespace | Representative methods |
|---|---|
| `sdk.quotes` | `.cn` / `.cnSimple` / `.hk` / `.us` / `.fund` / `.fundFlow` / `.largeOrder` / `.timeline` |
| `sdk.codes` | `.cn` / `.us` / `.hk` / `.fund` |
| `sdk.batch` | `.cn` / `.hk` / `.us` / `.byCodes` / `.raw` |
| `sdk.kline` | `.cn` / `.cnMinute` / `.hk` / `.hkMinute` / `.us` / `.usMinute` / `.withIndicators` |
| `sdk.board` | `.industry.*` / `.concept.*` (`list` / `spot` / `constituents` / `kline` / `minuteKline`) |
| `sdk.options` | `.index.*` / `.etf.*` / `.commodity.*` / `.cffex.*` / `.lhb` |
| `sdk.futures` | `.kline` / `.globalSpot` / `.globalKline` / `.inventory` / `.comexInventory` … |
| `sdk.fundFlow` | `.individual` / `.market` / `.rank` / `.sectorRank` / `.sectorHistory` |
| `sdk.northbound` | `.minute` / `.summary` / `.holdingRank` / `.history` / `.individual` |
| `sdk.marketEvent` | `.ztPool` / `.stockChanges` / `.boardChanges` |
| `sdk.dragonTiger` | `.detail` / `.stockStats` / `.institution` / `.branchRank` / `.seatDetail` |
| `sdk.blockTrade` / `sdk.margin` | block trades / margin trading |
| `sdk.fund` | `.dividendList` / `.navHistory` / `.estimate` / `.rankHistory` / `.profile` |
| `sdk.calendar` | `.isTradingDay` / `.nextTradingDay` / `.prevTradingDay` / `.marketStatus` |
| `sdk.reference` | `.dividendDetail` / `.tradingCalendar` |
| top-level | `sdk.search(keyword)` |

> Indicator math moved from the main package to a subpath: `import { calcMACD } from 'stock-sdk/indicators'`.
> Migrating from the v1 flat API? See the [v1 → v2 migration guide](https://stock-sdk.linkdiary.cn/en/guide/migration-v1-to-v2) (with the full `sdk.getXxx()` → `sdk.<ns>.<method>()` mapping).

---

## Dev checks

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration:smoke   # smoke integration (real network)
pnpm test:integration:full    # full integration regression
```

---

## License

[ISC](./LICENSE)

---

🌐 [Website](https://stock-sdk.linkdiary.cn) | 📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Demo](https://stock-sdk.linkdiary.cn/playground/) | 🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

If this project helps you, a Star ⭐ or an Issue is very welcome.
