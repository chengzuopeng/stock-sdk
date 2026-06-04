# 工具与资源

stock-sdk-mcp（v0.2.x）提供 **69 个 MCP Tools**、**7 个静态 Resources + 4 个 Resource Templates**、**6 个 Prompts** 和 **5 个 Skills**，覆盖 stock-sdk 的全部核心功能。所有工具均带 `readOnlyHint` / `openWorldHint` 等语义注解（annotations）。

## MCP Tools

### 实时行情（8）

| Tool | 描述 |
|------|------|
| `get_quotes_by_query` | **【推荐】** 按名称、代码或拼音查询，自动识别 A 股 / 港股 / 美股 |
| `get_a_share_quotes` | A 股 / 指数实时行情（40+ 字段） |
| `get_hk_quotes` | 港股实时行情 |
| `get_us_quotes` | 美股实时行情 |
| `get_fund_quotes` | 公募基金实时净值 |
| `get_all_a_share_quotes` | **【批量】** 全市场 A 股行情（5000+ 只，可按市场筛选） |
| `get_all_hk_quotes` | **【批量】** 全市场港股行情（2000+ 只） |
| `get_all_us_quotes` | **【批量】** 全市场美股行情（8000+ 只，可按市场筛选） |

### K 线数据（6）

| Tool | 描述 |
|------|------|
| `get_history_kline` | A 股历史 K 线（日 / 周 / 月） |
| `get_hk_history_kline` | 港股历史 K 线 |
| `get_us_history_kline` | 美股历史 K 线 |
| `get_minute_kline` | A 股分钟 K 线（1 / 5 / 15 / 30 / 60 分钟） |
| `get_today_timeline` | A 股当日分时走势 |
| `get_kline_with_indicators` | **【核心】** 带技术指标的 K 线（MA / MACD / BOLL / KDJ / RSI 等，服务端算好；支持 A 股 / 港股 / 美股） |

::: tip 重点工具：get_kline_with_indicators
这是对 AI 最有用的工具。普通行情 API 只返回原始 OHLC，AI 很难自己算出 MACD 或 RSI。此工具在服务端完成指标计算，返回的每根 K 线直接带 `ma5`、`ma20`、`macd`、`kdj`、`rsi` 等字段，AI 拿来即可分析。
:::

### 搜索（1）

| Tool | 描述 |
|------|------|
| `search_stock` | 搜索股票（代码 / 名称 / 拼音模糊匹配，跨市场） |

### 代码列表（4）

| Tool | 描述 |
|------|------|
| `get_a_share_code_list` | 全部 A 股代码（5000+，可按市场筛选） |
| `get_hk_code_list` | 全部港股代码（2000+） |
| `get_us_code_list` | 全部美股代码（8000+，可按市场筛选） |
| `get_fund_code_list` | 全部基金代码（26000+） |

### 行业 / 概念板块（10）

| Tool | 描述 |
|------|------|
| `get_industry_list` / `get_concept_list` | 行业 / 概念板块列表（名称、代码、涨跌幅、领涨股） |
| `get_industry_spot` / `get_concept_spot` | 板块实时行情 |
| `get_industry_constituents` / `get_concept_constituents` | 板块成分股 |
| `get_industry_kline` / `get_concept_kline` | 板块历史 K 线（支持复权） |
| `get_industry_minute_kline` / `get_concept_minute_kline` | 板块分钟 K 线 / 分时 |

### 资金流向（5）

| Tool | 描述 |
|------|------|
| `get_fund_flow` | 个股 / 板块当日资金流向（主力 / 散户净流入及占比） |
| `get_stock_fund_flow_history` | 个股资金流向历史（超大 / 大 / 中 / 小单） |
| `get_market_fund_flow` | 大盘（沪深两市）资金流向 |
| `get_fund_flow_rank` | 资金流排名（`scope` 区分个股 / 板块） |
| `get_sector_fund_flow_history` | 单板块历史资金流 |

### 北向资金 / 沪深港通（3）

| Tool | 描述 |
|------|------|
| `get_northbound_realtime` | 北向 / 南向资金实时（分时曲线 + 汇总） |
| `get_northbound_history` | 北向资金历史（`scope` 区分整体 / 个股持仓） |
| `get_northbound_holding_rank` | 北向持股个股排行 |

### 涨停板 / 盘口异动（3）

| Tool | 描述 |
|------|------|
| `get_zt_pool` | 涨停股池（6 大池：涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停，可查历史日期） |
| `get_stock_changes` | 盘口异动（22 种类型：火箭发射 / 大笔买入 / 封涨停 / 60 日新高 等） |
| `get_board_changes` | 当日板块异动详情 |

### 龙虎榜（3）

| Tool | 描述 |
|------|------|
| `get_dragon_tiger_list` | 龙虎榜详情（按日期范围，含上榜原因、买卖额） |
| `get_dragon_tiger_stats` | 龙虎榜统计（`type` 区分个股频次 / 机构 / 营业部） |
| `get_dragon_tiger_seat_detail` | 个股某日上榜席位明细（买卖榜） |

### 大宗交易 / 融资融券（2）

| Tool | 描述 |
|------|------|
| `get_block_trade` | 大宗交易（`type` 区分总览 / 明细 / 按股统计） |
| `get_margin_data` | 融资融券（`type` 区分账户统计 / 标的明细） |

### 期货（6）

| Tool | 描述 |
|------|------|
| `get_futures_kline` | 国内期货历史 K 线（含持仓量） |
| `get_global_futures_spot` | 全球期货实时行情（原油 / 黄金 / 铜 等） |
| `get_global_futures_kline` | 全球期货历史 K 线 |
| `get_futures_inventory_symbols` | 可查库存的期货品种列表 |
| `get_futures_inventory` | 期货仓单 / 库存数据 |
| `get_comex_inventory` | COMEX 黄金 / 白银库存 |

### 期权（10）

| Tool | 描述 |
|------|------|
| `get_index_option_spot` | 指数期权 T 型报价（沪深 300 / 中证 1000 等） |
| `get_index_option_kline` | 指数期权合约日 K 线 |
| `get_cffex_option_quotes` | 中金所期权实时行情列表 |
| `get_etf_option_months` | ETF 期权可用合约月份 |
| `get_etf_option_expire_day` | ETF 期权到期日信息 |
| `get_etf_option_minute` | ETF 期权合约分钟走势 |
| `get_etf_option_daily_kline` | ETF 期权合约日 K 线 |
| `get_commodity_option_spot` | 商品期权 T 型报价 |
| `get_commodity_option_kline` | 商品期权合约日 K 线 |
| `get_option_lhb` | 期权龙虎榜 |

### 复合分析（5，一次调用串联多步）

| Tool | 描述 |
|------|------|
| `analyze_stock` | 个股全景分析（行情 + 指标 K 线 + 资金流 + 北向 + 分红） |
| `compare_stocks` | 多股对比分析（行情 + 近期指标并排对比） |
| `scan_market` | 条件选股（服务端按涨跌幅 / 量比 / 换手率 / 市盈率过滤） |
| `get_market_overview` | 大盘概览（指数 + 行业 / 概念 TOP10 + 涨跌家数 + 北向 + 板块异动） |
| `get_sector_analysis` | 板块深度分析（行情 + K 线 + 龙头股） |

### 扩展功能（3）

| Tool | 描述 |
|------|------|
| `get_panel_large_order` | 盘口大单 / 小单买卖占比 |
| `get_trading_calendar` | A 股交易日历 |
| `get_dividend_detail` | 分红派送详情（送转、除权日、派息日等 20+ 维度） |

## MCP Resources {#resources}

AI 可主动读取的静态数据资源，无需调用 Tool（共 7 个）：

| URI | 描述 |
|-----|------|
| `stock://calendar/trading` | A 股交易日历 |
| `stock://market/a-share/codes` | A 股代码列表 |
| `stock://market/hk/codes` | 港股代码列表 |
| `stock://market/us/codes` | 美股代码列表 |
| `stock://market/fund/codes` | 基金代码列表 |
| `stock://board/industry/list` | 行业板块列表 |
| `stock://board/concept/list` | 概念板块列表 |

## Resource Templates

参数化资源模板，通过 URI 直接读取动态数据（共 4 个）：

| URI Template | 描述 | 示例 |
|-------------|------|------|
| `stock://quotes/{code}` | 个股实时行情 | `stock://quotes/sh600519` |
| `stock://kline/{code}/{period}` | 个股 K 线数据 | `stock://kline/600519/daily` |
| `stock://board/industry/{code}` | 行业板块详情（行情 + 龙头成分股） | `stock://board/industry/BK1027` |
| `stock://board/concept/{code}` | 概念板块详情（行情 + 龙头成分股） | `stock://board/concept/BK0800` |

## 使用示例

配置好 MCP Server 后，在 AI 对话中直接输入自然语言即可：

```
请帮我查询贵州茅台（600519）的实时行情

获取腾讯控股（00700）最近 30 天的日 K 线，并计算 MACD 和布林带

查看人工智能概念板块有哪些成分股，以及今天涨幅前 5 的股票

获取全市场科创板股票的实时行情，按涨幅排序

苹果公司最近的 RSI 指标是多少？是否超买？

帮我看看螺纹钢主力合约最近的走势，以及 COMEX 黄金库存变化

追踪一下今天的聪明钱：北向资金、龙虎榜机构、大宗交易都在买什么？
```
