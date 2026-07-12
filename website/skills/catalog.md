# 技能清单

内置 7 个场景化技能，分 `core`（默认启用）与 `full`（需 `STOCK_SDK_MCP_PROMPTS=full` 或点名）两级，与工具集的 core/full 独立过滤。怎么工作、如何启用见 [AI Skills 概述](/skills/)。

## Core（默认 4 个）

| 技能 | 参数 | 底层工具 | 做什么 |
|---|---|---|---|
| `analyze_stock` | `symbol`(必填)、`period`(默认 daily) | `search` / `get_kline_with_indicators` / `get_kline_signals` | 个股完整技术面分析：K 线 + 指标 + 信号 + 归纳 |
| `screen_stocks` | `criteria`(必填)、`scope`(默认全市场) | 板块成分 / `get_fund_flow_rank` / `get_a_share_quotes` / 指标 / 信号 | 智能选股：先粗筛再对候选取指标，给排序候选清单 |
| `market_overview` | 无 | `get_market_status` / `get_zt_pool` / `get_northbound_flow_summary` / `get_fund_flow_rank` | 今日市场速览：状态 + 涨停广度 + 北向 + 主力资金方向 |
| `monitor_watchlist` | `symbols`(必填，逗号分隔) | `get_a_share_quotes` / `get_today_timeline` / `get_individual_fund_flow` / `get_kline_signals` | 自选单次快照：批量行情 + 对触发阈值的标的下钻 |

示例：

> 帮我分析一下贵州茅台（sh600519）最近的技术形态，有没有金叉信号？

## Full（进阶 3 个）

| 技能 | 参数 | 底层工具 | 做什么 |
|---|---|---|---|
| `analyze_capital_flow` | `symbol`(可选) | 个股/大盘资金流 / 龙虎榜 + 席位 / 大宗 / 两融 / 北向 | 主力动向研判：多资金源交叉验证吸筹 vs 派发 |
| `analyze_fund` | `fundCode`(必填，6 位) | `get_fund_profile` / `get_fund_nav_history` / `get_fund_rank_history` / `get_fund_estimate` | 基金综合评估：档案 + 净值走势 + 同类排名 + 当日估值 |
| `diagnose_stock` | `symbol`(必填) | 指标 + 信号 / 资金流 / 龙虎榜统计 / 筹码分布 | 个股综合诊断：技术 + 资金 + 筹码三维打分 |

> `analyze_capital_flow` 正好用上大宗交易 / 融资融券工具，是它们最自然的消费场景。

## 下一步

- [AI Skills 概述](/skills/)：技能怎么工作、如何启用与触发。
- [MCP 工具表](/mcp/tools)：技能底层用到的原子工具。
