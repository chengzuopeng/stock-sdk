# CLI

The `stock-sdk` main package ships a command-line tool, so you can fetch quotes, K-lines and search results from your terminal — and launch an MCP server — **without writing a single line of code**.

The CLI **shares the same capabilities as the library**. It's a thin shell: parse arguments → call `StockSDK` → format the output. Anything the namespaced API can do, the CLI can do too.

## Install & run

The CLI ships with the main package — it's not a separate package, so installing `stock-sdk` gives it to you.

::: code-group

```bash [npx (no install)]
# Run once, no install
npx stock-sdk quote sh600519
```

```bash [Global install]
# Install, then use the stock-sdk command
npm install -g stock-sdk
stock-sdk quote sh600519
```

```bash [In a project]
# Already a project dependency — run via your package manager
npm exec stock-sdk quote sh600519
# or yarn stock-sdk / pnpm stock-sdk
```

:::

> Requires Node.js >= 18. The CLI runs on Node only (not the browser) and is **zero-dependency** — argument parsing is a hand-written minimal parser, no commander / yargs.

## Command overview

The table below illustrates the command shapes. Exact subcommands and flags follow the final implementation.

| Command | Description |
|---|---|
| `stock-sdk quote <code...>` | Fetch real-time quotes for one or more symbols |
| `stock-sdk kline <code>` | Fetch historical K-lines (`--period` for the interval) |
| `stock-sdk search <keyword>` | Search symbols by keyword |
| `stock-sdk mcp` | Start the built-in MCP server (`stdio`) |
| `stock-sdk --help` | Show help and the command list |
| `stock-sdk --version` | Print the version |

### Quotes

`quote` accepts one or more codes. Symbol syntax matches the library — `string` is a first-class citizen, parsed leniently across markets:

```bash
# A-shares
stock-sdk quote sh600519
stock-sdk quote 600519 000001

# HK / US
stock-sdk quote 00700
stock-sdk quote AAPL
```

### K-lines

```bash
# Daily K-line
stock-sdk kline 600519 --period day

# Pick an interval (accepted values follow the implementation)
stock-sdk kline AAPL --period week
```

### Search

```bash
stock-sdk search "Apple"
```

### Start the MCP server

One command exposes a set of read-only methods as MCP tools for AI tools like Cursor / Claude / Codex:

```bash
stock-sdk mcp
```

See the [MCP overview](/en/mcp/) and [per-client setup](/en/mcp/installation).

> The command list is illustrative, not exhaustive. The full set of subcommands, flags and defaults follows `stock-sdk --help` in the released version.

## Output format (`--format`)

The CLI **outputs JSON by default** — pipe-friendly, ready to feed straight into tools like `jq`:

```bash
# Default JSON
stock-sdk quote sh600519

# Pipe into jq to pick a field
stock-sdk quote sh600519 | jq '.[0].price'
```

Use `--format` to switch to a more readable shape (e.g. a table):

```bash
stock-sdk quote sh600519 600519 --format table
```

| Value | Description |
|---|---|
| `json` (default) | Compact JSON, ideal for scripts and pipes |
| `table` | Terminal table, ideal for humans |

> The exact `--format` values follow the implementation. Whatever the format, **the underlying data contract is identical to the library** — the same `Quote` union, the same units (percentages as percentage numbers, prices/amounts in each market's quote currency main unit, volume in shares; exact fields follow the implementation).

## Shares the same capabilities as the library

The CLI doesn't reimplement anything — it consumes the main library's `StockSDK` directly:

```text
terminal command ──▶ parse argv ──▶ new StockSDK() ──▶ sdk.<ns>.<method>() ──▶ format output
```

This means:

- **Identical behavior**: the data the CLI returns is **exactly** what you'd get calling the namespaced method in code.
- **Capabilities stay in sync**: when the library adds a method, the CLI can expose it too — no drift between two implementations.
- **Same symbol parsing**: CLI and library use the same `normalizeSymbol` lenient parser, so `sh600519` / `600519` / `00700` / `AAPL` behave identically.

To embed data in your own program, use the [namespaced API](/en/api/); to peek at something in the terminal, the CLI is faster.

## Zero-dependency note

The CLI doesn't break the package's "zero-dependency" positioning:

- **No new dependencies**: argument parsing is hand-written, no third-party libs; `npm install stock-sdk` pulls in nothing extra for the CLI.
- **No impact on import size**: the CLI lives behind a **separate entry** (`bin` → `dist/cli.*`), isolated from the library's main entry. When you `import { StockSDK } from 'stock-sdk'`, **not a single byte** of CLI code enters your bundle.
- **Only a small package-size bump**: just the `dist/cli.*` build ships with the npm package, and it's small.

> The isolation is one-way: the CLI may `import` the main library (it's a consumer of the library), but the library **never** references the CLI in reverse.

## Next steps

- [MCP overview](/en/mcp/): plug into AI tools with a single `stock-sdk mcp`.
- [API overview](/en/api/): use the namespaced API in code.
- [Installation](/en/guide/installation): package install and subpath imports.
