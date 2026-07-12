# MCP Tool Table

`stock-sdk`'s MCP server exposes the SDK's **read-only namespace methods** as tools. Each tool is an explicitly declared `ToolDef` — `name`, `description`, a hand-written JSON Schema `inputSchema`, and an `invoke` that maps args explicitly onto the SDK call — all collected into one manifest as the single source of truth (SSOT), shared with the CLI.

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
| Market events | `sdk.marketEvent.ztPool` / `stockChanges` / `boardChanges` | Limit-up pool / stock changes / board changes |
| Dragon-Tiger | `sdk.dragonTiger.detail` / `stockStats` / `institution` / `branchRank` | Dragon-Tiger list details and stats |
| Block trade | `sdk.blockTrade.marketStat` / `detail` / `dailyStat` | Block-trade stats and details |
| Margin | `sdk.margin.accountInfo` / `targetList` | Margin account info and target list |
| Options | `sdk.options.index.*` / `etf.*` / `commodity.*` / `cffex.*` / `lhb` | Index / ETF / commodity / CFFEX options |
| Futures | `sdk.futures.kline` / `globalSpot` / `globalKline` / `inventory` | Domestic/global futures quotes and inventory |
| Fund extras | `sdk.fund.dividendList` / `navHistory` / `estimate` / `rankHistory` / `profile` | Fund dividends / NAV / estimate / ranking / deep profile |
| Trading calendar | `sdk.calendar.isTradingDay` / `nextTradingDay` / `marketStatus` | Trading-day checks and market status |
| Reference | `sdk.reference.dividendDetail` / `tradingCalendar` | Dividend detail / A-share trading calendar |
| Search | `sdk.search(keyword)` | Search stocks / funds by keyword |

## Tool call semantics

- **Input**: symbol-like params take `string` as a first-class citizen; the server runs `normalizeSymbol` for tolerant parsing (e.g. `sh600519` / `600519` / `00700` / `hk00700` / `AAPL` / `105.AAPL`). The `inputSchema` is a hand-written JSON Schema literal declaring field names, types and `required`.
- **Argument mapping**: `tools/call` looks up the manifest by `name`, and `invoke(sdk, args)` maps named parameters **explicitly** onto the SDK method's positional arguments — no runtime reflection.
- **Result**: a successful result is wrapped as `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`; the text is the result serialized per the v2 data contract (unified `Quote` discriminated union, `timestamp: number | null`, percentages as percentage numbers, no `raw` field — exact fields follow the implementation).
- **Error semantics**: a tool execution failure returns `{ content, isError: true }`, handing the error to the model; only unknown-tool / protocol-level errors use a JSON-RPC `error`.

## Shared manifest with the CLI

The same tool manifest drives both MCP's `tools/list` / `tools/call` and the CLI's subcommands, preventing two definitions from drifting apart. Adding a tool for a new read-only namespace method is just one more `ToolDef` in the manifest — MCP and CLI pick it up together.

## Next steps

- [MCP Installation](/en/mcp/installation): connect from your AI client.
- [AI Skills](/en/skills/): compose these tools into higher-level analysis skills.
