# AI Skills

## What are Skills?

Skills are **scenario-based wrappers** around the underlying MCP Tools. They go beyond simple API calls by using a Chain-of-Thought (CoT) approach to guide AI through step-by-step market analysis.

Each Skill is a `SKILL.md` file containing:

- **YAML Frontmatter**: Name, description, required MCP servers
- **Role Definition**: Tells the AI what role to play (e.g., "Technical Analyst")
- **Execution Steps**: Clear, sequential operation instructions
- **Output Template**: Structured report format

## Built-in Skills

### Stock Technical Analyst

**Use Cases:** Individual stock diagnosis, buy/sell point evaluation, MACD / KDJ pattern recognition

**Trigger Phrases:**
- "Analyze XXX's technical trend"
- "What's XXX's recent MACD like?"
- "Should I buy XXX?"

**Execution Flow:**

1. Call `get_quotes_by_query` to get real-time quotes
2. Call `get_kline_with_indicators` to get multi-indicator K-line data
3. Analyze MA alignment, MACD crossovers, KDJ overbought/oversold, RSI, Bollinger Band position
4. Output structured technical analysis report with trend judgment, support/resistance levels, and recommendations

**Output Example:**

```markdown
## 📈 Technical Analysis Report: Kweichow Moutai (600519)

### Basic Info
- Current Price: ¥1474.92
- Today's Change: +3.36%

### Technical Indicator Analysis
- **MACD**: DIF crosses above DEA, red bars expanding, short-term bullish
- **KDJ**: K=75, D=68, J=89, high but not overbought
- **RSI(6)**: 68.5, approaching overbought zone

### Recommendation
Short-term technically bullish, but RSI approaching overbought zone.
Wait for pullback before entering or set stop-loss...

### ⚠️ Risk Disclaimer
Technical analysis is for reference only. Not investment advice.
```

---

### Smart Stock Screener

**Use Cases:** Finding limit-up stocks, screening undervalued blue chips, sector leader identification

**Trigger Phrases:**
- "Find the top 10 STAR Market stocks by gain today"
- "Screen for banking stocks with P/E below 30"
- "Which concept sectors gained more than 3% today?"

**Execution Flow:**

1. Define screening scope (market / sector / index)
2. Call batch quote tools to get comprehensive data
3. Filter and sort by user criteria
4. Output list of qualifying stocks

---

### Market Deep Overview

**Use Cases:** Opening commentary, closing review reports, hotspot tracking

**Trigger Phrases:**
- "How's the market performing right now?"
- "What hot concepts are worth following today?"
- "Give me a market review report for today"

**Execution Flow:**

1. Get major indices (SSE / SZSE / ChiNext) real-time quotes
2. Scan industry and concept sector rankings
3. Analyze market sentiment (advance/decline ratio, limit-ups, volume)
4. Output panoramic analysis report

---

### Portfolio Monitor

**Use Cases:** Portfolio watching, price alerts, post-investment management

**Trigger Phrases:**
- "Check my positions: Moutai bought at 1400, Meituan bought at 120"
- "Watch BYD for me, alert if it drops below 250"
- "What's my portfolio P&L today?"

**Execution Flow:**

1. Batch fetch real-time quotes for watched stocks
2. Compare with user's cost basis to calculate P&L
3. Detect anomalies (significant swings / volume spikes / key price levels)
4. Output position P&L table and alert information

## Using Skills in AI Tools

### OpenClaw (Recommended)

OpenClaw can perfectly parse Skill folders. Add to `~/.clawdbot/config.yaml`:

```yaml
skills:
  directories:
    - /path/to/stock-sdk-mcp/skills
```

OpenClaw will automatically convert `SKILL.md` YAML frontmatter into Agent Metadata and load them.

### Cursor

Save Skill contents as rule files in `.cursor/rules/`:

```
.cursor/rules/stock-analyst.md
.cursor/rules/stock-screener.md
.cursor/rules/market-overview.md
.cursor/rules/realtime-monitor.md
```

### Custom Skills

You can write your own analysis skills following the built-in Skill format:

1. **Self-contained description**: Skills must include a clear role definition
2. **Multi-modal friendly**: Output should use Markdown tables or structured formats
3. **Error handling**: Tell the AI how to handle empty results gracefully
4. **Tool references**: Use JSON call format for tools like `get_kline_with_indicators`

```yaml
---
name: my-custom-skill
description: Custom analysis skill
version: "1.0"
requires:
  mcp_servers:
    - stock-sdk
---

# Custom Analysis Skill

## Description
You are a...

## Execution Steps
1. ...
2. ...
```
