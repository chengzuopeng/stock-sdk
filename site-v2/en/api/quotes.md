# sdk.quotes · Real-time Quotes

The `sdk.quotes` namespace provides real-time / snapshot quotes per market: A-share full and simple, HK, US, fund, plus fund flow (simple), large orders and intraday timeline.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const list = await sdk.quotes.cn(['600519', '000001'])
```

## Methods

| Method | Description |
|---|---|
| `quotes.cn(codes)` | A-share full quotes (five-level bid/ask, turnover rate, PE/PB, limit-up/down, etc.) |
| `quotes.cnSimple(codes)` | A-share simple quotes (trimmed fields, cheaper) |
| `quotes.hk(codes)` | HK quotes |
| `quotes.us(codes)` | US quotes |
| `quotes.fund(codes)` | Fund quotes (unit NAV / accumulated NAV) |
| `quotes.fundFlow(codes)` | Fund flow (simple, Tencent source) |
| `quotes.largeOrder(codes)` | Large orders |
| `quotes.timeline(code)` | Intraday timeline |

> **`quotes.fundFlow` vs `sdk.fundFlow.*`**: the former is the simple fund flow (Tencent source, returned with the quote snapshot); the latter is the deep fund flow (Eastmoney source, with individual / market / rank / sector history). They differ in source and dimensions — see [fundFlow](/en/api/fund-flow).

## Examples

### A-share quotes

```ts
// Input is an array of codes; symbol forms are lenient: bare / prefixed / secid
const quotes = await sdk.quotes.cn(['600519', 'sh601318', '000001'])

for (const q of quotes) {
  console.log(q.name, q.price, q.changePercent)
}
```

### A-share simple quotes

```ts
// Fewer fields, cheaper — good for polling watchlists / market boards
const simple = await sdk.quotes.cnSimple(['600519', '000858'])
```

### HK / US

```ts
const hk = await sdk.quotes.hk(['00700', '09988']) // 5-digit → HK
const us = await sdk.quotes.us(['AAPL', 'TSLA']) // pure letters → US
```

### Fund

```ts
const fund = await sdk.quotes.fund(['161725'])
console.log(fund[0].nav, fund[0].accNav) // unit NAV / accumulated NAV
```

### Large orders / intraday timeline

```ts
const orders = await sdk.quotes.largeOrder(['600519'])
const timeline = await sdk.quotes.timeline('600519') // single code
```

## Return: the Quote discriminated union

A-share / HK / US / fund quotes return a **union discriminated by `assetType`** named `Quote`. Narrow with `switch` first, then access market-specific fields:

```ts
const [q] = await sdk.quotes.cn(['600519'])

switch (q.assetType) {
  case 'stock':
    console.log(q.bid, q.ask, q.turnoverRate, q.pe) // A-share specific
    break
  case 'fund':
    console.log(q.nav, q.accNav) // fund specific
    break
}
```

### Base fields (shared by all quotes)

| Field | Type | Description |
|---|---|---|
| `symbol` | `string` | Normalized standard symbol |
| `code` | `string` | Bare code (no prefix, e.g. `600519`) |
| `name` | `string` | Name |
| `market` | `'CN' \| 'HK' \| 'US' \| 'GLOBAL'` | Trading region |
| `assetType` | `'stock' \| 'fund' \| ...` | Asset type (union discriminant) |
| `exchange` | `string` | Exchange (e.g. `SSE` / `HKEX` / `NASDAQ`) |
| `currency` | `string` | ISO quote currency (`CNY` / `HKD` / `USD`); determines the unit of amounts / prices below |
| `source` | `string` | Data source (`tencent` / `eastmoney` / `sina`) |
| `time` | `string` | Raw time string (market timezone) |
| `timestamp` | `number \| null` | UTC ms; `null` when unparseable |
| `tz` | `MarketTz` | Market timezone |

### Quote fields (stock-type)

| Field | Type | Description |
|---|---|---|
| `price` | `number` | Current price (base quote currency) |
| `prevClose` / `open` / `high` / `low` | `number` | Prev close / open / high / low |
| `change` | `number` | Change amount |
| `changePercent` | `number` | Change percent (percentage number, e.g. `5.2`) |
| `volume` | `number` | Volume (unit: shares) |
| `amount` | `number` | Turnover (base quote currency) |

A-share (`StockQuote`) additionally carries five-level `bid` / `ask`, `turnoverRate`, `pe`, `pb`, `limitUp`, `limitDown`, etc.; HK carries `lotSize`; US carries `pe` / `pb`. Funds (`FundQuote`) carry `nav` / `accNav` / `change` / `changePercent`.

::: tip Unit conventions
- Percentages are **percentage numbers** (`5.2` means 5.2%, not `0.052`).
- Amounts / prices are in each market's **base quote currency** (CN = CNY / HK = HKD / US = USD), indicated by `currency`, with **no cross-currency conversion**.
- Volume targets the **shares** unit.
- Invalid timestamps are `null` (no longer `NaN`).
- The `raw` field is removed; for debugging raw payloads, use the provider-level `getXxxRaw()`.
:::

> Fields are subject to the implementation. The full field list is finalized along with `src/sdk/namespaces/quotesNs.ts` and the type definitions.
