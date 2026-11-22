---
layout: home

hero:
  name: Stock SDK
  text: Full-stack financial data SDK for browser + Node.js
  tagline: Two packages in one monorepo — zero-dep stock-sdk and multi-source high-availability stock-node-sdk for quotes, K-line, financials, 24/7 news, indicators, screener, CLI & MCP.
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: Node Enhanced
      link: /en/guide/node-sdk
    - theme: alt
      text: Playground
      link: /en/playground/

features:
  - icon:
      src: /icons/boxes.svg
      wrap: true
    title: Namespaced API
    details: sdk.quotes.cn() / sdk.kline.cn() / sdk.financial.indicators() / sdk.options.etf.dailyKline() — organized by domain, no flat long names.
  - icon:
      src: /icons/package.svg
      wrap: true
    title: Dual-package · Zero-dep & Node Multi-Source
    details: Use zero-dep stock-sdk in browsers; switch to stock-node-sdk on Node.js for automatic failover, proxy pool, disk cache, financials, news & announcements.
  - icon:
      src: /icons/file-check.svg
      wrap: true
    title: Unified Schema & Failover
    details: Consistent TypeScript schemas across Tencent, Sina, Eastmoney and CNINFO with capability filtering, adaptive cooldown and withMeta() provenance.
  - icon:
      src: /icons/activity.svg
      wrap: true
    title: Indicators, CYQ & Signals
    details: 14 built-in indicators, CYQ chip distribution, and signal detection (golden/death cross, overbought/oversold) via tree-shakeable subpaths.
  - icon:
      src: /icons/filter.svg
      wrap: true
    title: Screener & Backtest
    details: A declarative chainable screener over market-wide quotes, boards and capital flow, plus a local, reproducible backtest engine.
  - icon:
      src: /icons/terminal.svg
      wrap: true
    title: CLI & MCP
    details: stock-sdk (94 cmds / 93 tools) and stock-node-sdk (105 cmds / 104 tools with --source / --proxy / --cache-dir) for terminals and AI agents.
---

<div class="home-quick">

<p class="home-quick-kicker">// QUICK START · browser zero-dep or Node multi-source in three lines</p>

::: code-group

```ts [stock-sdk (Browser + Node Zero-Dep)]
// npm i stock-sdk
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const [quote] = await sdk.quotes.cn(['600519']) // Kweichow Moutai
```

```ts [stock-node-sdk (Node Multi-Source + Financials · Beta)]
// npm i stock-node-sdk@beta
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk'

const sdk = new StockNodeSDK({ cache: { store: new FileCacheStore({ dir: './.stock-cache' }) } })
const { data: quotes, trace } = await sdk.withMeta(() => sdk.quotes.cn(['600519'])) // Tencent -> Sina -> Eastmoney
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 })
```

:::

</div>
