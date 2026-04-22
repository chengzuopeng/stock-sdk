---
layout: home

hero:
  name: Stock SDK
  text: 面向浏览器与 Node.js 的股票行情 SDK
  tagline: 零依赖、轻量发布包，覆盖 A 股 / 港股 / 美股 / 基金 / 期货 / 期权、K 线、技术指标与 AI / MCP 接入
  image:
    src: /logo.svg
    alt: Stock SDK
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 文档
      link: /api
    - theme: alt
      text: AI / MCP 接入
      link: /mcp/
    - theme: alt
      text: 在线体验
      link: /playground/
    - theme: alt
      text: GitHub
      link: https://github.com/chengzuopeng/stock-sdk

features:
  - icon:
      src: /icons/rocket.svg
    title: 零依赖
    details: 纯 TypeScript 实现，保持零依赖与轻量发布包，适合浏览器和 Node.js 直接接入
  - icon:
      src: /icons/globe.svg
    title: 多市场覆盖
    details: 支持 A 股、港股、美股、公募基金、国内期货、全球期货和多类期权接口
  - icon:
      src: /icons/chart-bar.svg
    title: 行情到分析
    details: 提供实时行情、K 线、分时走势、板块数据、分红派送、交易日历与批量查询
  - icon:
      src: /icons/trending-up.svg
    title: 指标内置
    details: 内置 MA、MACD、BOLL、KDJ、RSI、WR、BIAS、CCI、ATR、OBV、ROC、DMI、SAR、KC
  - icon:
      src: /icons/brain.svg
    title: AI / MCP 就绪
    details: 配套 MCP Server，可接入 Cursor、Claude、Gemini 等 AI 工具，直接消费实时行情数据
  - icon:
      src: /icons/coins.svg
    title: 请求治理
    details: 支持 retry、rateLimit、circuitBreaker 和 providerPolicies，便于按数据源细分策略
  - icon:
      src: /icons/code.svg
    title: TypeScript
    details: 完整类型定义，浏览器与 Node.js 统一调用方式，适合前端看板和服务端任务
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

## 10 行代码获取股票行情

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach((item) => {
  console.log(`${item.name}: ${item.price} (${item.changePercent}%)`);
});
```

## 按数据源做请求治理

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

## 适合的场景

- 前端行情看板和数据可视化
- Node.js 定时抓取与交易日调度
- 量化原型验证和指标分析
- 期货、期权与分红事件驱动的数据面板
- AI Agent / MCP 工具链里的实时报价能力

## 继续阅读

- [快速开始](/guide/getting-started)
- [请求治理](/guide/request-governance)
- [期货与期权](/guide/futures-options)
- [分红与交易日历](/guide/dividend-calendar)
- [API 总览](/api/)
