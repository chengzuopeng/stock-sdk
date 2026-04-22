---
layout: home

hero:
  name: Stock SDK
  text: Stock Market SDK for Browser and Node.js
  tagline: Zero dependencies, Lightweight distribution, and a single API for quotes, K-line, indicators, futures, options, and AI / MCP workflows
  image:
    src: /logo.svg
    alt: Stock SDK
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: API Docs
      link: /en/api
    - theme: alt
      text: AI / MCP
      link: /en/mcp/
    - theme: alt
      text: Playground
      link: /en/playground/
    - theme: alt
      text: GitHub
      link: https://github.com/chengzuopeng/stock-sdk

features:
  - icon:
      src: /icons/rocket.svg
    title: Zero Dependencies
    details: Pure TypeScript implementation with zero runtime dependencies and a lightweight distribution for browser and Node.js
  - icon:
      src: /icons/globe.svg
    title: Multi-market Coverage
    details: Covers A-share, HK, US, mutual funds, domestic futures, global futures, and multiple option workflows
  - icon:
      src: /icons/chart-bar.svg
    title: From Quotes to Analysis
    details: Real-time quotes, K-line, timeline, sector data, dividend details, trading calendar, and batch APIs
  - icon:
      src: /icons/trending-up.svg
    title: Built-in Indicators
    details: Includes MA, MACD, BOLL, KDJ, RSI, WR, BIAS, CCI, ATR, OBV, ROC, DMI, SAR, and KC
  - icon:
      src: /icons/brain.svg
    title: AI / MCP Ready
    details: Ships with a companion MCP Server for Cursor, Claude, Gemini, and other agent workflows
  - icon:
      src: /icons/coins.svg
    title: Request Governance
    details: Supports retry, rateLimit, circuitBreaker, and providerPolicies for provider-level request control
  - icon:
      src: /icons/code.svg
    title: TypeScript
    details: Complete typings and the same API shape across browser and Node.js use cases
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #f87171 30%, #fb923c);
}

.dark {
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #fca5a5 30%, #fdba74);
}
</style>

## Get Quotes in 10 Lines

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach((item) => {
  console.log(`${item.name}: ${item.price} (${item.changePercent}%)`);
});
```

## Apply Provider-level Governance

```ts
const sdk = new StockSDK({
  timeout: 8000,
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: {
        requestsPerSecond: 3,
        maxBurst: 3,
      },
    },
    tencent: {
      rateLimit: {
        requestsPerSecond: 8,
        maxBurst: 16,
      },
    },
  },
});
```

## Good Fits

- Frontend quote dashboards and charting
- Node.js scheduled jobs and trading-day workflows
- Quant prototypes and indicator analysis
- Futures, options, and dividend event dashboards
- AI agents that need live market data through MCP

## Continue Reading

- [Quick Start](/en/guide/getting-started)
- [Request Governance](/en/guide/request-governance)
- [Futures & Options](/en/guide/futures-options)
- [Dividend & Calendar](/en/guide/dividend-calendar)
- [API Overview](/en/api/)
