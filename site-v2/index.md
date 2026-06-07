---
layout: home

hero:
  name: Stock SDK
  text: v2 · 命名空间 API
  tagline: 零依赖的浏览器 / Node.js 股票行情 SDK —— 行情、K线、技术指标与信号、选股回测，外加 CLI 与内置 MCP。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/
    - theme: alt
      text: 从 v1 迁移
      link: /guide/migration-v1-to-v2

features:
  - icon: 🧭
    title: 命名空间 API
    details: sdk.quotes.cn() / sdk.kline.cn() / sdk.options.etf.dailyKline()，按领域组织，告别扁平长方法名。
  - icon: 📦
    title: 零依赖 · 双端
    details: 运行时零依赖，浏览器与 Node.js 18+ 双端可用；ESM + CJS，支持 subpath 按需导入。
  - icon: 🪙
    title: 统一数据契约
    details: 统一 Quote 模型与基础字段（symbol / market / timestamp / tz），口径规整、类型可辨识。
  - icon: 📈
    title: 指标与信号
    details: 14 个内置技术指标 + 信号层（金叉 / 死叉 / 超买 / 超卖），从 stock-sdk/indicators 与 stock-sdk/signals 按需引入。
  - icon: 🧪
    title: 选股与回测
    details: 基于全市场行情、板块、资金流的声明式选股器，以及本地回测引擎（纯计算、可复现）。
  - icon: 🛠️
    title: CLI 与 MCP
    details: stock-sdk 命令行直接取行情；stock-sdk mcp 一键启动内置 MCP 服务接入 AI 工具——均不影响主包体积与零依赖。
---
