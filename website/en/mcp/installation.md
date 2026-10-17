# MCP Installation

`stock-sdk`'s MCP server talks to clients over **stdio**, and the launch command is always `stock-sdk mcp`. In each AI client you simply register it as a stdio-type MCP server.

The examples below launch via `npx` (no pre-install needed; `-y` skips the interactive prompt):

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-sdk", "mcp"]
}
```

The default starts 26 high-frequency tools. To expose all 92 MCP tools, add the environment variable:

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-sdk", "mcp"],
  "env": { "STOCK_SDK_MCP_TOOLS": "full" }
}
```

> You can also `npm install -g stock-sdk` first, then set `command` to `"stock-sdk"` and `args` to `["mcp"]`, saving the `npx` resolution cost on each start.

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

### Optional: company-news research with Parallel

To research the news behind a market move, pair stock-sdk's quotes and K-lines with [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp). It provides web search and page fetching without an account or API key; anonymous searches use Fast mode and have lower rate limits.

Keep the stock-sdk entry above and add this separate server to `~/.codex/config.toml` using a [Codex client with Streamable HTTP support](https://developers.openai.com/codex/mcp):

```toml
[mcp_servers.parallel-search]
url = "https://search.parallel.ai/mcp"
http_headers = { "User-Agent" = "stock-sdk-research/1.0" }
```

Restart Codex and confirm that it lists stock-sdk's market-data tools alongside Parallel's `web_search` and `web_fetch`. The client connects to each server independently: stock-sdk still uses stdio, and Parallel uses remote HTTP. This setup adds no SDK dependency and does not change stock-sdk's tool selection.

Example research request:

> Get the latest available A-share quote and daily candles for sh600519 with stock-sdk. Use Parallel to search for company announcements and news published in the last seven days, then fetch the relevant source pages. Prefer company and exchange notices. Report the quote timestamp, each source's publication date and URL, and distinguish reported facts from possible explanations of the price move. If no recent source is found, say so.

Check the quote timestamp and trading calendar before comparing prices with publication dates. Web pages provide research context, not a replacement for market-data tools, and a matching date alone does not establish why a price changed.

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
