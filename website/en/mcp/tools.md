# MCP Tool Table

`stock-sdk` derives read-only MCP tools from the same `MethodSpec` definitions used by the CLI. Each tool provides a name, description, and `inputSchema` through `tools/list`.

> **Exact tools follow the implementation.** The table below is an overview of tools derived from read-only namespace methods; tool names and input fields follow the final manifest. Write operations and debug-only `*Raw` methods are not exposed as tools.

## Tool overview

| Tool (derived from) | Namespace methods | Description |
|---|---|---|
| Quotes | `sdk.quotes.cn` / `cnSimple` / `hk` / `us` / `fund` | A-share full/simple, HK, US, fund quotes |
| Intraday & order book | `sdk.quotes.timeline` / `largeOrder` / `fundFlow` | Intraday timeline, large orders, simple fund flow |
| Batch quotes | `sdk.batch.cn` / `hk` / `us` / `byCodes` | Whole-market or by-code batch quotes |
| K-line | `sdk.kline.cn` / `hk` / `us` / `cnMinute` / `hkMinute` / `usMinute` | Historical and minute K-lines |
| K-line with indicators | `sdk.kline.withIndicators` | K-line plus built-in technical indicators |
| Indicator signals | `sdk.kline.signals` | Golden/death crosses, overbought/oversold, breakouts, reversals — 14 signal types |
| Chip distribution | `sdk.chips.cn` / `hk` / `us` | Profit ratio / avg cost / cost ranges & concentration / chip peak |
| Code lists | `sdk.codes.cn` / `us` / `hk` / `fund` | Per-market symbol lists |
| Boards | `sdk.board.industry.*` / `sdk.board.concept.*` | Industry / concept board list, spot, constituents, K-line |
| Fund flow | `sdk.fundFlow.individual` / `market` / `rank` / `sectorRank` | Stock / market / rank / sector fund flow |
| Northbound | `sdk.northbound.minute` / `summary` / `holdingRank` / `individual` | Stock Connect / northbound capital |
| Market events | `sdk.marketEvent.ztPool` / `stockChanges` / `boardChanges` / `unusualFluctuation` | Limit-up pool / stock changes / board changes / regulatory fluctuation alerts |
| Dragon-Tiger | `sdk.dragonTiger.detail` / `stockStats` / `institution` / `branchRank` | Dragon-Tiger list details and stats |
| Block trade | `sdk.blockTrade.marketStat` / `detail` / `dailyStat` | Block-trade stats and details |
| Margin | `sdk.margin.accountInfo` / `targetList` | Margin account info and target list |
| Options | `sdk.options.index.*` / `etf.*` / `commodity.*` / `cffex.*` / `lhb` | Index / ETF / commodity / CFFEX options |
| Futures | `sdk.futures.kline` / `globalSpot` / `globalKline` / `inventory` | Domestic/global futures quotes and inventory |
| Fund extras | `sdk.fund.dividendList` / `navHistory` / `rankHistory` / `profile` / `theme.*` | Fund dividends / NAV / ranking / deep profile / theme funds |
| Trading calendar | `sdk.calendar.isTradingDay` / `nextTradingDay` / `marketStatus` | Trading-day checks and market status |
| Reference | `sdk.reference.dividendDetail` / `tradingCalendar` | Dividend detail / A-share trading calendar |
| Search | `sdk.search(keyword)` | Search stocks / funds by keyword |

## Tool call semantics

- Pass stock codes as strings such as `"600519"` or `"AAPL"`. The server validates array entries and nested indicator fields against `inputSchema`. Errors identify the field path, such as `codes[0]` or `indicators.ma.periods[0]`.
- **Argument mapping**: `tools/call` looks up the manifest by `name`, and `invoke(sdk, args)` maps named parameters **explicitly** onto the SDK method's positional arguments — no runtime reflection.
- **Result**: a successful result is wrapped as `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`; the text is the result serialized per the v2 data contract (unified `Quote` discriminated union, `timestamp: number | null`, percentages as percentage numbers, no `raw` field — exact fields follow the implementation).
- **Error semantics**: a tool execution failure returns `{ content, isError: true }`, handing the error to the model; only unknown-tool / protocol-level errors use a JSON-RPC `error`.

## Time series and large results

- When K-lines or signals exceed 200 rows or 80,000 characters, the server returns the newest records in ascending order under `sample`.`total` counts the rows before truncation, `returned` counts the returned rows, and `start` and `end` give the first and last dates or times. The result includes `truncated: true`. Complete results remain arrays.
- Rankings such as fund-flow rankings keep the first 200 rows in their original rank order. Use `page` and `pageSize` on tools that support pagination to request a specific slice.
- `get_fund_nav_history` and `get_fund_rank_history` retain `code`, `name`, and `items` and add `coverage: { total, returned, start, end, truncated }`. `total` counts rows after date filtering and before truncation. An empty interval yields empty `items` with `null` for `start` and `end`.

The fund history tools accept optional, inclusive `startDate` and `endDate` in `YYYY-MM-DD` or `YYYYMMDD` format. For example, call `get_fund_nav_history({ code: "110022", startDate: "2026-09-01", endDate: "2026-10-31" })`. The dates filter the MCP response. The SDK methods `fund.navHistory(code)` and `fund.rankHistory(code)` return full histories.

## Shared manifest with the CLI

Register a `MethodSpec` in `src/spec/methods.ts` to derive both CLI and MCP entries. The indicator K-line tool defines a custom schema for its nested `indicators` object.

## Next steps

- [MCP Installation](/en/mcp/installation): connect from your AI client.
- [AI Skills](/en/skills/): compose these tools into higher-level analysis skills.
