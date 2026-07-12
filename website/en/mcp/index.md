# MCP Overview

`stock-sdk` ships a built-in MCP (Model Context Protocol) server that starts with a single command. It exposes the SDK's read-only market-data capabilities to AI tools like Cursor / Claude Desktop / Codex / Gemini, letting the model fetch live quotes, K-lines, search results and more directly.

```bash
stock-sdk mcp
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

The scope is deliberately nailed down to what a market-data scenario actually needs:

- **Transport**: `stdio` only — no HTTP / SSE.
- **Capability**: `tools` only — no resources / prompts / sampling.
- **Methods handled**: `initialize` (handshake and capability negotiation), `notifications/initialized`, `ping`, `tools/list`, `tools/call`.

Explicitly **out of scope**: HTTP / SSE transport, OAuth, sampling, progress / cancellation, resources / prompts subscriptions, and the client side. A "batch of read-only methods" scenario barely needs these advanced features — extend later or reassess switching to the official SDK if ever required.

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
