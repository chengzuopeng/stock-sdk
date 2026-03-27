# Tools & Resources

stock-sdk-mcp provides **32 MCP Tools** and **7 MCP Resources**, covering all core features of stock-sdk.

## MCP Tools

### Real-time Quotes

| Tool | Description |
|------|-------------|
| `get_quotes_by_query` | **Recommended** — Get quotes by name, code, or pinyin with auto market detection |
| `get_a_share_quotes` | Get A-share / index real-time quotes (40+ fields) |
| `get_hk_quotes` | Get HK stock real-time quotes |
| `get_us_quotes` | Get US stock real-time quotes |
| `get_fund_quotes` | Get mutual fund real-time NAV |
| `get_all_a_share_quotes` | Get whole-market A-share quotes (5000+ stocks) |
| `get_all_hk_quotes` | Get whole-market HK stock quotes (2000+ stocks) |
| `get_all_us_quotes` | Get whole-market US stock quotes (8000+ stocks) |

### K-line Data

| Tool | Description |
|------|-------------|
| `get_history_kline` | Get A-share historical K-line (daily / weekly / monthly) |
| `get_hk_history_kline` | Get HK stock historical K-line |
| `get_us_history_kline` | Get US stock historical K-line |
| `get_minute_kline` | Get A-share minute K-line (1 / 5 / 15 / 30 / 60 minutes) |
| `get_today_timeline` | Get A-share today's timeline |
| `get_kline_with_indicators` | **Key** — Get K-line with technical indicators (MA / MACD / BOLL / KDJ / RSI etc.) |

::: tip Key Tool: get_kline_with_indicators
This is the most important tool for AI. Regular APIs only return raw OHLC data, making it difficult for AI to calculate indicators like MACD or RSI directly. This tool performs indicator calculations on the server side, so each data point already includes `ma5`, `ma20`, `macd_dif`, `macd_dea`, `rsi`, `kdj`, and other fields ready for analysis.
:::

### Sector Data

| Tool | Description |
|------|-------------|
| `get_industry_list` | Get industry sector list |
| `get_industry_spot` | Get industry sector real-time quotes |
| `get_industry_constituents` | Get industry sector constituents |
| `get_industry_kline` | Get industry sector K-line |
| `get_concept_list` | Get concept sector list |
| `get_concept_spot` | Get concept sector real-time quotes |
| `get_concept_constituents` | Get concept sector constituents |
| `get_concept_kline` | Get concept sector K-line |

### Code Lists

| Tool | Description |
|------|-------------|
| `get_a_share_code_list` | Get all A-share codes (5000+ stocks) |
| `get_hk_code_list` | Get all HK stock codes (2000+ stocks) |
| `get_us_code_list` | Get all US stock codes (8000+ stocks) |
| `get_fund_code_list` | Get all fund codes (26000+ funds) |

### Search

| Tool | Description |
|------|-------------|
| `search_stock` | Search stocks (supports code, name, pinyin fuzzy matching) |

### Extended Features

| Tool | Description |
|------|-------------|
| `get_fund_flow` | Get stock / sector fund flow |
| `get_panel_large_order` | Get large order ratio |
| `get_trading_calendar` | Get A-share trading calendar |
| `get_dividend_detail` | Get dividend details |

## MCP Resources {#resources}

MCP Resources are static data that AI can proactively read without calling a Tool:

| URI | Description |
|-----|-------------|
| `stock://calendar/trading` | A-share trading calendar |
| `stock://market/a-share/codes` | A-share code list |
| `stock://market/hk/codes` | HK stock code list |
| `stock://market/us/codes` | US stock code list |
| `stock://market/fund/codes` | Fund code list |
| `stock://board/industry/list` | Industry sector list |
| `stock://board/concept/list` | Concept sector list |

## Usage Examples

After configuring the MCP Server, simply type natural language in your AI chat:

```
Get the real-time quote for Kweichow Moutai (600519)

Fetch Tencent (00700) daily K-line for the last 30 days with MACD and Bollinger Bands

Show constituents of the AI concept sector and today's top 5 gainers

Get real-time quotes for all STAR Market stocks, sorted by gain

What is Apple's recent RSI? Is it overbought?
```
