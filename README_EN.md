# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://www.npmjs.com/package/stock-sdk-mcp)
[![AI Ready](https://img.shields.io/badge/AI-Ready-orange)](https://stock-sdk.linkdiary.cn/en/mcp/)

English | **[中文](./README.md)**

A **stock market data JavaScript SDK for frontend and Node.js**.

No Python. No backend service. Fetch real-time quotes and K-line data for **A-shares / Hong Kong stocks / US stocks / mutual funds** directly in **the browser or Node.js**.

**✨ Zero dependencies | 🌐 Browser + Node.js | 📦 Lightweight distribution | 🧠 Full TypeScript typings**

## Documentation

👉🏻 [Documentation](https://stock-sdk.linkdiary.cn/)

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Demo](https://stock-sdk.linkdiary.cn/playground/)

🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/): A stock market dashboard demo built with stock-sdk. Feel free to try it.

## Why stock-sdk?

If you're a frontend engineer, you may have encountered these problems:

* Most stock market tools are in the **Python ecosystem**, making them hard to use directly in frontend
* You want to build a quote dashboard / demo without maintaining an extra backend service
* Financial APIs return messy formats with complex encoding (GBK / concurrency / batch)
* AkShare is powerful, but not suitable for browser or Node.js projects

**The goal of stock-sdk is simple:**

> Let frontend engineers elegantly fetch stock market data using familiar JavaScript / TypeScript.

---

## Use Cases

* 📊 Stock quote dashboards (Web / Admin)
* 📈 Data visualization (ECharts / TradingView)
* 🎓 Stock / finance course demos
* 🧪 Quantitative strategy prototyping (JS / Node)
* 🕒 Scheduled quote fetching via Node.js

---

## Features

- ✅ **Zero dependencies**, lightweight distribution
- ✅ Works in both **browser** and **Node.js 18+**
- ✅ Provides both **ESM** and **CommonJS** module formats
- ✅ Complete **TypeScript** type definitions and unit test coverage
- ✅ Real-time quotes for **A-shares, HK stocks, US stocks, mutual funds**
- ✅ **Historical K-line** (daily/weekly/monthly), **minute K-line** (1/5/15/30/60 minutes), and **today's timeline** data
- ✅ **Technical indicators**: Built-in MA, MACD, BOLL, KDJ, RSI, WR, BIAS, CCI, ATR, OBV, ROC, DMI, SAR, and KC
- ✅ **Futures data**: Domestic futures K-line, global futures real-time quotes & K-line, futures inventory data
- ✅ **Options data**: CFFEX index options, SSE ETF options, commodity options (T-quotes / K-line / minute data)
- ✅ Extended data such as **fund flow**, **large order ratio**
- ✅ Get full **A-share code list** (5000+ stocks) and batch fetch **whole-market quotes** (with built-in concurrency control)
- ✅ Supports **provider-level retry / rate limit / circuit breaker overrides** while keeping legacy global config compatible
- ✅ **AI / MCP Ready** — Companion [stock-sdk-mcp](https://www.npmjs.com/package/stock-sdk-mcp) MCP Server, one command to integrate with Cursor / Claude / Gemini and more

## Installation

```bash
npm install stock-sdk
# or
yarn add stock-sdk
# or
pnpm add stock-sdk
```

## Quick Start (10-line Demo)

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const quotes = await sdk.getSimpleQuotes([
  'sh000001',
  'sz000858',
  'sh600519',
]);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
```

## Example: Whole-market A-share Quotes

Fetch the entire A-share market (5000+ stocks) directly from the frontend, with no Python or backend service.

```ts
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});

console.log(`Fetched ${allQuotes.length} stocks`);
```

## Request Governance & Error Codes

```ts
import { StockSDK, HttpError, getSdkErrorCode } from 'stock-sdk';

const sdk = new StockSDK({
  retry: { maxRetries: 2, baseDelay: 500 },
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: { requestsPerSecond: 3, maxBurst: 3 },
    },
  },
});

try {
  await sdk.getSimpleQuotes(['sh600519']);
} catch (error) {
  if (error instanceof HttpError) {
    console.log(error.status, error.statusText);
  }

  console.log(getSdkErrorCode(error)); // HTTP_ERROR / NETWORK_ERROR / TIMEOUT ...
}
```

`getSdkErrorCode` only standardizes classification. It does not replace the original error instance, so network failures still behave like `TypeError` and timeouts remain compatible with `AbortError` / `DOMException`.

## Development Commands

```bash
yarn typecheck
yarn build
yarn test
yarn test:integration:smoke
# Full integration sweep
yarn test:integration:full
```

## 🤖 AI / MCP Integration

Stock SDK comes with a companion MCP Server ([stock-sdk-mcp](https://www.npmjs.com/package/stock-sdk-mcp)) for seamless integration with popular AI tools:

| AI Tool | Configuration |
|---------|---------------|
| Cursor | `~/.cursor/mcp.json` |
| Claude Desktop | `claude_desktop_config.json` |
| OpenClaw | `~/.clawdbot/config.yaml` |
| Codex CLI | `~/.codex/config.json` |
| Gemini CLI | `~/.gemini/settings.json` |

**Configuration example:**

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

**4 built-in AI Skills:** Technical Analysis / Smart Screener / Market Overview / Real-time Monitor

👉 [Full MCP Documentation](https://stock-sdk.linkdiary.cn/en/mcp/)

---

## API List

💡 For detailed API documentation, please visit [https://stock-sdk.linkdiary.cn/](https://stock-sdk.linkdiary.cn/)

### Real-time Quotes

| Method | Description |
|--------|-------------|
| `getFullQuotes` | Full quotes for A-shares / indices |
| `getSimpleQuotes` | Simple quotes for A-shares / indices |
| `getHKQuotes` | HK stock quotes |
| `getUSQuotes` | US stock quotes |
| `getFundQuotes` | Mutual fund quotes |

### K-line Data

| Method | Description |
|--------|-------------|
| `getHistoryKline` | A-share historical K-line (daily/weekly/monthly) |
| `getHKHistoryKline` | HK stock historical K-line (daily/weekly/monthly) |
| `getUSHistoryKline` | US stock historical K-line (daily/weekly/monthly) |
| `getMinuteKline` | A-share minute K-line (1/5/15/30/60 minutes) |
| `getTodayTimeline` | A-share today's timeline |

### Technical Indicators

| Method | Description |
|--------|-------------|
| `getKlineWithIndicators` | Get K-line data with technical indicators |
| `calcMA` | Calculate moving average (SMA/EMA/WMA) |
| `calcMACD` | Calculate MACD |
| `calcBOLL` | Calculate Bollinger Bands |
| `calcKDJ` | Calculate KDJ |
| `calcRSI` | Calculate RSI |
| `calcWR` | Calculate Williams %R |
| `calcBIAS` | Calculate BIAS |
| `calcCCI` | Calculate Commodity Channel Index |
| `calcATR` | Calculate Average True Range |
| `calcOBV` | Calculate On Balance Volume |
| `calcROC` | Calculate Rate of Change |
| `calcDMI` | Calculate Directional Movement Index |
| `calcSAR` | Calculate Parabolic SAR |
| `calcKC` | Calculate Keltner Channel |

### Industry Sectors

| Method | Description |
|--------|-------------|
| `getIndustryList` | Industry sector name list |
| `getIndustrySpot` | Industry sector real-time quotes |
| `getIndustryConstituents` | Industry sector constituents |
| `getIndustryKline` | Industry sector historical K-line (daily/weekly/monthly) |
| `getIndustryMinuteKline` | Industry sector minute K-line (1/5/15/30/60 minutes) |

### Concept Sectors

| Method | Description |
|--------|-------------|
| `getConceptList` | Concept sector name list |
| `getConceptSpot` | Concept sector real-time quotes |
| `getConceptConstituents` | Concept sector constituents |
| `getConceptKline` | Concept sector historical K-line (daily/weekly/monthly) |
| `getConceptMinuteKline` | Concept sector minute K-line (1/5/15/30/60 minutes) |

### Futures

| Method | Description |
|--------|-------------|
| `getFuturesKline` | Domestic futures historical K-line (daily/weekly/monthly) |
| `getGlobalFuturesSpot` | Global futures real-time quotes |
| `getGlobalFuturesKline` | Global futures historical K-line (daily/weekly/monthly) |
| `getFuturesInventorySymbols` | Futures inventory symbol list |
| `getFuturesInventory` | Futures inventory data |
| `getComexInventory` | COMEX gold/silver inventory |

### Options

| Method | Description |
|--------|-------------|
| `getIndexOptionSpot` | CFFEX index option T-quotes (calls + puts) |
| `getIndexOptionKline` | Index option contract daily K-line |
| `getCFFEXOptionQuotes` | All CFFEX option real-time quotes |
| `getETFOptionMonths` | SSE ETF option expiration months |
| `getETFOptionExpireDay` | ETF option expiration date & remaining days |
| `getETFOptionMinute` | ETF option intraday minute data |
| `getETFOptionDailyKline` | ETF option historical daily K-line |
| `getETFOption5DayMinute` | ETF option 5-day minute data |
| `getCommodityOptionSpot` | Commodity option T-quotes |
| `getCommodityOptionKline` | Commodity option contract daily K-line |
| `getOptionLHB` | Option leaderboard (龙虎榜) |

### Extended Data

| Method | Description |
|--------|-------------|
| `getFundFlow` | Fund flow |
| `getPanelLargeOrder` | Large order ratio |
| `getTradingCalendar` | A-share trading calendar |

### Batch Query

| Method | Description |
|--------|-------------|
| `getAShareCodeList` | Get all A-share codes |
| `getUSCodeList` | Get all US stock codes |
| `getHKCodeList` | Get all HK stock codes |
| `getAllAShareQuotes` | Get whole-market A-share quotes |
| `getAllHKShareQuotes` | Get whole-market HK stock quotes |
| `getAllUSShareQuotes` | Get whole-market US stock quotes |
| `getAllQuotesByCodes` | Batch fetch quotes for specified stocks |

### Search

| Method | Description |
|--------|-------------|
| `search` | Search stocks by code/name/pinyin |

---

## License

[ISC](./LICENSE)

---

🌐 [Website](https://stock-sdk.linkdiary.cn) | 📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [Live Demo](https://stock-sdk.linkdiary.cn/playground) | 🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

If this project helps you, feel free to Star ⭐ or open an Issue for feedback.
