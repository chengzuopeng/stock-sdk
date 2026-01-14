---
layout: home

hero:
  name: Stock SDK
  text: Frontend Stock Quote SDK
  tagline: Zero-dependency, lightweight SDK for browser and Node.js to get real-time quotes and K-line data for A-Share / HK / US stocks and funds
  image:
    src: /logo.svg
    alt: Stock SDK
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: Playground
      link: /en/playground/
    - theme: alt
      text: Stock Dashboard
      link: https://chengzuopeng.github.io/stock-dashboard/
    - theme: alt
      text: GitHub
      link: https://github.com/chengzuopeng/stock-sdk

features:
  - icon:
      src: /icons/rocket.svg
    title: Zero Dependencies
    details: Pure TypeScript, no third-party dependencies, < 20KB minified
  - icon:
      src: /icons/globe.svg
    title: Dual Runtime
    details: Supports both browser and Node.js 18+, ESM / CJS dual format
  - icon:
      src: /icons/chart-bar.svg
    title: Multi-Market
    details: A-Share, HK, US stocks and mutual funds real-time quotes and historical K-line data
  - icon:
      src: /icons/trending-up.svg
    title: Technical Indicators
    details: Built-in MA, MACD, BOLL, KDJ, RSI, WR, BIAS, CCI, ATR and more
  - icon:
      src: /icons/coins.svg
    title: Extended Data
    details: Fund flow, large order ratio, batch market quotes and more
  - icon:
      src: /icons/code.svg
    title: TypeScript
    details: Complete type definitions, smart hints, excellent DX
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

## 📦 Get Stock Quotes in 10 Lines

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Get A-Share real-time quotes
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
```

## 🌟 Why Stock SDK?

If you're a frontend engineer, you may have encountered these problems:

- Most stock tools are **Python ecosystem**, hard to use directly in frontend
- Want to build a quote dashboard / demo without maintaining a backend
- Financial APIs return messy formats, complex encoding (GBK / concurrency / batch)
- AkShare is powerful, but not suitable for browser or Node.js projects

**Stock SDK's goal is simple:**

> Let frontend engineers elegantly get stock quote data using familiar JavaScript / TypeScript.

## 🎯 Use Cases

- 📊 Stock quote dashboard ([Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/))
- 📈 Data visualization (ECharts / TradingView)
- 🎓 Stock / finance course demos
- 🧪 Quantitative strategy prototyping (JS / Node)
- 🕒 Node.js scheduled quote fetching

---

🌐 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 🎮 [Playground](https://stock-sdk.linkdiary.cn/playground)

