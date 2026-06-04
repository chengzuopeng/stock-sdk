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
│  69 Tools + 11 Resources + 6 Prompts + 5 Skills │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │           stock-sdk (Core SDK)             │  │
│  │  Quotes / K-line / Indicators / Futures .. │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Core Capabilities

### 69 MCP Tools

Covering all core features of stock-sdk:

- **Real-time Quotes**: A-shares / HK / US stocks / Funds (smart name search)
- **K-line Data**: Daily / weekly / monthly K-line, minute K-line, K-line with technical indicators
- **Sector Data**: Industry / concept sector quotes, constituents, K-line
- **Capital**: Fund flow, northbound funds, Dragon-Tiger list, block trades, margin trading
- **Futures / Options**: Domestic & global futures quotes/inventory, ETF / index / commodity options
- **Compound Analysis**: Full stock analysis, comparison, screening, market overview, sector deep-dive
- **Code Lists / Extended**: Full-market codes, trading calendar, dividends

👉 [View full tool list](/en/mcp/tools)

### 7 Resources + 4 Templates

Static resources the AI can read directly (trading calendar, market code lists, sector lists) plus parameterized resource templates (single-stock quote / K-line, sector detail).

👉 [View full resource list](/en/mcp/tools#resources)

### 5 AI Skills

Skills are **scenario-based wrappers** around the underlying Tools, using predefined Chain-of-Thought (CoT) to guide AI through professional analysis tasks:

| Skill | Description |
|-------|-------------|
| Stock Technical Analyst | Deep K-line pattern and indicator analysis with buy/sell advice |
| Smart Stock Screener | Filter 20,000+ stocks across markets by custom criteria |
| Market Deep Overview | Panoramic scan of indices, sectors, concepts, and sentiment |
| Portfolio Monitor | Real-time position tracking, anomaly detection, P&L calculation |
| Smart Money Tracker | Northbound funds + Dragon-Tiger institutions + block trades + fund flow to track main-force capital |

👉 [View Skills details](/en/mcp/skills)

### 6 MCP Prompts

Built-in preset prompts any MCP client can use directly: `stock-analyst` (technical analysis), `stock-screener` (screening), `market-overview`, `realtime-monitor` (watchlist), `smart-money-tracker`, `futures-overview`.

## Supported AI Tools

| AI Tool | Type | Status |
|---------|------|--------|
| [Cursor](https://cursor.sh) | IDE | ✅ Fully supported |
| [Claude Desktop](https://claude.ai/download) | Desktop app | ✅ Fully supported |
| [OpenClaw](https://github.com/openclaw/openclaw) | MCP Gateway / AI assistant | ✅ Fully supported |
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
