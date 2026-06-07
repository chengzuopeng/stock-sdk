---
layout: home

hero:
  name: Stock SDK
  text: v2 · Namespaced API
  tagline: Zero-dependency stock market SDK for browser & Node.js — quotes, K-line, indicators & signals, screener & backtest, plus a CLI and a built-in MCP server.
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: API Reference
      link: /en/api/
    - theme: alt
      text: Migrate from v1
      link: /en/guide/migration-v1-to-v2

features:
  - icon: 🧭
    title: Namespaced API
    details: sdk.quotes.cn() / sdk.kline.cn() / sdk.options.etf.dailyKline() — organized by domain, no more flat long method names.
  - icon: 📦
    title: Zero-dependency · Dual-runtime
    details: Zero runtime dependencies, runs in the browser and Node.js 18+; ESM + CJS with subpath imports.
  - icon: 🪙
    title: Unified data contract
    details: A unified Quote model with base fields (symbol / market / timestamp / tz) — consistent units and a discriminated union.
  - icon: 📈
    title: Indicators & signals
    details: 14 built-in indicators plus a signal layer (golden/death cross, overbought/oversold), imported on demand from stock-sdk/indicators and stock-sdk/signals.
  - icon: 🧪
    title: Screener & backtest
    details: A declarative screener over market-wide quotes, boards and capital flow, plus a local, reproducible backtest engine.
  - icon: 🛠️
    title: CLI & MCP
    details: The stock-sdk CLI fetches quotes from your terminal; stock-sdk mcp starts a built-in MCP server for AI tools — neither affects the main package size or its zero-dependency footprint.
---
