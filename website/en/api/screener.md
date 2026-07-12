# screener · Screening & Backtest

Chainable screener + lightweight backtest engine — pure computation, zero network, zero dependencies, imported from the `stock-sdk/screener` subpath. Feed it any quote / K-line array (typically from `sdk.batch.cn()` or `sdk.kline.cn()`) and filter, rank and backtest locally.

```ts
import { screen, backtest } from 'stock-sdk/screener'
```

## Methods

| Method | Description |
|---|---|
| `screen(items)` | Chainable screener: `where` filter → `sortBy` rank → `top(n)` / `toArray()` |
| `backtest(options)` | Single-symbol long-only backtest, **one options object**, returns `BacktestReport` |

## screen · chainable screening

```ts
const picks = screen(allQuotes)
  .where(q => q.pe != null && q.pe < 20)
  .where(q => q.changePercent > 3)
  .sortBy(q => q.amount)        // desc by default; .sortBy(sel, 'asc') for asc
  .top(20)
```

- **Never mutates the input array**: copied on entry; `top` / `toArray` return new arrays too.
- **sortBy numeric semantics**: numeric strings (ubiquitous in raw quote JSON, e.g. `'999999'`) are normalized via `Number()` and participate in ordering; `null` / `undefined` / `NaN` / empty / non-numeric strings all **sink to the tail**.
- **Validation**: `top(n)` requires a non-negative integer; `sortBy`'s `direction` accepts only `'asc'` / `'desc'` — anything else throws `InvalidArgumentError` instead of silently sorting descending.

## backtest

```ts
const report = backtest({
  klines,                              // any series with close (e.g. sdk.kline.cn output)
  strategy: (bar, i, series) => {      // return 'buy' | 'sell' | 'hold' per bar
    // ⚠️ series is the FULL array (incl. future bars); only read series.slice(0, i + 1)
    return i === 0 ? 'buy' : 'hold'
  },
  initialCapital: 100000,              // default 100000
  fee: { buy: 0.0003, sell: 0.0013 },  // number = same both sides; object = A-share sell-side stamp tax
  positionSize: 1,                     // fraction of cash per buy, (0,1], default all-in
  getDate: bar => bar.date,            // optional; trades gain entryDate/exitDate
})
report.totalReturn    // total return (%)
report.buyHoldReturn  // buy-and-hold benchmark (%) — beat this before celebrating
report.maxDrawdown    // max drawdown (%), baselined at initial capital
report.trades         // per-trade records (with a forced liquidation flag)
```

### Execution contract (read this before comparing to live trading)

- **Same-bar-close fills**: a signal computed on bar i fills at bar i's close (zero latency). Real orders can only fill on the next bar, so this convention systematically flatters close-triggered strategies — add your own slippage when comparing to live results.
- **Signals on invalid-price bars are deferred**: a `buy` / `sell` emitted on a bar whose close is 0 (suspension encoding) / `NaN` / `null` is not dropped — it **fills at the next valid-price bar**; if the strategy emits a fresh non-`hold` signal there, the fresh signal wins.
- **End-of-data liquidation**: an open position is closed at the last **valid** close, with `Trade.forced = true` and `exitIndex` pointing at that valid bar (price and index always refer to the same bar).
- **No lot-size constraint**: fractional shares allowed; A-share 100-share board lots / minimum commission are not modeled — sanity-check small-capital backtests on high-priced stocks.

### Validation

Invalid `initialCapital` (must be positive finite), `fee` (each side `[0, 1)`) or `positionSize` (`(0, 1]`) throws `InvalidArgumentError` — no more silent garbage reports with "0 drawdown and sign-flipped returns".

### BacktestReport

| Field | Description |
|---|---|
| `totalReturn` | Total return (%), final equity vs initial capital |
| `buyHoldReturn` | Buy-and-hold benchmark (%): first valid close → last valid close, **fee-free** |
| `winRate` | Win rate (%). A win is `returnPercent > 0`; fee-only break-evens and forced liquidations count in the denominator — filter with `trades.filter(t => !t.forced)` to recompute |
| `maxDrawdown` | Max drawdown (%, positive), peak seeded at **initial capital** (the entry fee of a first-bar buy is visible) |
| `validBars` | Count of valid-price bars. **0 means no bar yielded a valid close** (most common cause: intraday data uses `price` instead of `close` — pass a custom `getClose`) |
| `trades` / `tradeCount` | Per-trade records: `entryIndex` / `exitIndex` / prices / `returnPercent` (fees compounded both sides) / `forced`; with `getDate`, also `entryDate` / `exitDate` |
| `equityCurve` | Post-close equity per bar |
| `finalEquity` / `initialCapital` | Final equity / starting capital |

::: warning Look-ahead bias
The third `strategy` parameter is the **full array** — reading `series[index + 1]` or beyond peeks into the future; backtest returns will be wildly inflated and unreproducible live. Only read the historical window `series.slice(0, index + 1)`.
:::

## See also

- [signals](/en/api/signals) — golden/death-cross event detection, feeds strategies directly
- [indicators](/en/api/indicators) — the 14 indicator pure functions and `addIndicators`
- [kline](/en/api/kline) — historical K-line data source
