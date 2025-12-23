---
layout: home

hero:
  name: Stock SDK
  text: 前端股票行情 SDK
  tagline: 为前端和 Node.js 设计，零依赖、轻量级，获取 A 股 / 港股 / 美股 / 公募基金 实时行情与 K 线数据
  image:
    src: /logo.svg
    alt: Stock SDK
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
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
    details: 纯 TypeScript 实现，无第三方依赖，压缩后仅 < 20KB
  - icon:
      src: /icons/globe.svg
    title: 双端运行
    details: 同时支持浏览器和 Node.js 18+ 环境，ESM / CJS 双格式
  - icon:
      src: /icons/chart-bar.svg
    title: 多市场支持
    details: A 股、港股、美股、公募基金实时行情与历史 K 线数据
  - icon:
      src: /icons/trending-up.svg
    title: 技术指标
    details: 内置 MA、MACD、BOLL、KDJ、RSI、WR 等常用技术指标计算
  - icon:
      src: /icons/coins.svg
    title: 扩展数据
    details: 资金流向、盘口大单、全市场批量行情等扩展功能
  - icon:
      src: /icons/code.svg
    title: TypeScript
    details: 完整的类型定义，智能提示，开发体验极佳
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #10b981 30%, #3b82f6);
}

.dark {
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #34d399 30%, #60a5fa);
}
</style>

## 📦 10 行代码获取股票行情

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 获取 A 股实时行情
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
```

## 🌟 为什么选择 Stock SDK？

如果你是前端工程师，可能遇到过这些问题：

- 股票行情工具大多是 **Python 生态**，前端难以直接使用
- 想做行情看板 / Demo，不想额外维护后端服务
- 财经接口返回格式混乱、编码复杂（GBK / 并发 / 批量）
- AkShare 很强，但并不适合浏览器或 Node.js 项目

**Stock SDK 的目标很简单：**

> 让前端工程师，用最熟悉的 JavaScript / TypeScript，优雅地获取股票行情数据。

## 🎯 使用场景

- 📊 股票行情看板（Web / Admin）
- 📈 数据可视化（ECharts / TradingView）
- 🎓 股票 / 金融课程 Demo
- 🧪 量化策略原型验证（JS / Node）
- 🕒 Node.js 定时抓取行情数据
