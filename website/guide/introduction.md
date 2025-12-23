# 介绍

Stock SDK 是一个为**前端和 Node.js 设计的股票行情 SDK**。

无需 Python、无需后端服务，直接在**浏览器或 Node.js** 中获取 **A 股 / 港股 / 美股 / 公募基金**的实时行情与 K 线数据。

## ✨ 特性

- ✅ **零依赖**，轻量级（压缩后 < 20KB）
- ✅ 支持 **浏览器** 和 **Node.js 18+** 双端运行
- ✅ 同时提供 **ESM** 和 **CommonJS** 两种模块格式
- ✅ 完整的 **TypeScript** 类型定义和单元测试覆盖
- ✅ **A 股、港股、美股、公募基金**实时行情
- ✅ **历史 K 线**（日/周/月）、**分钟 K 线**（1/5/15/30/60 分钟）和**当日分时走势**数据
- ✅ **技术指标**：内置 MA、MACD、BOLL、KDJ、RSI、WR 等常用指标计算
- ✅ **资金流向**、**盘口大单**等扩展数据
- ✅ 获取全部 **A 股代码列表**（5000+ 只股票）和批量获取**全市场行情**（内置并发控制）

## 📊 功能概览

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

### 扩展数据

| 方法 | 说明 |
|------|------|
| `getFundFlow` | 资金流向 |
| `getPanelLargeOrder` | 盘口大单占比 |

### 批量查询

| 方法 | 说明 |
|------|------|
| `getAShareCodeList` | 获取全部 A 股代码 |
| `getUSCodeList` | 获取全部美股代码 |
| `getHKCodeList` | 获取全部港股代码 |
| `getAllAShareQuotes` | 获取全市场 A 股行情 |
| `getAllHKShareQuotes` | 获取全市场港股行情 |
| `getAllUSShareQuotes` | 获取全市场美股行情 |

## 🔗 相关链接

- [NPM](https://www.npmjs.com/package/stock-sdk)
- [GitHub](https://github.com/chengzuopeng/stock-sdk)
- [在线演示](/playground/)

