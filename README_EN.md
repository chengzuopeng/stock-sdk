# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg?label=stock-sdk)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://stock-sdk.linkdiary.cn/en/mcp/)
[![AI Ready](https://img.shields.io/badge/AI-Ready-orange)](https://stock-sdk.linkdiary.cn/en/mcp/)

English | **[中文](./README.md)**

A **full-stack stock & financial market data TypeScript SDK family for browser and Node.js** (two packages in one monorepo).

No Python required. Fetch **A-shares / Hong Kong stocks / US stocks / mutual funds / futures / options / financial statements / 24/7 news flashes / official announcements** with unified TypeScript schemas in **the browser or Node.js**. Both packages ship a **CLI** and an **MCP server** out of the box.

**✨ Two packages: `stock-sdk` (Zero-dep Dual-Runtime) & `stock-node-sdk` (Node Multi-Source Failover) | 📦 ESM + CJS + subpaths | 🧠 Full TypeScript typings | 🖥️ CLI | 🤖 MCP**

> ✨ **v2 Architecture**: Namespaced API, unified symbol model, `Quote` discriminated union, unified error system, CLI / MCP / subpath exports. Upgrading from v1? Read the [v1 → v2 migration guide](https://stock-sdk.linkdiary.cn/en/guide/migration-v1-to-v2) first (**breaking changes, no compat aliases**).

## 📦 Packages: Which One Should I Use?

This pnpm monorepo shares a single core (`@stock-sdk/core`) and publishes two API-aligned packages:

| Package | Runtime | Dependencies | Best For & Highlights | Docs |
|---|---|---|---|---|
| **[`stock-sdk`](./packages/stock-sdk)** | Browser + Node.js 18+ | **Zero** | Lightweight dual-runtime SDK: 94 namespaced methods (quotes/K-line/boards/fund flow/futures/options/funds/chips), 14 technical indicators, signals, screener & backtest, 94-cmd CLI & 93-tool MCP | [Get Started](https://stock-sdk.linkdiary.cn/en/guide/getting-started) |
| **[`stock-node-sdk`](./packages/stock-node-sdk)** | Node.js 18+ Server | `undici` only | **Multi-source high-availability Node edition (strict superset of `stock-sdk`)**: capability-aware `SourceRouter` failover (3-source CN/HK/US quotes; dual-source K-line/batch/dividends/news/announcements), `ProxyPool` / `CookieJar` / `FileCacheStore`; exclusive **`financial`**, **`news`** (24/7 flashes & CNINFO announcements), **`corporate`**, **`bond`** namespaces; 105-cmd CLI (`--source`/`--proxy`/`--cache-dir`) & 104-tool MCP | [Node Enhanced Guide](https://stock-sdk.linkdiary.cn/en/guide/node-sdk) |

## 📖 Official docs

> ## 👉 https://stock-sdk.linkdiary.cn/en/
>
> Dual-package guides, full API reference, Node multi-source & extensions docs, CLI / MCP guides, live Playground, and the v1 → v2 migration guide all live here.
>
> ([v1 stable docs](https://v1.stock-sdk.linkdiary.cn/en/) are archived)

📦 [NPM (`stock-sdk`)](https://www.npmjs.com/package/stock-sdk) | 📦 [NPM (`stock-node-sdk`)](https://www.npmjs.com/package/stock-node-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Playground](https://stock-sdk.linkdiary.cn/playground/)

🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/): A stock market dashboard demo built with stock-sdk. Feel free to try it.

## Why Stock SDK?

Whether you're building a **frontend dashboard** or running **Node.js data services, quant pipelines, or AI Agents**, financial market data in JS/TS has long had rough edges:

* Most stock data libraries live in the **Python ecosystem**
* Frontend demos want zero-backend browser fetches, while Node.js services need `Referer` / `POST` / cookies / proxies / disk caching that browsers cannot do
* Public financial APIs differ wildly in units (shares vs lots, CNY vs 10k CNY vs 100M), encodings (GBK / HTML), and single sources frequently throttle or drop

**Stock SDK solves both cleanly with one unified TypeScript contract:**

> Use zero-dependency `stock-sdk` in the browser, and drop in `stock-node-sdk` on Node.js for multi-source automatic failover plus financials, 24/7 news, and corporate disclosures.

---

## Use cases

* 📊 Web stock quote dashboards & charts (ECharts / TradingView — use `stock-sdk`)
* 🚀 High-availability Node.js market data ingestion, multi-source failover, cron jobs & disk caching (use `stock-node-sdk`)
* 📑 Fundamental research: financial statements, key indicators, performance forecasts/express, 24/7 news & CNINFO announcements (`stock-node-sdk`)
* 🧪 Quant strategy prototyping, indicator signal detection, screening & local backtesting (both packages)
* 🖥️ Terminal CLI lookups / 🤖 MCP data source for Cursor, Claude Desktop, Codex, Gemini, etc.

---

## Features

- ✅ **Two packages, one strict-superset API**: `stock-sdk` (zero-dep browser + Node.js) and `stock-node-sdk` (Node.js 18+ multi-source enhanced edition) — switch with a single import change
- ✅ **Capability-aware multi-source failover (`stock-node-sdk`)**: zero-config automatic failover across Tencent / Sina / Eastmoney / CNINFO with `supports(input)` & `requiredFields` pre-filtering, adaptive cooldown, concurrency-safe `withMeta()` provenance, and `registerAdapter()` extensibility
- ✅ **Node-exclusive domains & transport (`stock-node-sdk`)**: `financial` (indicators / statements / forecasts / express), `news` (24/7 flashes / dual-source announcements), `corporate` (top shareholders / holder counts), `bond` (convertible bonds); built-in `ProxyPool`, `CookieJar`, `SessionManager`, and `FileCacheStore`
- ✅ **Namespaced API**: `sdk.quotes.cn()` / `sdk.kline.cn()` / `sdk.financial.indicators()` / `sdk.options.etf.dailyKline()`, grouped by domain with full TypeScript autocomplete
- ✅ **Unified symbol model**: `string` as a first-class input — `sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` are parsed tolerantly; special indices supported ([symbols guide](https://stock-sdk.linkdiary.cn/en/guide/symbols.html))
- ✅ **A-shares / HK / US / mutual funds**: real-time quotes, daily/weekly/monthly K-lines, minute K-lines (1/5/15/30/60), intraday time-series
- ✅ **Technical indicators & CYQ chip distribution**: 14 built-in indicators (MA/MACD/BOLL/KDJ/RSI/WR/BIAS/CCI/ATR/OBV/ROC/DMI/SAR/KC) + `sdk.chips.cn/hk/us` computed locally
- ✅ **Signals / screener / backtest**: `calcSignals`, chainable screener, and local backtesting
- ✅ **Futures / options / fund flow / dragon-tiger list / northbound / block trades / margin / limit-up pool / mutual-fund deep data**
- ✅ **Subpath exports**: `{indicators,signals,symbols,screener,cache,errors}` (plus `stock-node-sdk/router`) — pure-compute imports stay tree-shake friendly
- ✅ **Unified error system & request governance**: throws `SdkError` with stable `code`; per-provider retry / rate-limit / circuit-breaker + `fetchImpl` / `signal` / `hooks`
- ✅ **Built-in CLI & zero-dependency MCP server**: `stock-sdk` (94 cmds / 93 tools) and `stock-node-sdk` (105 cmds / 104 tools, with `--source` / `--proxy` / `--cache-dir`)

---

## Installation

```bash
# Browser + Node.js zero-dependency edition
npm install stock-sdk

# Node.js 18+ multi-source high-availability edition (Public Beta, recommended for servers / quant / AI Agents)
npm install stock-node-sdk@beta

# v1 legacy (frozen, critical fixes only)
npm install stock-sdk@legacy
```

## Quick start

### 1. Browser / Node.js Zero-Dependency (`stock-sdk`)

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

### 2. Node.js Multi-Source Enhanced (`stock-node-sdk`)

```ts
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk';

const sdk = new StockNodeSDK({
  timeout: 15_000,
  cache: { store: new FileCacheStore({ dir: './.stock-cache' }) },
});

// Automatic Tencent -> Sina -> Eastmoney failover with concurrency-safe provenance
const { data: quotes, trace } = await sdk.withMeta(() =>
  sdk.quotes.cn(['600519', '000001'])
);
console.log(quotes[0].price, 'provider:', trace?.selectedProvider);

// Node-exclusive domains: financials, 24/7 news flashes, CNINFO/Eastmoney announcements
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 });
const flashes = await sdk.news.flash({ pageSize: 10 });
const notices = await sdk.news.announcements({ symbol: '600519', keyword: '分红' });

await sdk.close();
```

> HK `'00700'` / `'hk00700'`, US `'AAPL'` / `'105.AAPL'` — all normalized by `normalizeSymbol`.

---

## Command line (CLI)

Both packages ship a CLI (`stock-sdk` has 94 commands; `stock-node-sdk` has 105 commands plus `--source`, `--proxy`, and `--cache-dir`):

```bash
# Base CLI (zero dependencies)
npx stock-sdk quote 600519 00700 AAPL
npx stock-sdk kline 600519 --period weekly --limit 30
npx stock-sdk indicators 600519 --ma 5,10,20 --macd
npx stock-sdk search 茅台

# Node Enhanced CLI (forced source / proxy / disk cache + financials & news)
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4 --cache-dir ./.stock-cache --pretty
npx stock-node-sdk@beta news flash --pageSize 10
npx stock-node-sdk@beta news announcements --symbol 600519 --keyword 分红
```

The CLI defaults to JSON output and accepts `--format table|csv`, `--pretty`, and `--limit N`. Invalid arguments produce exit code `2`. Run `stock-sdk fundFlow rank --help` or `stock-node-sdk --help` for full flags.

---

## 🤖 AI / MCP integration

Built-in zero-dependency MCP server — start with one command (**for AI clients running on Node.js, `stock-node-sdk mcp` is recommended for all 104 tools, multi-source failover, financials, news & announcements**; use `stock-sdk mcp` if you want the zero-dependency edition):

```bash
npx stock-node-sdk@beta mcp   # Node Enhanced (Beta, 104 tools + multi-source failover, supports --cache-dir / --proxy / --source)
npx stock-sdk mcp        # Zero-dep Base (93 tools)
```

Wire it into Cursor / Claude Desktop / Codex / Gemini, etc. (`mcpServers` config):

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

`STOCK_SDK_MCP_TOOLS=core|full|<comma-separated tool names>` controls the tool set (default `core`).

To expose the full MCP tool set when launching through `npx`, add the `env` entry:

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

MCP validates array entries and nested indicator settings before calling the SDK. It keeps the newest K-lines and signals when results exceed its limits. Fund NAV and peer-rank tools accept `startDate` and `endDate` and report the returned interval in `coverage`. [MCP tool docs](https://stock-sdk.linkdiary.cn/en/mcp/tools)

The SDK ships seven scenario AI Skills as MCP Prompts. `STOCK_SDK_MCP_PROMPTS` selects skills, and the client discovers those that the active tool set can run. Set both the tool and prompt tiers to `full` to use all seven. [AI Skills docs](https://stock-sdk.linkdiary.cn/en/skills/)

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
| Chip distribution (CYQ) | ✅ `chips.cn` | ✅ `chips.hk` | ✅ `chips.us` | — | — | — |
| Intraday (1-min) | ✅ `quotes.timeline` | ✅ `kline.hkMinute`(period='1') | ✅ `kline.usMinute`(period='1') | ⚠️ listed ETF/LOF | ❌ | ✅ ETF options |
| Dividends | ✅ | ✅ *(Node edition)* | ✅ *(Node edition, EM/Nasdaq)* | ✅ fund + ETF | — | — |
| Financials (Indicators / 3 Statements) | ✅ *(Node edition)* | ✅ *(Node edition)* | ✅ *(Node edition, EM/Nasdaq)* | — | — | — |
| Official Announcements | ✅ *(Node: EM/CNINFO)* | ✅ *(Node: HKEXnews)* | ✅ *(Node: SEC EDGAR)* | — | — | — |
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
>
> **K-line fallback**: Regular CN historical and 5/15/30/60-minute K-lines use Eastmoney primarily and fall back to Tencent, then Sina OHLCV when `push2his` is disconnected or soft-limited. To request Eastmoney only, turn this off with `new StockSDK({ klineFallback: false })`.

---

## API overview (namespaces)

💡 Full API in the [documentation](https://stock-sdk.linkdiary.cn/en/api/). In v2, every method lives under a namespace:

| Namespace | Representative methods |
|---|---|
| `sdk.quotes` | `.cn` / `.cnSimple` / `.hk` / `.us` / `.fund` / `.fundFlow` / `.largeOrder` / `.timeline` |
| `sdk.codes` | `.cn` / `.us` / `.hk` / `.fund` |
| `sdk.batch` | `.cn` / `.hk` / `.us` / `.byCodes` / `.raw` |
| `sdk.kline` | `.cn` / `.cnMinute` / `.hk` / `.hkMinute` / `.us` / `.usMinute` / `.withIndicators` / `.signals` |
| `sdk.chips` | `.cn` / `.hk` / `.us` (chip distribution: profit ratio / avg cost / cost ranges / chip peak) |
| `sdk.board` | `.industry.*` / `.concept.*` (`list` / `spot` / `constituents` / `kline` / `minuteKline`) |
| `sdk.options` | `.index.*` / `.etf.*` / `.commodity.*` / `.cffex.*` / `.lhb` |
| `sdk.futures` | `.kline` / `.globalSpot` / `.globalKline` / `.inventory` / `.comexInventory` … |
| `sdk.fundFlow` | `.individual` / `.market` / `.rank` / `.sectorRank` (both rankings support `page` / `pageSize`) / `.sectorHistory` |
| `sdk.northbound` | `.minute` / `.summary` / `.holdingRank` / `.history` / `.individual` |
| `sdk.marketEvent` | `.ztPool` / `.stockChanges` (multi-type / `'all'` / `page` paging) / `.boardChanges` / `.individualChanges` / `.individualChangesHistory` (per-stock changes) / `.unusualFluctuation` (regulatory fluctuation alerts) |
| `sdk.dragonTiger` | `.detail` / `.stockStats` / `.institution` / `.branchRank` / `.seatDetail` |
| `sdk.blockTrade` / `sdk.margin` | block trades / margin trading |
| `sdk.fund` | `.dividendList` / `.navHistory` / `.rankHistory` / `.profile` / `.theme.*` (`getThemeList` / `getThemeFunds`) |
| `sdk.calendar` | `.isTradingDay` / `.nextTradingDay` / `.prevTradingDay` / `.marketStatus` |
| `sdk.reference` | `.dividendDetail` (dual-source Eastmoney/Sina in Node edition) / `.tradingCalendar` |
| top-level | `sdk.search(keyword)` |
| `sdk.financial` *(Node only)* | `.indicators` / `.income` / `.balance` / `.cashflow` / `.forecast` / `.express` |
| `sdk.news` *(Node only)* | `.flash` (Eastmoney/Sina 24/7) / `.announcements` (Eastmoney/CNINFO) |
| `sdk.corporate` *(Node only)* | `.topHolders` / `.holderCount` |
| `sdk.bond` *(Node only)* | `.convertibleList` |

`sdk.quotes.fundFlow(codes)` provides Eastmoney-sourced real-time A-share fund-flow snapshots, including main/small-order inflow, outflow, net amount, and ratios. Use `sdk.fundFlow.*` for history, rankings, and sector flows. See [Node Extensions API](https://stock-sdk.linkdiary.cn/en/api/node-extensions) for Node-exclusive methods and multi-source routing.

> Indicator math moved from the main package to a subpath: `import { calcMACD } from 'stock-sdk/indicators'` (`stock-node-sdk` also exports `stock-node-sdk/router`).
> Migrating from the v1 flat API? See the [v1 → v2 migration guide](https://stock-sdk.linkdiary.cn/en/guide/migration-v1-to-v2) (with the full `sdk.getXxx()` → `sdk.<ns>.<method>()` mapping).

---

## Dev checks

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm docs:check
pnpm test:integration:smoke   # dual-runtime smoke integration (real network)
pnpm test:integration:node    # stock-node-sdk live multi-source integration
pnpm test:integration:full    # full integration regression
```

---

## License

[ISC](./LICENSE)

---

🌐 [Website](https://stock-sdk.linkdiary.cn) | 📦 [NPM (`stock-sdk`)](https://www.npmjs.com/package/stock-sdk) | 📦 [NPM (`stock-node-sdk`)](https://www.npmjs.com/package/stock-node-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Demo](https://stock-sdk.linkdiary.cn/playground/) | 🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

If this project helps you, a Star ⭐ or an Issue is very welcome.
