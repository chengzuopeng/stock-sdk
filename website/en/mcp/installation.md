# Installation & Configuration

## Install stock-sdk-mcp

### Option 1: Run with npx (Recommended)

No installation needed — use `npx` directly in the configuration file:

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

### Option 2: Global Installation

```bash
npm install -g stock-sdk-mcp
```

After installation, you can run the `stock-mcp` command directly.

### Option 3: Local Development

```bash
git clone https://github.com/chengzuopeng/stock-sdk-mcp.git
cd stock-sdk-mcp
yarn install
yarn build
```

## Requirements

- Node.js >= 18.0.0
- Supports macOS / Linux / Windows

## AI Tool Configuration Guide

### Cursor IDE

Configuration file: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

After configuration, restart Cursor to use stock query capabilities in conversations.

**Try it out:**

```
Get me the real-time quote for Kweichow Moutai (600519)
```

---

### Claude Desktop

Configuration file path:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

---

### OpenClaw (MCP Gateway)

[OpenClaw](https://github.com/anthropics/clawdbot) is an open-source MCP gateway that aggregates multiple MCP servers into a unified service, accessible via HTTP API from any application.

Edit `~/.clawdbot/config.yaml`:

```yaml
servers:
  stock-sdk:
    command: npx
    args:
      - "-y"
      - "stock-sdk-mcp"
    description: "Stock market data service - A/HK/US real-time quotes and technical analysis"
    tags:
      - finance
      - stock
      - market-data
```

After starting the gateway, call via HTTP API:

```bash
curl -X POST http://localhost:8080/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "stock-sdk",
    "tool": "get_quotes_by_query",
    "arguments": { "queries": ["AAPL", "TSLA"] }
  }'
```

---

### Antigravity (Gemini Pro in VS Code)

Configuration file: `~/.antigravity/mcp.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

---

### Codex CLI (OpenAI)

Configuration file: `~/.codex/config.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

Usage examples:

```bash
codex "Get Apple's real-time stock price"
codex "Analyze the ChiNext index recent technical pattern"
```

---

### Gemini CLI (Google)

Configuration file: `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

Usage examples:

```bash
gemini "What are the hot limit-up concepts in A-shares today?"
gemini "Get Tencent's daily K-line and calculate moving averages"
```

## Debug the MCP Server

You can test the MCP Server by piping JSON-RPC messages:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_quotes_by_query","arguments":{"queries":["AAPL"]}}}' | npx -y stock-sdk-mcp
```
