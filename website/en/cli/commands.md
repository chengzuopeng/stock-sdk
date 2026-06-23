# Command reference

The CLI has two command layers: **high-frequency aliases** (single-token, enhanced) and **namespace direct** (reach any method). This page lists each alias's usage and gives a quick-reference table of all 84 namespaced methods.

> Global options (`--format` / `--pretty` / `--timeout` / `--quiet` / `--help` / `--version`), parsing rules and exit codes are covered in the [CLI overview](/en/cli/).

## High-frequency aliases

### `quote` — real-time quotes

```bash
stock-sdk quote <code...> [--full] [--market a|hk|us|fund]
```

Accepts **one or more** codes, grouped by market and requested **concurrently, without blocking each other**:

```bash
stock-sdk quote 600519                 # A-share
stock-sdk quote 600519 000858 00700    # mix A-share + HK, auto-detected
stock-sdk quote AAPL TSLA              # US
stock-sdk quote 600519 --full          # A-share full level-2 (defaults to the simple form)
stock-sdk quote 159915 --market fund   # funds require an explicit --market fund
```

| Option | Description |
|---|---|
| `--full` | Fetch full level-2 quotes for A-shares (default is the simple `cnSimple`) |
| `--market a/hk/us/fund` | Force the market; otherwise auto-detected by code (funds are not auto-detected, must be explicit) |

> **Partial success**: in a mixed-market query, one market failing doesn't drag down the others — available results are returned, and the failing markets' reasons are written to stderr. Only when **all** fail does it exit with the corresponding code.

### `kline` — historical K-line

```bash
stock-sdk kline <symbol> [--market a|hk|us] [--period daily|weekly|monthly] [--adjust qfq|hfq|none] [--start YYYYMMDD] [--end YYYYMMDD] [--limit N]
```

```bash
stock-sdk kline 600519 --period weekly --adjust hfq
stock-sdk kline AAPL --market us --limit 30
stock-sdk kline 600519 --start 20240101 --end 20240301
```

| Option | Description |
|---|---|
| `--market a/hk/us` | Force the market (default: auto-detect → `kline.cn/hk/us`) |
| `--period daily/weekly/monthly` | K-line interval |
| `--adjust qfq/hfq/none` | Adjustment: forward (default) / backward / none |
| `--start` / `--end` | Date range `YYYYMMDD` (maps to SDK `startDate/endDate`) |
| `--limit N` | Take only the first N items (output-layer truncation) |

### `minute` — minute K-line / intraday

```bash
stock-sdk minute <symbol> [--period 1|5|15|30|60] [--market a|hk|us] [--limit N]
```

```bash
stock-sdk minute 600519 --period 5
stock-sdk minute AAPL --market us --period 15
```

Interval values are `1` / `5` / `15` / `30` / `60` (minutes); other options match `kline`.

### `indicators` — K-line with technical indicators

Overlay technical indicators on top of the K-line — fetch "K-line + indicators" in one command:

```bash
stock-sdk indicators <symbol> [period indicators] [boolean indicators] [--period ...] [--adjust ...] [--start/--end]
```

```bash
stock-sdk indicators 600519 --ma 5,10,20 --macd --kdj
stock-sdk indicators AAPL --rsi 6,12 --boll --period daily
stock-sdk indicators 600519 --ma              # --ma alone: use the indicator's default periods
```

**Period indicators** (take comma-separated periods; the bare flag uses defaults):

| Flag | Indicator |
|---|---|
| `--ma <p,...>` | Moving average |
| `--rsi <p,...>` | Relative strength |
| `--wr <p,...>` | Williams %R |
| `--bias <p,...>` | Bias ratio |

**Boolean indicators** (toggle on):

`--macd` · `--kdj` · `--boll` · `--cci` · `--atr` · `--obv` · `--roc` · `--dmi` · `--sar` · `--kc`

> The same indicator declarations drive both the `indicators` alias and the namespace-direct `kline withIndicators` — identical flags either way. Indicator meanings: see [Indicators & Signals](/en/guide/indicators).

### `search` — search symbols

```bash
stock-sdk search <keyword> [--limit N]
```

```bash
stock-sdk search "Apple"
stock-sdk search "Apple" --limit 5 --format table
```

### `timeline` — today's intraday

```bash
stock-sdk timeline <code>
```

### `codes` — code lists

```bash
stock-sdk codes <a|hk|us|fund> [--simple] [--board sh|sz|bj|kc|cy]
```

```bash
stock-sdk codes a --board kc        # STAR Market codes
stock-sdk codes hk                  # HK code list (already bare 5-digit codes, no prefix to strip)
stock-sdk codes fund
```

| Option | Description |
|---|---|
| `--simple` | Strip the exchange prefix (e.g. `sh600519` → `600519`; only the A-share/US lists carry prefixes — no effect for hk/fund) |
| `--board sh/sz/bj/kc/cy` | Board filter (A-shares only) |

### `status` — market status

```bash
stock-sdk status [a|hk|us]      # defaults to a
```

### `ztpool` — limit-up stock pool

```bash
stock-sdk ztpool [type] [--date YYYYMMDD]
```

`type`: `zt` (limit-up) / `yesterday` / `strong` / `sub_new` / `broken` / `dt` (limit-down).

```bash
stock-sdk ztpool zt --date 20240301
```

### `call` — raw passthrough

When a method has no alias, or you want to call it with the exact same arguments as in code, use `call` to reach any namespaced method, passing a JSON argument array via `--args`:

```bash
stock-sdk call <ns.method> --args '<JSON array>'
```

```bash
stock-sdk call quotes.cn --args '[["sh600519","sz000858"]]'
stock-sdk call kline.cn --args '["600519",{"period":"weekly"}]'
```

> `--args` is the **full argument array**: each element maps to one parameter of the method in order. Prototype-pollution guarding is built in — keys like `__proto__` / `constructor` are rejected.

### `mcp` — start the MCP server

```bash
stock-sdk mcp
```

Exposes a set of read-only methods as MCP tools (stdio transport) for Cursor / Claude / Codex and friends. The `STOCK_SDK_MCP_TOOLS` environment variable controls the exposed tool set:

| Value | Meaning |
|---|---|
| `core` (default) | Core high-frequency tools |
| `full` | All tools |
| `<comma-separated tool names>` | Custom allowlist |

See the [MCP overview](/en/mcp/) and [setup](/en/mcp/installation).

## Namespace direct

Every namespaced method can be called directly with `<namespace> <method> [args] [--flags]`, the path mapping segment for segment to `sdk.<ns>.<method>`:

```bash
stock-sdk quotes cn 600519 000858
stock-sdk board industry constituents "Banking"
stock-sdk options etf dailyKline 10004336
stock-sdk dragonTiger detail --start 20240101 --end 20240131
```

**Argument shapes**: each method falls into one of 6 argShapes by its signature, deciding how argv maps to arguments:

| argShape | Shape | Example |
|---|---|---|
| `codes[]` | `(codes: string[])` | `stock-sdk quotes cn 600519 000858` |
| `codes+options` | `(codes: string[], options?)` | `stock-sdk batch byCodes 600519 --batchSize 100` |
| `symbol+options` | `(symbol, options?)` | `stock-sdk kline cn 600519 --period weekly` |
| `options` | `(options?)` | `stock-sdk codes cn --simple` |
| `positional` | `(a, b?, ...)` | `stock-sdk options etf expireDay 50ETF 2406` |
| `none` | `()` | `stock-sdk futures inventorySymbols` |

> Namespace commands strictly validate **declared options** (unknown option / invalid enum / missing value / type mismatch all error out); undeclared options pass through to the SDK. The `--start/--end` and `--limit` conventions match the alias commands.

### Namespace method quick-reference

The table below covers all **84** namespaced methods (plus top-level `search`). Method semantics and return fields follow the [API docs](/en/api/) — here we only give the reachable command tokens.

| Namespace | Methods (`stock-sdk <ns> <method>`) |
|---|---|
| `quotes` (8) | `cn` · `cnSimple` · `hk` · `us` · `fund` · `fundFlow` · `largeOrder` · `timeline` |
| `codes` (4) | `cn` · `us` · `hk` · `fund` |
| `batch` (5) | `cn` · `hk` · `us` · `byCodes` · `raw` |
| `kline` (7) | `cn` · `cnMinute` · `hk` · `hkMinute` · `us` · `usMinute` · `withIndicators` |
| `board` (10) | `industry list/spot/constituents/kline/minuteKline` · `concept list/spot/constituents/kline/minuteKline` |
| `options` (11) | `index spot/kline` · `etf months/expireDay/minute/dailyKline/fiveDayMinute` · `commodity spot/kline` · `cffex quotes` · `lhb` |
| `futures` (6) | `kline` · `globalSpot` · `globalKline` · `inventorySymbols` · `inventory` · `comexInventory` |
| `fundFlow` (5) | `individual` · `market` · `rank` · `sectorRank` · `sectorHistory` |
| `northbound` (5) | `minute` · `summary` · `holdingRank` · `history` · `individual` |
| `marketEvent` (3) | `ztPool` · `stockChanges` · `boardChanges` |
| `dragonTiger` (5) | `detail` · `stockStats` · `institution` · `branchRank` · `seatDetail` |
| `blockTrade` (3) | `marketStat` · `detail` · `dailyStat` |
| `margin` (2) | `accountInfo` · `targetList` |
| `fund` (5) | `dividendList` · `navHistory` · `estimate` · `rankHistory` · `profile` |
| `calendar` (4) | `isTradingDay` · `nextTradingDay` · `prevTradingDay` · `marketStatus` |
| `reference` (2) | `dividendDetail` · `tradingCalendar` |
| top-level | `search <keyword>` |

> Not sure about a method's arguments? Run `stock-sdk <ns> <method> --help` to see its positionals and available options (the help text is derived from the manifest, always in sync with the implementation).
