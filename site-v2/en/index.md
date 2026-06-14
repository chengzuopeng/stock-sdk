---
layout: home

hero:
  name: Stock SDK
  text: Stock market SDK for browser + Node.js
  tagline: Zero-dependency and lightweight — quotes, K-line, indicators & signals, screener & backtest, plus a CLI and a built-in MCP server for AI.
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: Playground
      link: /en/playground/

features:
  - icon:
      src: /icons/boxes.svg
      wrap: true
    title: Namespaced API
    details: sdk.quotes.cn() / sdk.kline.cn() / sdk.options.etf.dailyKline() — organized by domain, no more flat long method names.
  - icon:
      src: /icons/package.svg
      wrap: true
    title: Zero-dependency · Dual-runtime
    details: Zero runtime dependencies, runs in the browser and Node.js 18+; ESM + CJS with subpath imports.
  - icon:
      src: /icons/file-check.svg
      wrap: true
    title: Unified data contract
    details: A unified Quote model with base fields (symbol / market / timestamp / tz) — consistent units and a discriminated union.
  - icon:
      src: /icons/activity.svg
      wrap: true
    title: Indicators & signals
    details: 14 built-in indicators plus a signal layer (golden/death cross, overbought/oversold), imported on demand from stock-sdk/indicators and stock-sdk/signals.
  - icon:
      src: /icons/filter.svg
      wrap: true
    title: Screener & backtest
    details: A declarative screener over market-wide quotes, boards and capital flow, plus a local, reproducible backtest engine.
  - icon:
      src: /icons/terminal.svg
      wrap: true
    title: CLI & MCP
    details: The stock-sdk CLI fetches quotes from your terminal; stock-sdk mcp starts a built-in MCP server for AI tools — neither affects the main package size or its zero-dependency footprint.
---

<div class="home-quick">

<p class="home-quick-kicker">// QUICK START · market data in three lines</p>

<div class="home-quick-grid">

```bash
# install (zero-dependency, from ~10KB gzip)
npm i stock-sdk
```

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const [quote] = await sdk.quotes.cn(['600519']) // Kweichow Moutai
```

</div>

</div>
