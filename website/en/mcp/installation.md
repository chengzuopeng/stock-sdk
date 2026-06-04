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

### OpenClaw (MCP Gateway / AI Assistant)

[OpenClaw](https://github.com/openclaw/openclaw) (formerly Clawdbot) is an open-source, MCP-capable AI assistant that can load external MCP servers.

Option 1: register via CLI

```bash
openclaw mcp add stock-sdk --command npx --arg -y --arg stock-sdk-mcp
openclaw mcp doctor stock-sdk --probe   # verify connectivity
```

Option 2: edit `~/.openclaw/openclaw.json` under `mcp.servers`:

```json
{
  "mcp": {
    "servers": {
      "stock-sdk": {
        "command": "npx",
        "args": ["-y", "stock-sdk-mcp"]
      }
    }
  }
}
```

> Refer to the [OpenClaw docs](https://docs.openclaw.ai/cli/mcp) for the exact commands and configuration.

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
