# AI Skills (MCP Prompts)

MCP tools are "atomic capabilities" — each fetches one kind of data, called on demand by the model. **Skills** are scenario-oriented, higher-level capabilities: they package "which tools to call, how to compute, how to summarize" into an expert-authored template, exposed through the MCP **Prompts** capability so a user can trigger a whole analysis pipeline with one click.

Skills are real MCP Prompts (`prompts/list` + `prompts/get`); the server declares `capabilities.prompts` at `initialize`. Prompts-aware clients (Claude Desktop, Claude Code, Cursor, Cline, …) render each skill as a **slash-command / template option**.

## How a skill works

Key mental model: **the server does not execute the skill**. `prompts/get` merely hands the client's model a parameter-filled "task briefing" that names which real tools to call. The multi-step execution is done by the client-side model plus its `tools/call` loop.

A full `analyze_stock` interaction:

1. **Discover**: on connect the client sends `prompts/list`, rendering skills as slash-commands / templates.
2. **Pick + fill**: the user picks `analyze_stock` and fills `symbol` (required) and `period` (optional, default daily).
3. **Fetch template**: the client sends `prompts/get`; the server interpolates the briefing and returns one `user` message.
4. **Inject**: the briefing becomes the opening content of the user turn — the server bows out here.
5. **Model runs**: the model issues `tools/call` in order (`search` → `get_kline_with_indicators` → `get_kline_signals`).
6. **Answer**: the model responds in the structure the template dictates, **in the user's language** (every template ends with "respond in the user's language" — the instructions are English, but a Chinese question still gets a Chinese analysis).

So a skill's value isn't "unlocking capability" — it's **standardized orchestration + fewer missed/mis-called tools + a one-click entry for non-experts + a uniform disclaimer and safety discipline**.

## Built-in skills (7)

Skills are split into `core` (on by default) and `full` (needs `STOCK_SDK_MCP_PROMPTS=full` or an explicit list), filtered independently from the tool tier.

### Core (4 by default)

| Skill | Arguments | Underlying tools | What it does |
|---|---|---|---|
| `analyze_stock` | `symbol` (required), `period` (default daily) | `search` / `get_kline_with_indicators` / `get_kline_signals` | Full single-symbol technical analysis: klines + indicators + signals, summarized |
| `screen_stocks` | `criteria` (required), `scope` (default whole market) | board constituents / `get_fund_flow_rank` / `get_a_share_quotes` / indicators / signals | Screening: coarse-filter first, then indicators on candidates; ranked shortlist |
| `market_overview` | none | `get_market_status` / `get_zt_pool` / `get_northbound_flow_summary` / `get_fund_flow_rank` | Today's brief: status + limit-up breadth + northbound + main-force direction |
| `monitor_watchlist` | `symbols` (required, comma-separated) | `get_a_share_quotes` / `get_today_timeline` / `get_individual_fund_flow` / `get_kline_signals` | Single-shot watchlist check: batch quotes, drill into threshold-crossers |

Example:

> Analyze the recent technical setup for Kweichow Moutai (sh600519) — any golden-cross signal?

### Full (3 advanced)

| Skill | Arguments | Underlying tools | What it does |
|---|---|---|---|
| `analyze_capital_flow` | `symbol` (optional) | per-stock/market fund flow / dragon-tiger + seats / block trades / margin / northbound | Smart-money read: cross-confirm accumulation vs. distribution across sources |
| `analyze_fund` | `fundCode` (required, 6-digit) | `get_fund_profile` / `get_fund_nav_history` / `get_fund_rank_history` / `get_fund_estimate` | Fund review: profile + NAV history + category ranking + intraday estimate |
| `diagnose_stock` | `symbol` (required) | indicators + signals / fund flow / dragon-tiger stats / chip distribution | Multi-factor diagnosis: technical + capital + chips, scored |

> `analyze_capital_flow` is the natural consumer of the block-trade / margin tools.

## Enable & trigger

Every MCP client uses the same entry `npx -y stock-sdk mcp`; only the config path and UI entry differ. For Claude Desktop (`claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"],
      "env": {
        "STOCK_SDK_MCP_TOOLS": "full",     // tool tier (existing)
        "STOCK_SDK_MCP_PROMPTS": "full"    // skill tier (defaults to core)
      }
    }
  }
}
```

- **Claude Code**: `claude mcp add stock-sdk -e STOCK_SDK_MCP_PROMPTS=full -- npx -y stock-sdk mcp`; skills appear as slash-commands like `/mcp__stock-sdk__analyze_stock`.
- **Cursor / Cline**: paste the same `mcpServers` JSON into `.cursor/mcp.json` or the extension's MCP settings.

`STOCK_SDK_MCP_PROMPTS` accepts `core` (default, 4) / `full` (all 7) / a comma-separated skill list. Clients without Prompts support simply see only the tools — unaffected.

::: warning Full skills need the full tool set
Skill tier and tool tier filter **independently**. The 3 full skills (`analyze_capital_flow` / `analyze_fund` / `diagnose_stock`) name full-tier tools, so when you enable full skills you **must also** set `STOCK_SDK_MCP_TOOLS=full`. If you set only `STOCK_SDK_MCP_PROMPTS=full` while tools stay at the default `core`, the model hits an "Unknown tool" when its orchestration reaches a full-tier tool. The server logs a stderr warning on startup if it detects this mismatch. The example config above already pairs both — copy it as-is.
:::

## Read-only safety

Every skill sits on **read-only** tools, and each template ends with an explicit "read and analyze only — never place orders or move funds; if data is missing, say so". Compared with order-capable financial MCPs, that's a clear safety boundary.

## Next steps

- [MCP Overview](/en/mcp/): protocol and zero-dependency implementation.
- [MCP Tool Table](/en/mcp/tools): the atomic tools skills build on (incl. the `get_kline_signals` tool).
- [Technical Indicators](/en/guide/indicators): the indicator and signal computation layer.
