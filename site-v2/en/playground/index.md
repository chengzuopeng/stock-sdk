# Playground

An interactive area to call stock-sdk v2 right in your browser and inspect the responses instantly.

## Coming soon

The Playground is being wired up alongside the v2 SDK implementation. The v1 docs site already ships a set of interactive, per-method components (16 categories, editable parameters, run in place); they will be migrated to the v2 site with every call rewritten from v1's flat style to **namespaced calls**:

```ts
// v1 (old)
const [quote] = await sdk.getFullQuotes(['sh600519'])

// v2 (the style the Playground will use)
const [quote] = await sdk.quotes.cn(['sh600519'])
```

Once it's live, you'll be able to:

- Pick a namespace and method (`sdk.quotes.cn` / `sdk.kline.cn` / `sdk.options.etf.dailyKline`, etc.)
- Edit symbols and parameters — symbols accept forgiving `string` parsing (`sh600519` / `600519` / `00700` / `AAPL` all work)
- Run with one click and inspect responses that follow the v2 data contract (the unified `Quote` union, minimal currency units, `timestamp: number | null`)

> Status: to be wired up once the v2 SDK implementation lands. This page will then be replaced with the real interactive component — the link stays the same.

## Start here

Until the Playground is live, follow the readable examples in the docs and run them yourself:

- [Quick Start](/en/guide/getting-started) — a 10-line namespaced demo to get your first call working
- [Installation](/en/guide/installation) — npm / yarn / pnpm, subpath imports (`stock-sdk/indicators`, `/signals`, `/symbols`)
- [API Reference](/en/api/) — the namespace map plus each method's signature, parameters, and return notes
- [Symbols & Code Rules](/en/guide/symbols) — `string` vs `SymbolRef`, and forgiving parsing via `normalizeSymbol`

Every code block in the docs is a copy-paste-runnable namespaced snippet; the Playground just moves them into the browser with instant execution.
