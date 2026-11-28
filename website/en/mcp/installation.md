# MCP Installation

Both `stock-sdk` (93 tools, zero-dep) and `stock-node-sdk` (104 tools, multi-source failover + financials/news/announcements) run over **stdio** via `stock-sdk mcp` or `stock-node-sdk mcp`.

The examples below launch via `npx` (`stock-node-sdk` is recommended for AI clients; swap to `stock-sdk` if you want the zero-dependency edition):

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-node-sdk@beta", "mcp"]
}
```

By default, the high-frequency `core` tool tier is enabled. To expose all tools (93 in `stock-sdk` / 104 in `stock-node-sdk`), set `STOCK_SDK_MCP_TOOLS=full`. `stock-node-sdk mcp` also accepts `--cache-dir`, `--proxy`, `--source`, and `--overseas=false`:

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-node-sdk@beta", "mcp", "--cache-dir", "./.stock-cache"],
  "env": { "STOCK_SDK_MCP_TOOLS": "full" }
}
```

> You can also install globally (`npm install -g stock-node-sdk@beta` or `stock-sdk`), then set `command` to `"stock-node-sdk"` and `args` to `["mcp"]` to skip `npx` startup overhead.

## Cursor

Create/edit `.cursor/mcp.json` in your project root (or the global config dir):

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

After saving, enable `stock-sdk` in Cursor's MCP settings to call the market-data tools in chat.

## Claude Desktop

Edit the Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

After saving, **restart Claude Desktop**; the `stock-sdk` tool icon should appear in the toolbar.

## Codex

Add a server entry to Codex's MCP config (TOML):

```toml
[mcp_servers.stock-sdk]
command = "npx"
args = ["-y", "stock-sdk", "mcp"]
```

## Gemini

Add `mcpServers` to the Gemini CLI `settings.json`:

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

## Verify the connection

The server uses stdio and is normally spawned by the client — no need to run it by hand. To manually confirm it starts in a terminal:

```bash
npx -y stock-sdk mcp
```

The process waits for JSON-RPC messages (such as `initialize`) on stdin. Once a client is connected, ask the model to "list available tools" to confirm the handshake succeeded.

> Config file paths and field names may vary across client versions — follow each client's official docs. This page only fixes the `stock-sdk mcp` launch entry.

## Next steps

- [MCP Tool Table](/en/mcp/tools): the tools available once connected.
- [AI Skills](/en/skills/): compose tools into higher-level skills like technical analysis and smart screening.
