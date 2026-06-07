# Symbols & Codes

stock-sdk v2 funnels the whole "how do I write a ticker" question through a single entry point: `normalizeSymbol`. Whether you write `sh600519`, `600519`, `600519.SH`, or `{ code: '600519' }`, it all resolves to the same internal representation before being handed to each provider adapter.

This page covers two things:

1. How to pass symbols (`string` as the first-class input, plus an optional `SymbolRef`);
2. The fault-tolerant parsing rules, the pure-code ambiguities, and when a hint is **required**.

## Input: string first-class + SymbolRef

Every symbol-accepting method takes `string | SymbolRef`:

```ts
type SymbolInput = string | SymbolRef;

interface SymbolRef {
  code: string;
  market?: 'CN' | 'HK' | 'US' | 'GLOBAL';
  assetType?: 'stock' | 'index' | 'fund' | 'bond' | 'futures' | 'option' | 'board';
  exchange?: string; // 'SSE' | 'SZSE' | 'BSE' | 'HKEX' | 'NASDAQ' | ...
}
```

A bare `string` is the preferred form and covers the vast majority of cases:

```ts
await sdk.quotes.cn('600519');        // A-share
await sdk.quotes.cn(['sh600519', '000001']);
await sdk.quotes.hk('00700');         // Hong Kong
await sdk.quotes.us('AAPL');          // US
```

`SymbolRef` is not a separate system — it's a **"string with hints"**. Its `code` still goes through `normalizeSymbol`; it just carries extra `market` / `assetType` / `exchange` hints to disambiguate. Both forms share one inference path, so there is no dual-implementation drift.

```ts
// Use SymbolRef only when a bare code can't be told apart
await sdk.quotes.fund({ code: '510300', assetType: 'fund' });
```

## normalizeSymbol: unified fault-tolerant parsing

`normalizeSymbol` is exported from `stock-sdk/symbols`. It's a pure function — zero network, works in both browser and Node. Every provider calls it first internally, and you can use it directly to normalize symbols yourself.

```ts
import { normalizeSymbol } from 'stock-sdk/symbols';

normalizeSymbol('sh600519');
// → { market: 'CN', exchange: 'SSE', assetType: 'stock', code: '600519', input: 'sh600519' }

normalizeSymbol('AAPL');
// → { market: 'US', exchange: 'US', assetType: 'stock', code: 'AAPL', input: 'AAPL' }
```

The returned `NormalizedSymbol` is the SDK's single internal representation:

```ts
interface NormalizedSymbol {
  market: 'CN' | 'HK' | 'US' | 'GLOBAL';
  exchange: string;  // the strong discriminator
  assetType: 'stock' | 'index' | 'fund' | 'bond' | 'futures' | 'option' | 'board';
  code: string;      // pure code, no prefix
  variety?: string;  // futures variety (e.g. 'IF' / 'RB')
  input: string;     // original input, for errors and debugging
}
```

> `market` denotes the trading region / system; `exchange` is the strong discriminator. For example, overseas futures fall under `market: 'GLOBAL'` and are distinguished by `exchange` (COMEX / NYMEX / CBOT / LME …).

### Resolution priority chain (first match wins)

`normalizeSymbol(input, hint?)` tries the following rules in order and returns on the first match. When `hint` conflicts with `SymbolRef` fields, the **explicit input (SymbolRef) wins**.

| Order | Rule | Example |
|---|---|---|
| 1 | Dotted form: Eastmoney secid / suffix / futures exchange / board | `1.600519`, `600519.SH`, `CFFEX.IF2412`, `90.BK0475` |
| 2 | Letter prefix | `sh600519`, `sz000001`, `bj430047`, `hk00700`, `usAAPL` |
| 3 | Pure digits | `600519`, `000001`, `00700` |
| 4 | Bare futures contract with hint | `rb2510` (with `assetType:'futures'`) |
| 5 | Pure letters → US stock | `AAPL`, `MSFT` |
| 6 | Parse failure → `throw InvalidSymbolError` | `''`, `@@@` |

### Per-market cheat sheet

| Market | Accepted forms | Normalized result |
|---|---|---|
| A-share (Shanghai) | `sh600519`, `600519`, `600519.SH`, `1.600519` | `CN` / `SSE` / `600519` |
| A-share (Shenzhen) | `sz000001`, `000001`, `000001.SZ`, `0.000001` | `CN` / `SZSE` / `000001` |
| A-share (Beijing) | `bj430047`, `430047`, `920819` | `CN` / `BSE` / `430047` |
| Hong Kong | `00700`, `hk00700`, `700`, `00700.HK`, `116.00700` | `HK` / `HKEX` / `00700` |
| US | `AAPL`, `usAAPL`, `105.AAPL`, `106.BABA` | `US` / `US` (or NASDAQ / NYSE / AMEX) |
| CN futures | `rb2510` (with hint), `CFFEX.IF2412` | `CN` / `SHFE`, `CFFEX` … |
| Board | `90.BK0475` | `CN` / `SSE` / `board` |

> Hong Kong codes shorter than 5 digits are zero-padded: `700` → `00700`, `hk700` → `00700`.
> US tickers are upper-cased: `aapl` → `AAPL`.

## Pure-code inference and ambiguity

When you supply only a pure code (no prefix, no suffix, no hint), inference follows these defaults:

| Shape | Default inference | Exchange refinement |
|---|---|---|
| 6 pure digits | A-share stock | starts with `6/5/9` → SSE; `0/3` → SZSE; `4/8` or the `92` range → BSE |
| 5 / 4 pure digits | Hong Kong stock | zero-padded to 5 digits |
| Pure letters | US stock | — |

Pure-code inference is "most-common-wins", so **some cases simply cannot be told apart from the code alone** and require a hint or `SymbolRef`.

### Known ambiguities that require a hint

**① Fund vs. stock (overlapping code ranges)**

On-exchange fund / ETF code ranges overlap with stock code ranges; a bare code can't distinguish them, so declare the asset type explicitly:

```ts
// Without a hint this is treated as a stock
await sdk.quotes.fund({ code: '510300', assetType: 'fund' });
// or
normalizeSymbol('510300', { assetType: 'fund' });
```

**② Index vs. stock (both 6 digits)**

For example, `000001` is both the Shanghai Composite Index and Ping An Bank. A bare code defaults to stock; to mean the index, add a hint:

```ts
normalizeSymbol('000001', { assetType: 'index' });
```

**③ A/B-share five-digit codes instead of Hong Kong**

A 5-digit pure code defaults to Hong Kong. If you truly mean a 5-digit A/B-share code, specify the market explicitly:

```ts
normalizeSymbol('90001', { market: 'CN' });
```

**④ Overseas futures bare contracts**

Futures with `market: 'GLOBAL'` must provide an explicit `exchange`; they will not default to a domestic exchange:

```ts
normalizeSymbol('GC', { market: 'GLOBAL', exchange: 'COMEX' });
// Missing exchange throws InvalidSymbolError
```

> Rule of thumb: **prefer an explicit form** (prefix / suffix / secid) whenever it expresses your intent (e.g. `sh000001` for the Shanghai Composite). Use a hint only when the system genuinely lacks enough information.

## Parse failure: InvalidSymbolError

Unparseable input throws `InvalidSymbolError` (a subclass of `SdkError`, with `code` `INVALID_SYMBOL`), carrying the original input for diagnosis:

```ts
import { normalizeSymbol } from 'stock-sdk/symbols';
import { InvalidSymbolError } from 'stock-sdk/errors';

try {
  normalizeSymbol('');
} catch (e) {
  if (e instanceof InvalidSymbolError) {
    console.log(e.code); // 'INVALID_SYMBOL'
  }
}
```

See [Errors & Retry](/en/guide/retry) for the full error system.

> The type fields above are subject to the final implementation; the resolution priority and known ambiguities are stable conventions.
