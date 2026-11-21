# Skill Catalog

The SDK ships seven skills. `STOCK_SDK_MCP_PROMPTS` selects skills and `STOCK_SDK_MCP_TOOLS` provides the tools each skill needs. [Setup guide](/en/skills/)

## Core (4 by default)

| Skill | Arguments | Underlying tools | What it does |
|---|---|---|---|
| `analyze_stock` | `symbol` (required), `period` (default daily) | `search` / `get_kline_with_indicators` / `get_kline_signals` | Full single-symbol technical analysis: klines + indicators + signals, summarized |
| `screen_stocks` | `criteria` (required), `scope` (defaults to the top 200 A-shares by net inflow) | board constituents / `get_fund_flow_rank` / `get_a_share_quotes` / indicators / signals | Coarse-filter first, then check indicators on the shortlist |
| `market_overview` | none | `get_market_status` / `get_zt_pool` / `get_northbound_flow_summary` / `get_fund_flow_rank` | Session status, limit-up breadth, disclosed Stock Connect data and fund-flow rankings |
| `monitor_watchlist` | `symbols` (required, comma-separated) | `get_a_share_quotes` / `get_today_timeline` / `get_individual_fund_flow` / `get_kline_signals` | Single-shot watchlist check: batch quotes, drill into threshold-crossers |

Example:

> Analyze the recent technical setup for Kweichow Moutai (sh600519) — any golden-cross signal?

## Full (3 advanced)

| Skill | Arguments | Underlying tools | What it does |
|---|---|---|---|
| `analyze_capital_flow` | `symbol` (optional) | per-stock/market fund flow / dragon-tiger + seats / block trades / margin / northbound | Smart-money read: cross-confirm accumulation vs. distribution across sources |
| `analyze_fund` | `fundCode` (required, 6-digit) | `get_fund_profile` / `get_fund_nav_history` / `get_fund_rank_history` | Fund review: profile + NAV history + category ranking |
| `diagnose_stock` | `symbol` (required) | indicators + signals / fund flow / dragon-tiger stats / chip distribution | Multi-factor diagnosis: technical + capital + chips, scored |

> `analyze_capital_flow` is the natural consumer of the block-trade / margin tools.

## Next steps

- [AI Skills Overview](/en/skills/): how skills work and how to enable / trigger them.
- [MCP Tool Table](/en/mcp/tools): the atomic tools skills build on.
