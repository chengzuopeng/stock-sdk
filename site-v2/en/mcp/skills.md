# AI Skills

MCP tools are "atomic capabilities" — each fetches one kind of data in a single call. **Skills** sit on top of the tools and provide scenario-oriented, higher-level capabilities: they compose multiple fetches, indicator calculations and signal detection into one complete analytical intent, so an AI client can drive an entire analysis pipeline from a single natural-language request.

> Skills are built by composing the read-only tools from the [MCP tool table](/en/mcp/tools) with the pure-computation capabilities of `stock-sdk/indicators` and `stock-sdk/signals`. The exact skill list and triggers follow the implementation.

## Built-in skills

### Technical analysis

Full technical analysis of a single symbol: fetch historical K-line → overlay indicators like MA / MACD / BOLL / KDJ / RSI (`stock-sdk/indicators`) → detect signals such as golden / death cross and overbought / oversold (`stock-sdk/signals`), then have the model summarize a readable conclusion.

Example prompt:

> Analyze the recent technical setup for Kweichow Moutai (sh600519) — any golden-cross signal?

### Smart screening

Filter symbols across the whole market or a given board by conditions: batch-fetch quotes / K-lines → compute indicators and signals → filter and rank by price change, turnover rate, indicator crossovers, etc., returning a candidate list. Can be combined with backtesting to validate a strategy.

Example prompt:

> Find A-shares with a MACD golden cross today and a turnover rate above 5%.

### Market overview

A quick snapshot of the day's market: limit-up pool, stock changes, board changes, northbound capital, industry / concept board performance — summarized into a "today's market brief".

Example prompt:

> How's the A-share market overall right now? Which stocks hit limit-up, and is northbound capital flowing in or out?

### Live monitoring

Watch-list-style monitoring of a set of symbols: pull live quotes and intraday timeline, large orders and fund flow, and flag symbols that cross thresholds (price change, volume surge, large-order inflow, etc.).

Example prompt:

> Keep an eye on my watch-list — tell me if any of them surges on volume.

## How it works

Each Skill is essentially an orchestration of "**a set of tool calls + computation + model synthesis**":

1. The model understands the user's intent and picks the matching skill.
2. It fetches data on demand through MCP tools (quotes / K-lines / fund flow / market events, etc.).
3. It computes indicators and signals via `stock-sdk/indicators` and `stock-sdk/signals`.
4. The model synthesizes the structured results into a natural-language conclusion.

Because everything underneath is **read-only**, Skills **never** place orders or move money — they only fetch and analyze data.

## Next steps

- [MCP Overview](/en/mcp/): protocol and zero-dependency implementation.
- [MCP Tool Table](/en/mcp/tools): the atomic tools the skills build on.
- [Technical Indicators](/en/guide/indicators): the indicator and signal computation layer.
