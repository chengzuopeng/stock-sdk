# MCP Overview

Both `stock-sdk` and `stock-node-sdk` ship a built-in MCP (Model Context Protocol) server that starts with a single command, exposing read-only financial market data to AI tools like Cursor / Claude Desktop / Codex / Gemini.

::: tip Recommended for AI clients: `stock-node-sdk mcp`
Because local MCP servers already run on Node.js 18+, **`npx -y stock-node-sdk mcp`** (104 tools) is recommended — giving your AI agent automatic multi-source failover, CN/HK/US financial statements, 24/7 news flashes, official disclosures (Eastmoney/CNINFO, HKEXnews, SEC EDGAR), plus `--cache-dir` / `--proxy` / `--source` / `--overseas=false` flags. Use `npx -y stock-sdk mcp` (93 tools) if you prefer the zero-dependency edition.
:::

```bash
npx -y stock-node-sdk mcp   # Node Enhanced (104 tools + automatic failover)
npx -y stock-sdk mcp        # Zero-dep Base (93 tools)
```

## One-command start

The MCP server ships with the main package — no extra protocol library to install. The two common ways to launch it:

```bash
# Start once via npx (most common inside an AI client config)
npx -y stock-sdk mcp

# Or install globally and call it directly
npm install -g stock-sdk
stock-sdk mcp
```

The server talks to the client over **stdio** (standard input/output) and listens on no network port. For per-client configuration, see [MCP Installation](/en/mcp/installation).

## Design highlights

### Zero-dependency, hand-written protocol

MCP is essentially **JSON-RPC 2.0 over newline-delimited (NDJSON) stdin/stdout**. `stock-sdk` does **not** pull in `@modelcontextprotocol/sdk`; instead it **hand-writes the minimal subset** of the protocol, preserving the main package's zero-runtime-dependency stance.

The server exposes read-only market-data tools and analysis prompts over `stdio`. Clients negotiate capabilities with `initialize`, discover and invoke tools with `tools/list` and `tools/call`, and discover and retrieve prompts whose tools are available with `prompts/list` and `prompts/get`.

### No impact on bundle size or zero-dependency

Both the CLI and MCP live behind a **separate entry** (`stock-sdk/mcp`), strictly one-way isolated from the main library:

- When you `import { StockSDK } from 'stock-sdk'`, **not a single byte of MCP code enters your bundle**.
- MCP itself has **zero third-party dependencies** — it neither lands in your bundle nor grows the main package's `node_modules`.
- Only the compiled artifact `dist/mcp.*` ships in the npm package, adding slightly to the tarball.

### Tools derived from read-only namespace methods

Each tool the server exposes maps to a **read-only namespace method** of the SDK (e.g. `quotes` / `kline` / `search`). Every tool is an explicit declaration — `name`, `description`, a hand-written JSON Schema `inputSchema`, and an `invoke` that maps args explicitly onto the SDK call — collected into a single manifest as the single source of truth (SSOT), shared with the CLI. See the [MCP tool table](/en/mcp/tools).

## Protocol version

The server keeps a **supported-versions array** and negotiates during `initialize`, falling back to a version both sides support. It tracks the current MCP spec's stable version and stays backward-compatible with the previous stable one. Exact values follow the implementation and the current MCP spec.

## Next steps

- [MCP Installation](/en/mcp/installation): connect Cursor / Claude Desktop / Codex / Gemini.
- [MCP Tool Table](/en/mcp/tools): the available tools at a glance.
- [AI Skills](/en/skills/): built-in skills like technical analysis, smart screening, market overview and live monitoring.
