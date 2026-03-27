# 工具与资源

stock-sdk-mcp 提供 **32 个 MCP Tools** 和 **7 个 MCP Resources**，覆盖 stock-sdk 的全部核心功能。

## MCP Tools

### 实时行情

| Tool | 描述 |
|------|------|
| `get_quotes_by_query` | **推荐** — 按名称、代码或拼音获取行情，自动识别 A 股 / 港股 / 美股 |
| `get_a_share_quotes` | 获取 A 股 / 指数实时行情（40+ 字段） |
| `get_hk_quotes` | 获取港股实时行情 |
| `get_us_quotes` | 获取美股实时行情 |
| `get_fund_quotes` | 获取公募基金实时净值 |
| `get_all_a_share_quotes` | 获取全市场 A 股行情（5000+ 只） |
| `get_all_hk_quotes` | 获取全市场港股行情（2000+ 只） |
| `get_all_us_quotes` | 获取全市场美股行情（8000+ 只） |

### K 线数据

| Tool | 描述 |
|------|------|
| `get_history_kline` | 获取 A 股历史 K 线（日 / 周 / 月） |
| `get_hk_history_kline` | 获取港股历史 K 线 |
| `get_us_history_kline` | 获取美股历史 K 线 |
| `get_minute_kline` | 获取 A 股分钟 K 线（1 / 5 / 15 / 30 / 60 分钟） |
| `get_today_timeline` | 获取 A 股当日分时走势 |
| `get_kline_with_indicators` | **核心** — 获取带技术指标的 K 线（MA / MACD / BOLL / KDJ / RSI 等） |

::: tip 重点工具：get_kline_with_indicators
这是对 AI 最重要的工具。普通 API 只返回原始 OHLC 数据，AI 很难直接计算出 MACD 或 RSI。此工具在服务端完成指标计算，返回的每一天数据直接包含 `ma5`、`ma20`、`macd_dif`、`macd_dea`、`rsi`、`kdj` 等字段，AI 可以直接用于分析。
:::

### 板块数据

| Tool | 描述 |
|------|------|
| `get_industry_list` | 获取行业板块列表 |
| `get_industry_spot` | 获取行业板块实时行情 |
| `get_industry_constituents` | 获取行业板块成分股 |
| `get_industry_kline` | 获取行业板块 K 线 |
| `get_concept_list` | 获取概念板块列表 |
| `get_concept_spot` | 获取概念板块实时行情 |
| `get_concept_constituents` | 获取概念板块成分股 |
| `get_concept_kline` | 获取概念板块 K 线 |

### 代码列表

| Tool | 描述 |
|------|------|
| `get_a_share_code_list` | 获取全部 A 股代码（5000+ 只） |
| `get_hk_code_list` | 获取全部港股代码（2000+ 只） |
| `get_us_code_list` | 获取全部美股代码（8000+ 只） |
| `get_fund_code_list` | 获取全部基金代码（26000+ 只） |

### 搜索

| Tool | 描述 |
|------|------|
| `search_stock` | 搜索股票（支持代码、名称、拼音模糊匹配） |

### 扩展功能

| Tool | 描述 |
|------|------|
| `get_fund_flow` | 获取个股 / 板块资金流向 |
| `get_panel_large_order` | 获取盘口大单占比 |
| `get_trading_calendar` | 获取 A 股交易日历 |
| `get_dividend_detail` | 获取分红派送详情 |

## MCP Resources {#resources}

MCP Resources 是 AI 可主动读取的静态数据资源，无需调用 Tool：

| URI | 描述 |
|-----|------|
| `stock://calendar/trading` | A 股交易日历 |
| `stock://market/a-share/codes` | A 股代码列表 |
| `stock://market/hk/codes` | 港股代码列表 |
| `stock://market/us/codes` | 美股代码列表 |
| `stock://market/fund/codes` | 基金代码列表 |
| `stock://board/industry/list` | 行业板块列表 |
| `stock://board/concept/list` | 概念板块列表 |

## 使用示例

配置好 MCP Server 后，在 AI 对话中直接输入自然语言即可：

```
请帮我查询贵州茅台（600519）的实时行情

获取腾讯控股（00700）最近 30 天的日 K 线，并计算 MACD 和布林带

查看人工智能概念板块有哪些成分股，以及今天涨幅前 5 的股票

获取全市场科创板股票的实时行情，按涨幅排序

苹果公司最近的 RSI 指标是多少？是否超买？
```
