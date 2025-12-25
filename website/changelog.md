# 更新日志

本页面记录 Stock SDK 的版本更新历史。

## **[1.3.1](https://www.npmjs.com/package/stock-sdk/v/1.3.1)** (2025-12-24)

### 优化

**文档优化**
- 官方网站上线，[https://stock-sdk.linkdiary.cn/](https://stock-sdk.linkdiary.cn/)
- 优化 API 文档介绍
- 一个 bigfix

## **[1.3.0](https://www.npmjs.com/package/stock-sdk/v/1.3.0)** (2025-12-23)

### 新增功能

**K 线数据**
- 新增美股和港股历史 K 线接口 `getHKHistoryKline`、`getUSHistoryKline`（日/周/月）
- 新增获取全部美股和港股股实时行情接口 `getAllUSShareQuotes`、`getAllHKShareQuotes`（支持并发控制、进度回调）

**技术指标**
- 新增一站式技术指标接口 `getKlineWithIndicators`（自动获取 K 线并计算指标）
- 新增均线计算函数 `calcMA`（支持 SMA/EMA/WMA）、`calcSMA`、`calcEMA`、`calcWMA`
- 新增技术指标计算函数 `calcMACD`、`calcBOLL`、`calcKDJ`、`calcRSI`、`calcWR` 等

### 优化

- 新增中英文文档切换支持

## **[1.2.0](https://www.npmjs.com/package/stock-sdk/v/1.2.0)** (2025-12-18)

### 新增功能

**K 线数据**
- 新增 A 股历史 K 线接口 `getHistoryKline`（日/周/月，数据来源：东方财富）
- 新增分钟 K 线接口 `getMinuteKline`（1/5/15/30/60 分钟）
- 新增当日分时走势接口 `getTodayTimeline`

### 优化

- 完全重构 API 文档结构，使用表格形式更清晰展示

## **[1.1.0](https://www.npmjs.com/package/stock-sdk/v/1.1.0)** (2025-12-12)

### 功能

**实时行情**
- A 股/指数全量行情 `getFullQuotes`
- A 股/指数简要行情 `getSimpleQuotes`
- 港股行情 `getHKQuotes`
- 美股行情 `getUSQuotes`
- 公募基金行情 `getFundQuotes`

**扩展数据**
- 资金流向 `getFundFlow`
- 盘口大单占比 `getPanelLargeOrder`

**批量查询**
- 全部 A 股代码列表 `codeList`
- 获取全部 A 股实时行情 `getAllAShareQuotes`（支持并发控制、进度回调）
- 批量获取指定股票行情 `getAllQuotesByCodes`
- 批量混合查询 `batchRaw`

**特性**
- 零依赖，轻量级
- 支持浏览器和 Node.js 18+ 双端运行
- 同时提供 ESM 和 CommonJS 两种模块格式
- 完整的 TypeScript 类型定义

---

::: tip 版本规范
Stock SDK 遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。
- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正
:::

