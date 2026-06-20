# CLI

The `stock-sdk` main package ships a command-line tool, so you can fetch quotes, K-lines, indicators and search results from your terminal — and launch an MCP server — **without writing a single line of code**.

The CLI **shares the same capabilities as the library**. It's a thin shell: parse argv → `new StockSDK()` → call a namespaced method → format the output. Anything the namespaced API can do, the CLI can do too, with a **byte-for-byte identical** data contract.

```text
terminal command ──▶ parse argv ──▶ new StockSDK() ──▶ sdk.<ns>.<method>() ──▶ format output ──▶ exit code
```

> This page covers **install, invocation models, global options, parsing rules, output and exit codes**. For per-command usage and flags, see the [command reference](/en/cli/commands).

## Install & run

The CLI ships with the main package — it's not a separate package, so installing `stock-sdk` gives it to you (`package.json`'s `bin` points to `dist/cli.js`).

::: code-group

```bash [npx (no install)]
# Run once, no install
npx stock-sdk quote sh600519
```

```bash [Global install]
npm install -g stock-sdk
stock-sdk quote sh600519
```

```bash [In a project]
npm exec stock-sdk quote sh600519
# or yarn stock-sdk / pnpm stock-sdk
```

:::

> Requires Node.js >= 18. The CLI runs on Node only and is **zero-dependency** — argv parsing is a hand-written minimal parser, no commander / yargs. The version is injected at build time, so `stock-sdk --version` reads it directly.

## Two ways to invoke

The CLI has two entry layers, covering "quick lookups" and "full capability":

### ① High-frequency aliases (enhanced)

The most common operations are condensed into single-token aliases, each with CLI-specific enhancements (auto market detection, grouping by market for concurrent requests, `--limit` truncation, etc.):

```bash
stock-sdk quote 600519 000858 00700   # mix A-shares + HK in one command, markets auto-detected
stock-sdk kline 600519 --period weekly --adjust hfq --limit 30
stock-sdk indicators 600519 --ma 5,10,20 --macd --kdj
```

Available aliases: `quote` / `kline` / `minute` / `indicators` / `search` / `timeline` / `codes` / `status` / `ztpool` / `call`, plus the special `mcp`. See [command reference · aliases](/en/cli/commands#high-frequency-aliases).

### ② Namespace direct

All **84 namespaced methods** in the library (plus top-level `search`) can be reached directly with `<namespace> <method>`, no per-method alias required:

```bash
stock-sdk board industry list --format table
stock-sdk options etf dailyKline 10004336
stock-sdk dragonTiger detail --start 20240101 --end 20240131
stock-sdk northbound history north --start 20240101 --end 20240201
```

`sdk.board.industry.list()` ↔ `stock-sdk board industry list`, segment for segment. See [command reference · namespace direct](/en/cli/commands#namespace-direct) for the full method map.

### Match priority

When an alias and a namespace path could collide (e.g. alias `kline` vs namespace `kline cn`), the matching rule is:

1. **Namespace paths of ≥2 segments win** — `kline cn 600519` resolves to `sdk.kline.cn`, never stolen by the `kline` alias.
2. Then **single-token aliases** — `kline 600519` hits the enhanced alias (auto market detection).
3. Finally **single-segment namespace methods** — e.g. top-level `search`.

## Global options

These options are command-independent and apply uniformly:

| Option | Description |
|---|---|
| `-f, --format <fmt>` | Output format `json` (default) / `table` / `csv` |
| `--pretty` | Pretty-print JSON (json format only) |
| `--timeout <ms>` | Request timeout in ms (positive integer; passed to `new StockSDK({ timeout })`) |
| `-q, --quiet` | Silent: suppress the "no data" notice on stderr for empty results |
| `-h, --help` | Show help; `stock-sdk <command> --help` shows per-command usage |
| `-V, --version` | Print the version |

```bash
stock-sdk quote 600519 --format table
stock-sdk quote 600519 --pretty
stock-sdk batch cn --timeout 8000 --quiet
stock-sdk kline --help          # see every flag for kline
```

## Parsing rules

The zero-dependency parser supports the following forms (consistent with mainstream CLI conventions):

| Form | Meaning |
|---|---|
| `--key value` | Long option with a value |
| `--key=value` | Long option with a value (equals form) |
| `--flag` | Boolean switch (known boolean flags don't swallow the next token) |
| `-f value` / `-f` | Short option (e.g. `-f table`, `-q`) |
| `--` | Stop option parsing; everything after is positional |
| Repeated `--key a --key b` | Collected into an array (e.g. `--ma 5 --ma 10`) |
| `-5` / `-3.14` | Negative numbers are treated as values/positionals, not short options |

```bash
stock-sdk kline 600519 --period=weekly        # equals form
stock-sdk quote 600519 -f csv                 # short option
stock-sdk search -- --weird-keyword           # no option parsing after --
```

> Conventions: `--start` / `--end` map to the SDK's `startDate` / `endDate`; `--limit N` is a **CLI output-layer** truncation (takes the first N items of a result array), not passed to the SDK, and applies to every command.

## Output format

The CLI **outputs single-line JSON by default** — pipe-friendly, ready for `jq`:

```bash
# Default JSON (compact, single line)
stock-sdk quote sh600519

# Pipe into jq to pick a field
stock-sdk quote sh600519 | jq '.[0].price'

# --pretty to indent
stock-sdk quote sh600519 --pretty
```

Switch to human-friendly formats:

```bash
# Terminal table (zero-dep column alignment, CJK counted as width 2, numeric columns right-aligned)
stock-sdk quote 600519 000858 --format table

# CSV (RFC4180 escaping, redirect to a .csv)
stock-sdk batch cn --format csv > a-share.csv
```

| Value | Use case |
|---|---|
| `json` (default) | Scripts and pipes; `--pretty` for readability |
| `table` | Human viewing in the terminal; auto column alignment |
| `csv` | Export to spreadsheets / data pipelines |

> Whatever the format, **the data contract is identical to the library** — the same `Quote` union and field conventions. Percentages are percentage numbers; price / amount / volume target the same units as the library, but in the current beta runtime values still follow each provider's raw convention.
>
> When the result is empty (`null` / `undefined` / empty array), the CLI prints a "no data" notice to **stderr** (it never pollutes the stdout data stream); `--quiet` turns it off.

## Exit codes

The CLI maps the v2 error taxonomy to stable process exit codes, so scripts can branch on failure class:

| Exit code | Meaning | Mapped errors |
|---|---|---|
| `0` | Success | — |
| `1` | Generic error | uncategorized exceptions |
| `2` | Usage / argument | `CliUsageError`, `INVALID_ARGUMENT`, `INVALID_SYMBOL`, `NOT_FOUND` |
| `3` | Network / timeout | `NETWORK_ERROR`, `TIMEOUT`, `ABORTED` |
| `4` | Upstream / parse | `UPSTREAM_ERROR`, `UPSTREAM_EMPTY`, `PARSE_ERROR`, `HTTP_ERROR` |
| `5` | Rate-limit / circuit | `RATE_LIMITED`, `CIRCUIT_OPEN` |

```bash
stock-sdk quote 600519 || echo "query failed, exit code $?"
```

## Error output

Errors always go to **stderr**, leaving stdout for data only, so the data stream in a pipe is never polluted by errors.

- **Text format** (default/table/csv): `stock-sdk: <CODE>: <message>`, with an extra hint line for usage errors.
- **JSON format** (`--format json`): structured `{ "error": { "code": "...", "message": "..." } }`, easy to parse programmatically.

```bash
stock-sdk quote 999999 --format json 2>err.json; cat err.json
# {"error":{"code":"INVALID_SYMBOL","message":"..."}}
```

## Shares the same capabilities as the library

The CLI doesn't reimplement anything — it consumes the main library's `StockSDK` directly, so:

- **Identical behavior**: the data the CLI returns is **exactly** what you'd get calling the namespaced method in code.
- **Capabilities stay in sync**: when the library adds a method, namespace direct exposes it instantly — no drift between two implementations.
- **Same symbol parsing**: CLI and library use the same `normalizeSymbol` lenient parser, so `sh600519` / `600519` / `00700` / `AAPL` behave identically.

To embed data in your own program, use the [namespaced API](/en/api/); to peek at something in the terminal, the CLI is faster.

## Zero-dependency & entry isolation

The CLI doesn't break the package's "zero-dependency" positioning:

- **No new dependencies**: argv parsing is hand-written, no third-party libs; `npm install stock-sdk` pulls in nothing extra for the CLI.
- **No impact on import size**: the CLI lives behind a **separate entry** (`bin` → `dist/cli.*`), isolated from the library's main entry. When you `import { StockSDK } from 'stock-sdk'`, **not a single byte** of CLI code enters your bundle.
- **One-way dependency**: the CLI may `import` the main library (it's a consumer), but the library **never** references the CLI in reverse.

## Next steps

- [Command reference](/en/cli/commands): every command, every flag, the full namespace method table.
- [MCP overview](/en/mcp/): plug read-only methods into AI tools with a single `stock-sdk mcp`.
- [API overview](/en/api/): use the namespaced API in code.
