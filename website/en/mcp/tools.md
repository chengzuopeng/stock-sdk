# Tools & Resources

stock-sdk-mcp (v0.2.x) provides **69 MCP Tools**, **7 static Resources + 4 Resource Templates**, **6 Prompts**, and **5 Skills**, covering all core features of stock-sdk. Every tool carries semantic annotations (`readOnlyHint` / `openWorldHint`).

## MCP Tools

### Real-time Quotes (8)

| Tool | Description |
|------|-------------|
| `get_quotes_by_query` | **[Recommended]** Query by name, code, or pinyin; auto-detects A-share / HK / US |
| `get_a_share_quotes` | A-share / index real-time quotes (40+ fields) |
| `get_hk_quotes` | HK stock real-time quotes |
| `get_us_quotes` | US stock real-time quotes |
| `get_fund_quotes` | Mutual fund real-time NAV |
| `get_all_a_share_quotes` | **[Batch]** All A-share quotes (5000+, filterable by market) |
| `get_all_hk_quotes` | **[Batch]** All HK quotes (2000+) |
| `get_all_us_quotes` | **[Batch]** All US quotes (8000+, filterable by market) |

### K-line Data (6)

| Tool | Description |
|------|-------------|
| `get_history_kline` | A-share historical K-line (daily / weekly / monthly) |
| `get_hk_history_kline` | HK historical K-line |
| `get_us_history_kline` | US historical K-line |
| `get_minute_kline` | A-share minute K-line (1 / 5 / 15 / 30 / 60 min) |
| `get_today_timeline` | A-share intraday timeline |
| `get_kline_with_indicators` | **[Core]** K-line with indicators (MA / MACD / BOLL / KDJ / RSI, computed server-side; A / HK / US) |

::: tip Key tool: get_kline_with_indicators
The most useful tool for AI. Plain quote APIs only return raw OHLC, which AI struggles to turn into MACD or RSI. This tool computes indicators server-side, so each candle already carries `ma5`, `ma20`, `macd`, `kdj`, `rsi` — ready for analysis.
:::

### Search (1)

| Tool | Description |
|------|-------------|
| `search_stock` | Search stocks (fuzzy by code / name / pinyin, cross-market) |

### Code Lists (4)

| Tool | Description |
|------|-------------|
| `get_a_share_code_list` | All A-share codes (5000+, filterable by market) |
| `get_hk_code_list` | All HK codes (2000+) |
| `get_us_code_list` | All US codes (8000+, filterable by market) |
| `get_fund_code_list` | All fund codes (26000+) |

### Industry / Concept Sectors (10)

| Tool | Description |
|------|-------------|
| `get_industry_list` / `get_concept_list` | Industry / concept sector list (name, code, change, leading stock) |
| `get_industry_spot` / `get_concept_spot` | Sector real-time quotes |
| `get_industry_constituents` / `get_concept_constituents` | Sector constituents |
| `get_industry_kline` / `get_concept_kline` | Sector historical K-line (adjust supported) |
| `get_industry_minute_kline` / `get_concept_minute_kline` | Sector minute K-line / timeline |

### Fund Flow (5)

| Tool | Description |
|------|-------------|
| `get_fund_flow` | Single-day fund flow for a stock / sector (main vs retail net inflow & ratio) |
| `get_stock_fund_flow_history` | Historical fund flow for a stock (super-large / large / medium / small orders) |
| `get_market_fund_flow` | Market-wide (SH + SZ) fund flow |
| `get_fund_flow_rank` | Fund flow ranking (`scope` = stock / sector) |
| `get_sector_fund_flow_history` | Historical fund flow for a single sector |

### Northbound / Stock Connect (3)

| Tool | Description |
|------|-------------|
| `get_northbound_realtime` | Northbound / southbound real-time (intraday curve + summary) |
| `get_northbound_history` | Northbound history (`scope` = market / stock holdings) |
| `get_northbound_holding_rank` | Northbound holdings ranking by stock |

### Limit-Up Pool / Stock Changes (3)

| Tool | Description |
|------|-------------|
| `get_zt_pool` | Limit-up pools (6 pools: limit-up / yesterday / strong / sub-new / broken / limit-down; historical dates) |
| `get_stock_changes` | Intraday stock changes (22 types: rocket launch / large buy / sealed limit-up / 60-day high, etc.) |
| `get_board_changes` | Today's sector changes |

### Dragon-Tiger List (3)

| Tool | Description |
|------|-------------|
| `get_dragon_tiger_list` | Dragon-Tiger detail (by date range, with reason & buy/sell amounts) |
| `get_dragon_tiger_stats` | Dragon-Tiger stats (`type` = stock / institution / branch) |
| `get_dragon_tiger_seat_detail` | Per-stock seat detail for a date (buy & sell lists) |

### Block Trade / Margin Trading (2)

| Tool | Description |
|------|-------------|
| `get_block_trade` | Block trades (`type` = overview / detail / daily stat) |
| `get_margin_data` | Margin trading (`type` = account stats / target list) |

### Futures (6)

| Tool | Description |
|------|-------------|
| `get_futures_kline` | Domestic futures historical K-line (with open interest) |
| `get_global_futures_spot` | Global futures real-time (crude / gold / copper, etc.) |
| `get_global_futures_kline` | Global futures historical K-line |
| `get_futures_inventory_symbols` | List of inventory-queryable futures symbols |
| `get_futures_inventory` | Futures warehouse / inventory data |
| `get_comex_inventory` | COMEX gold / silver inventory |

### Options (10)

| Tool | Description |
|------|-------------|
| `get_index_option_spot` | Index option T-quotes (CSI 300 / CSI 1000, etc.) |
| `get_index_option_kline` | Index option contract daily K-line |
| `get_cffex_option_quotes` | CFFEX option real-time list |
| `get_etf_option_months` | ETF option available contract months |
| `get_etf_option_expire_day` | ETF option expiry info |
| `get_etf_option_minute` | ETF option intraday minute data |
| `get_etf_option_daily_kline` | ETF option contract daily K-line |
| `get_commodity_option_spot` | Commodity option T-quotes |
| `get_commodity_option_kline` | Commodity option daily K-line |
| `get_option_lhb` | Option Dragon-Tiger list |

### Compound Analysis (5, multi-step in one call)

| Tool | Description |
|------|-------------|
| `analyze_stock` | Full stock analysis (quote + indicator K-line + fund flow + northbound + dividends) |
| `compare_stocks` | Multi-stock comparison (quotes + recent indicators side by side) |
| `scan_market` | Screening (server-side filter by change / volume ratio / turnover / PE) |
| `get_market_overview` | Market overview (indices + sector TOP10 + advancers/decliners + northbound + changes) |
| `get_sector_analysis` | Sector deep-dive (quote + K-line + leading stocks) |

### Extended (3)

| Tool | Description |
|------|-------------|
| `get_panel_large_order` | Large / small order buy-sell ratio |
| `get_trading_calendar` | A-share trading calendar |
| `get_dividend_detail` | Dividend details (bonus / transfer, ex-date, pay date, 20+ fields) |

## MCP Resources {#resources}

Static data resources the AI can read directly without calling a Tool (7 total):

| URI | Description |
|-----|-------------|
| `stock://calendar/trading` | A-share trading calendar |
| `stock://market/a-share/codes` | A-share code list |
| `stock://market/hk/codes` | HK code list |
| `stock://market/us/codes` | US code list |
| `stock://market/fund/codes` | Fund code list |
| `stock://board/industry/list` | Industry sector list |
| `stock://board/concept/list` | Concept sector list |

## Resource Templates

Parameterized resource templates for reading dynamic data via URI (4 total):

| URI Template | Description | Example |
|-------------|-------------|---------|
| `stock://quotes/{code}` | Single-stock real-time quote | `stock://quotes/sh600519` |
| `stock://kline/{code}/{period}` | Single-stock K-line | `stock://kline/600519/daily` |
| `stock://board/industry/{code}` | Industry sector detail (quote + top constituents) | `stock://board/industry/BK1027` |
| `stock://board/concept/{code}` | Concept sector detail (quote + top constituents) | `stock://board/concept/BK0800` |

## Usage Examples

Once the MCP Server is configured, just type natural language in your AI chat:

```
Get me the real-time quote for Kweichow Moutai (600519)

Get Tencent's (00700) last 30 daily candles and compute MACD and Bollinger Bands

Show the constituents of the AI concept sector and today's top 5 gainers

Get all STAR Market stocks sorted by gain

What's Apple's recent RSI? Is it overbought?

Show me the rebar futures main contract trend and recent COMEX gold inventory

Track today's smart money: what are northbound funds, Dragon-Tiger institutions, and block trades buying?
```
