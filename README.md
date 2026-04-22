# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://www.npmjs.com/package/stock-sdk-mcp)
[![AI Ready](https://img.shields.io/badge/AI-Ready-orange)](https://stock-sdk.linkdiary.cn/mcp/)

**[English](./README_EN.md)** | 中文

为 **前端和 Node.js 设计的股票行情 JavaScript SDK**。

无需 Python、无需后端服务，直接在 **浏览器或 Node.js** 中获取 **A 股 / 港股 / 美股 / 公募基金** 的实时行情与 K 线数据。

**✨ 零依赖 | 🌐 Browser + Node.js | 📦 轻量发布包 | 🧠 完整 TypeScript 类型**

## Documentation

👉🏻 [官方文档](https://stock-sdk.linkdiary.cn/)

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://stock-sdk.linkdiary.cn/playground/)

🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/)：基于 stock-sdk 搭建的股票数据大盘演示站点，欢迎体验。

## Why stock-sdk？

如果你是前端工程师，可能遇到过这些问题：

* 股票行情工具大多是 **Python 生态**，前端难以直接使用
* 想做行情看板 / Demo，不想额外维护后端服务
* 财经接口返回格式混乱、编码复杂（GBK / 并发 / 批量）
* AkShare 很强，但并不适合浏览器或 Node.js 项目

**stock-sdk 的目标很简单：**

> 让前端工程师，用最熟悉的 JavaScript / TypeScript，优雅地获取股票行情数据。

---

## 使用场景

* 📊 股票行情看板（Web / Admin）
* 📈 数据可视化（ECharts / TradingView）
* 🎓 股票 / 金融课程 Demo
* 🧪 量化策略原型验证（JS / Node）
* 🕒 Node.js 定时抓取行情数据

---

## 特性

- ✅ **零依赖**，轻量级发布包
- ✅ 支持 **浏览器** 和 **Node.js 18+** 双端运行
- ✅ 同时提供 **ESM** 和 **CommonJS** 两种模块格式
- ✅ 完整的 **TypeScript** 类型定义和单元测试覆盖
- ✅ **A 股、港股、美股、公募基金**实时行情
- ✅ **历史 K 线**（日/周/月）、**分钟 K 线**（1/5/15/30/60 分钟）和**当日分时走势**数据
- ✅ **技术指标**：内置 MA、MACD、BOLL、KDJ、RSI、WR、BIAS、CCI、ATR、OBV、ROC、DMI、SAR、KC
- ✅ **期货行情**：国内期货 K 线、全球期货实时行情与 K 线、期货库存数据
- ✅ **期权数据**：中金所股指期权、上交所 ETF 期权、商品期权的报价 / K 线 / 分钟行情
- ✅ **资金流向**、**盘口大单**等扩展数据
- ✅ 获取全部 **A 股代码列表**（5000+ 只股票）和批量获取**全市场行情**（内置并发控制）
- ✅ 支持 **provider 级重试 / 限流 / 熔断策略覆盖**，兼容旧的全局请求配置
- ✅ **AI / MCP 就绪** — 配套 [stock-sdk-mcp](https://www.npmjs.com/package/stock-sdk-mcp) MCP Server，一行命令接入 Cursor / Claude / Gemini 等 AI 工具

## 安装

```bash
npm install stock-sdk
# 或
yarn add stock-sdk
# 或
pnpm add stock-sdk
```

## 快速开始（10 行 Demo）

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

## 示例：全市场 A 股行情

前端直接一次性获取全市场 A 股行情（5000+股票），无需 Python 或后端服务。

```ts
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${allQuotes.length} 只股票`);
```

## 🤖 AI / MCP 集成

Stock SDK 配套 MCP Server（[stock-sdk-mcp](https://www.npmjs.com/package/stock-sdk-mcp)），可一键接入主流 AI 工具：

| AI 工具 | 配置方式 |
|---------|---------|
| Cursor | `~/.cursor/mcp.json` |
| Claude Desktop | `claude_desktop_config.json` |
| OpenClaw | `~/.clawdbot/config.yaml` |
| Codex CLI | `~/.codex/config.json` |
| Gemini CLI | `~/.gemini/settings.json` |

**配置示例：**

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

**内置 4 个专业 AI Skills：** 技术分析 / 智能选股 / 市场概览 / 实时监控

👉 [完整 MCP 文档](https://stock-sdk.linkdiary.cn/mcp/)

---

## API 列表

💡 API 详细文档请查阅 [https://stock-sdk.linkdiary.cn/](https://stock-sdk.linkdiary.cn/)

### 实时行情

| 方法 | 说明 |
|------|------|
| `getFullQuotes` | A 股/指数全量行情 |
| `getSimpleQuotes` | A 股/指数简要行情 |
| `getHKQuotes` | 港股行情 |
| `getUSQuotes` | 美股行情 |
| `getFundQuotes` | 公募基金行情 |

### K 线数据

| 方法 | 说明 |
|------|------|
| `getHistoryKline` | A 股历史 K 线（日/周/月） |
| `getHKHistoryKline` | 港股历史 K 线（日/周/月） |
| `getUSHistoryKline` | 美股历史 K 线（日/周/月） |
| `getMinuteKline` | A 股分钟 K 线（1/5/15/30/60 分钟） |
| `getTodayTimeline` | A 股当日分时走势 |

### 技术指标

| 方法 | 说明 |
|------|------|
| `getKlineWithIndicators` | 获取带技术指标的 K 线数据 |
| `calcMA` | 计算均线（SMA/EMA/WMA） |
| `calcMACD` | 计算 MACD |
| `calcBOLL` | 计算布林带 |
| `calcKDJ` | 计算 KDJ |
| `calcRSI` | 计算 RSI |
| `calcWR` | 计算威廉指标 |
| `calcBIAS` | 计算乖离率 |
| `calcCCI` | 计算商品通道指数 |
| `calcATR` | 计算平均真实波幅 |
| `calcOBV` | 计算能量潮 |
| `calcROC` | 计算变动率指标 |
| `calcDMI` | 计算趋向指标 |
| `calcSAR` | 计算抛物线转向 |
| `calcKC` | 计算肯特纳通道 |

### 行业板块

| 方法 | 说明 |
|------|------|
| `getIndustryList` | 行业板块名称列表 |
| `getIndustrySpot` | 行业板块实时行情 |
| `getIndustryConstituents` | 行业板块成分股 |
| `getIndustryKline` | 行业板块历史 K 线（日/周/月） |
| `getIndustryMinuteKline` | 行业板块分时行情（1/5/15/30/60 分钟） |

### 概念板块

| 方法 | 说明 |
|------|------|
| `getConceptList` | 概念板块名称列表 |
| `getConceptSpot` | 概念板块实时行情 |
| `getConceptConstituents` | 概念板块成分股 |
| `getConceptKline` | 概念板块历史 K 线（日/周/月） |
| `getConceptMinuteKline` | 概念板块分时行情（1/5/15/30/60 分钟） |

### 期货行情

| 方法 | 说明 |
|------|------|
| `getFuturesKline` | 国内期货历史 K 线（日/周/月） |
| `getGlobalFuturesSpot` | 全球期货实时行情 |
| `getGlobalFuturesKline` | 全球期货历史 K 线（日/周/月） |
| `getFuturesInventorySymbols` | 期货库存品种列表 |
| `getFuturesInventory` | 期货库存数据 |
| `getComexInventory` | COMEX 黄金/白银库存 |

### 期权数据

| 方法 | 说明 |
|------|------|
| `getIndexOptionSpot` | 中金所股指期权 T 型报价（看涨 + 看跌） |
| `getIndexOptionKline` | 股指期权合约日 K 线 |
| `getCFFEXOptionQuotes` | 中金所全部期权实时行情列表 |
| `getETFOptionMonths` | 上交所 ETF 期权到期月份列表 |
| `getETFOptionExpireDay` | ETF 期权到期日与剩余天数 |
| `getETFOptionMinute` | ETF 期权当日分钟行情 |
| `getETFOptionDailyKline` | ETF 期权历史日 K 线 |
| `getETFOption5DayMinute` | ETF 期权 5 日分钟行情 |
| `getCommodityOptionSpot` | 商品期权 T 型报价 |
| `getCommodityOptionKline` | 商品期权合约日 K 线 |
| `getOptionLHB` | 期权龙虎榜 |

### 扩展数据

| 方法 | 说明 |
|------|------|
| `getFundFlow` | 资金流向 |
| `getPanelLargeOrder` | 盘口大单占比 |
| `getTradingCalendar` | A 股交易日历 |

### 批量查询

| 方法 | 说明 |
|------|------|
| `getAShareCodeList` | 获取全部 A 股代码 |
| `getUSCodeList` | 获取全部美股代码 |
| `getHKCodeList` | 获取全部港股代码 |
| `getAllAShareQuotes` | 获取全市场 A 股行情 |
| `getAllHKShareQuotes` | 获取全市场港股行情 |
| `getAllUSShareQuotes` | 获取全市场美股行情 |
| `getAllQuotesByCodes` | 批量获取指定股票行情 |

### 搜索

| 方法 | 说明 |
|------|------|
| `search` | 搜索股票代码/名称/拼音 |

---

## 许可证

[ISC](./LICENSE)

---

🌐 [官网](https://stock-sdk.linkdiary.cn) | 📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://stock-sdk.linkdiary.cn/playground) | 🧭 [Stock Dashboard](https://chengzuopeng.github.io/stock-dashboard/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)

---

如果这个项目对你有帮助，欢迎 Star ⭐ 或提出 Issue 反馈。
