---
layout: home

hero:
  name: Stock SDK
  text: 面向浏览器与 Node.js 的全栈财经数据 SDK
  tagline: 一仓双包：零依赖双端 stock-sdk + 多源高可用 Node 增强版 stock-node-sdk —— 行情、K 线、财报、7×24 快讯公告、指标信号、选股回测，外加 CLI 与内置 MCP。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: Node 增强版
      link: /guide/node-sdk
    - theme: alt
      text: 在线体验
      link: /playground/

features:
  - icon:
      src: /icons/boxes.svg
      wrap: true
    title: 命名空间 API
    details: sdk.quotes.cn() / sdk.kline.cn() / sdk.financial.indicators() / sdk.options.etf.dailyKline()，按领域组织，告别扁平长方法名。
  - icon:
      src: /icons/package.svg
      wrap: true
    title: 一仓双包 · 零依赖双端 & Node 多源增强
    details: 前端直连用零依赖 stock-sdk；Node 服务端切换 stock-node-sdk 即享多源自动容错、代理池、磁盘缓存与财报/快讯/巨潮公告，API 100% 超集兼容。
  - icon:
      src: /icons/file-check.svg
      wrap: true
    title: 统一数据契约与多源容错
    details: 统一 Quote / K-line / 财报与快讯 Schema，屏蔽多源字段与单位差异；支持能力过滤、健康度冷却与 withMeta() 并发安全溯源。
  - icon:
      src: /icons/activity.svg
      wrap: true
    title: 指标、筹码与信号
    details: 14 个内置技术指标 + 筹码分布 CYQ + 信号识别（金叉 / 死叉 / 超买 / 超卖），支持 subpath 纯计算按需引入。
  - icon:
      src: /icons/filter.svg
      wrap: true
    title: 选股与回测
    details: 基于全市场行情、板块、资金流的声明式链式选股器，以及纯计算、可复现的本地回测引擎。
  - icon:
      src: /icons/terminal.svg
      wrap: true
    title: CLI 与 MCP
    details: stock-sdk（94 命令 / 93 工具）与 stock-node-sdk（105 命令 / 104 工具，支持 --source / --proxy / --cache-dir）一键终端取数或接入 AI。
---

<div class="home-quick">

<p class="home-quick-kicker">// QUICK START · 浏览器零依赖 / Node 多源增强三行接入</p>

::: code-group

```ts [stock-sdk（浏览器 + Node 零依赖）]
// npm i stock-sdk
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const [quote] = await sdk.quotes.cn(['600519']) // 贵州茅台实时行情
```

```ts [stock-node-sdk（Node 多源容错 + 财报快讯 · Beta）]
// npm i stock-node-sdk@beta
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk'

const sdk = new StockNodeSDK({ cache: { store: new FileCacheStore({ dir: './.stock-cache' }) } })
const { data: quotes, trace } = await sdk.withMeta(() => sdk.quotes.cn(['600519'])) // 腾讯→新浪→东财自动容错
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 })
```

:::

</div>
