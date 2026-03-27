# MCP & AI Capabilities

## What is MCP?

**MCP (Model Context Protocol)** is an open protocol proposed by Anthropic for connecting AI models with external data sources and tools. Through MCP, AI assistants can securely access real-time data and call external services without hardcoding API calls.

Stock SDK's companion MCP Server — [stock-sdk-mcp](https://www.npmjs.com/package/stock-sdk-mcp) — instantly gives your AI assistant professional stock market data capabilities.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         AI Client (Cursor / Claude etc.)         │
│                                                 │
│  "Analyze TSLA's recent MACD trend"             │
└────────────────────┬────────────────────────────┘
                     │ MCP Protocol (JSON-RPC / stdio)
                     ▼
┌─────────────────────────────────────────────────┐
│              stock-sdk-mcp Server               │
│                                                 │
│  32 Tools + 7 Resources + 4 Skills              │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │           stock-sdk (Core SDK)             │  │
│  │  Quotes / K-line / Indicators / Futures .. │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Core Capabilities

### 32 MCP Tools

Covering all core features of stock-sdk:

- **Real-time Quotes**: A-shares / HK / US stocks / Funds (smart name search)
- **K-line Data**: Daily / weekly / monthly K-line, minute K-line, K-line with technical indicators
- **Sector Data**: Industry / concept sector quotes, constituents, K-line
- **Code Lists**: Full market A / HK / US / fund codes
- **Extended Data**: Fund flow, large orders, trading calendar, dividends

👉 [View full tool list](/en/mcp/tools)

### 7 MCP Resources

Static data resources that AI can proactively read, including trading calendars, market code lists, and sector lists.

👉 [View full resource list](/en/mcp/tools#resources)

### 4 AI Skills

Skills are **scenario-based wrappers** around the underlying Tools, using predefined Chain-of-Thought (CoT) to guide AI through professional analysis tasks:

| Skill | Description |
|-------|-------------|
| Stock Technical Analyst | Deep K-line pattern and indicator analysis with buy/sell advice |
| Smart Stock Screener | Filter 20,000+ stocks across markets by custom criteria |
| Market Deep Overview | Panoramic scan of indices, sectors, concepts, and sentiment |
| Portfolio Monitor | Real-time position tracking, anomaly detection, P&L calculation |

👉 [View Skills details](/en/mcp/skills)

## Supported AI Tools

| AI Tool | Type | Status |
|---------|------|--------|
| [Cursor](https://cursor.sh) | IDE | ✅ Fully supported |
| [Claude Desktop](https://claude.ai/download) | Desktop app | ✅ Fully supported |
| [OpenClaw](https://github.com/anthropics/clawdbot) | MCP Gateway | ✅ Fully supported (recommended) |
| [Antigravity](https://code.visualstudio.com/) | VS Code extension | ✅ Fully supported |
| [Codex CLI](https://github.com/openai/codex) | Terminal tool | ✅ Fully supported |
| [Gemini CLI](https://github.com/google/gemini-cli) | Terminal tool | ✅ Fully supported |

👉 [View detailed setup guide](/en/mcp/installation)

## Quick Start

Just two steps to give your AI stock data capabilities:

**Step 1**: Add to your AI tool's MCP configuration:

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

**Step 2**: Restart your AI tool and start chatting:

```
> Analyze Tencent's recent MACD trend. Is there a golden cross?
> Find me the top 10 STAR Market stocks by gain today
> What are the constituents of the AI concept sector?
```

The AI will automatically call stock-sdk-mcp tools to fetch real-time data and perform analysis.
