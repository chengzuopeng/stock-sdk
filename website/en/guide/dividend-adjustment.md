# Dividend Adjustment (qfq / hfq)

> **TL;DR**: For `getHistoryKline` / `getMinuteKline` / `getHKHistoryKline` / `getUSHistoryKline`,
> the `adjust` parameter **defaults to `'qfq'` (forward-adjusted / front-adjusted)**.
> If you are running back-tests or computing dividend-reinvested returns,
> always pass `'hfq'` or `''` explicitly.

## Three adjustment types

| Value | Meaning | Price behavior | Typical use case |
|-------|---------|----------------|------------------|
| `''` | **Unadjusted** | Raw exchange-traded prices | Trade reconciliation, order-book analysis |
| `'qfq'` | **Forward-adjusted (default)** | Anchored to the most recent corporate action; historical prices scaled down accordingly | Charting, technical indicators, trend analysis |
| `'hfq'` | **Backward-adjusted** | Anchored to the IPO; dividends/splits compounded forward, prices grow over time | Total return, back-testing, compound returns |

## Why is `'qfq'` the default?

Most financial websites and brokerage platforms display K-lines as forward-adjusted by default,
so the price line has no visible gap on ex-dividend days and looks visually continuous.

But **forward-adjusted "prices" are not the actual traded prices**:
if a stock traded at 100 before a dividend in 2020 and 50 after,
today's forward-adjusted history will report ~50 for that 2020 day.
You cannot use that number to back-calculate "what I actually paid back then".

## Choosing per scenario

### Scenario 1: Charting & technical indicators (MA / MACD / BOLL / etc.)

**Use `'qfq'` (default).**

```ts
const klines = await sdk.getHistoryKline('sh600519');
// equivalent to:
// const klines = await sdk.getHistoryKline('sh600519', { adjust: 'qfq' });
```

Technical indicators are statistical transforms over price series and need a continuous, gap-free
input. Forward adjustment delivers exactly that.

### Scenario 2: Back-tests & long-horizon returns

**Use `'hfq'`, explicitly.**

```ts
const klines = await sdk.getHistoryKline('sh600519', { adjust: 'hfq' });
const totalReturn = (klines.at(-1)!.close! / klines[0].close! - 1) * 100;
console.log(`${totalReturn.toFixed(2)}% cumulative return`);
```

Under backward-adjusted prices, last-close / first-close is the true cumulative return
(assuming dividends are reinvested). Forward-adjusted prices would understate the return
because they strip away the dividend uplift.

### Scenario 3: Trade reconciliation, historical cost lookup

**Use `''` (unadjusted).**

```ts
const klines = await sdk.getHistoryKline('sh600519', { adjust: '' });
const dayKline = klines.find(k => k.date === '2020-06-24');
// dayKline.close is the actual close price as printed on that trading day
```

Only unadjusted prices match what your broker statement / historical position cost shows.

## HK / US

`getHKHistoryKline` / `getUSHistoryKline` also default to `adjust: 'qfq'`.
The selection logic is identical to A-shares.

## 1-minute timeline does not support adjustment

`getMinuteKline(symbol)` (period='1' default) hits EastMoney's `trends2/get` endpoint
which does not accept an adjustment parameter. The 5/15/30/60-minute K-lines hit
`kline/get` and accept `adjust='qfq'/'hfq'/''` like the daily K-line.

## Common pitfalls

::: danger Never compute cumulative return from forward-adjusted data
```ts
// ❌ Wrong
const klines = await sdk.getHistoryKline('sh600519'); // default qfq
const totalReturn = klines.at(-1)!.close! / klines[0].close! - 1;
// This excludes dividend yield and may understate the true return by 20-50%.
```
:::

::: danger Never use forward-adjusted prices to look up historical cost basis
A forward-adjusted "historical price" has been scaled and does not equal the actual filled price.
For historical cost, use `adjust: ''`.
:::

::: tip Different `adjust` values return different OHLCV
This is not a bug — it is how price adjustment works. Pin the value you need
explicitly so your downstream calculations stay reproducible.
:::
