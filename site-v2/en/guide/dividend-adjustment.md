# Price Adjustment (qfq / hfq)

After dividends, bonus shares, or rights issues, a stock's price shows an "ex-rights / ex-dividend" gap. **Price adjustment** smooths historical prices to account for these events, keeping the K-line continuous both visually and computationally—otherwise moving averages, backtest returns, and the like get polluted by those price gaps.

stock-sdk supports three adjustment modes on its K-line endpoints.

## The three modes

| Mode | Meaning | Use case |
|---|---|---|
| `qfq` | **Forward adjustment**: anchored to the latest price, correcting historical prices backward | Charting, technical indicators, backtesting (**most common**) |
| `hfq` | **Backward adjustment**: anchored to the earliest price, accumulating forward | Long-term cumulative return, true gains across multiple ex-rights events |
| `none` | **No adjustment**: raw prices, gaps preserved | Reconstructing actual historical trade prices, reconciliation |

The intuitive difference:

- **Forward adjustment** keeps the "current price" true; historical prices are pushed down. The right edge of the chart matches today's price—the default in most trading software.
- **Backward adjustment** keeps the "earliest price" true; prices grow over time. Good for measuring "how many times has it risen since listing".
- **No adjustment** keeps both ends raw, with a visible gap on ex-rights dates.

## Forward adjustment by default

stock-sdk's K-line endpoints **default to forward adjustment (`qfq`)**. Call them directly to get forward-adjusted daily K:

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// Forward-adjusted by default
const qfq = await sdk.kline.cn('600519')

// Explicitly specify the adjustment mode
const hfq = await sdk.kline.cn('600519', { adjust: 'hfq' })  // backward
const raw = await sdk.kline.cn('600519', { adjust: 'none' }) // unadjusted
```

HK and US K-lines work the same way:

```ts
const hk = await sdk.kline.hk('00700', { adjust: 'qfq' })
const us = await sdk.kline.us('AAPL', { adjust: 'hfq' })
```

::: tip Parameters follow the implementation
The exact parameter name (e.g. the value set for `adjust`) and its default follow the final implementation; this page assumes one of `qfq` / `hfq` / `none`, defaulting to `qfq`. Whether minute K-lines support adjustment likewise follows the implementation.
:::

## Backtesting notes

The adjustment mode directly determines whether your backtest is correct, so be deliberate:

1. **Backtests generally use forward adjustment (`qfq`)**. Forward-adjusted K-lines are continuous and gap-free, so technical indicators (MAs, MACD, etc.) and entry/exit logic aren't disturbed by ex-rights gaps. Since K-line endpoints default to `qfq`, you usually need no extra config.

2. **Don't run trend strategies on unadjusted data**. `none` has a large gap on ex-rights dates, which crossover and breakout strategies will misread as a "crash / surge", producing false signals.

3. **Consider backward adjustment for long-term absolute returns**. If you care about "the true cumulative return of holding for N years", `hfq` folds dividend and bonus-share gains into the price, closer to actual holding return than forward adjustment—but `hfq` prices scale up over time and shouldn't be compared directly with the current price.

4. **Keep training / backtest / live modes consistent**. Indicator calculation, signal detection, and backtesting should all use K-lines of the same adjustment mode, avoiding mismatches like "signals on forward-adjusted, returns on unadjusted".

5. **Adjustment doesn't change volume units**. Adjustment only corrects price; `volume` is unaffected. For volume units, see the note in [Indicators & Signals](/en/guide/indicators).

Feeding indicator-enriched, forward-adjusted K-lines straight into the backtest engine is the most common and safest combination:

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// Forward-adjusted by default + indicators attached, ready as backtest input
const kline = await sdk.kline.withIndicators('600519', {
  ma: [5, 20],
  macd: true,
})
// Hand off to the backtest engine in stock-sdk/screener
```
