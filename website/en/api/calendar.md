# calendar · Trading Calendar & Market Status

The `sdk.calendar` namespace provides high-level conveniences on top of the underlying trading calendar: check whether a date is a trading day, jump to the nearest trading day, and query the live market status.

A-share trading-day methods are backed by the upstream trading calendar (Tencent, with a 12-hour cache). Hong Kong / US markets have no official calendar source, so `marketStatus('HK' | 'US')` degrades to a "Mon–Fri + known sessions" approximation and **does not recognize public holidays**.

## Methods at a Glance

| Method | Description |
|---|---|
| `sdk.calendar.isTradingDay(date?)` | Whether a given date is an A-share trading day |
| `sdk.calendar.nextTradingDay(date?)` | The next A-share trading day |
| `sdk.calendar.prevTradingDay(date?)` | The previous A-share trading day |
| `sdk.calendar.marketStatus(market?)` | Synchronously return current status (pre-market / open / lunch break / after-hours / closed) |

> Date inputs accept `'YYYY-MM-DD'` / `'YYYYMMDD'` / a `Date` object; omit it to use "now, as the current day in `Asia/Shanghai`".

## sdk.calendar.isTradingDay

Check whether a given date is an A-share trading day.

Backed by the underlying trading calendar (12-hour cache); the first call fetches the full list of trading days, subsequent calls hit the cache.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `string \| Date` | No | `'YYYY-MM-DD'` / `'YYYYMMDD'` / `Date`; defaults to today (Asia/Shanghai) |

### Example

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

await sdk.calendar.isTradingDay();             // is today a trading day
await sdk.calendar.isTradingDay('2026-01-01'); // false (New Year's Day)
await sdk.calendar.isTradingDay('20260105');   // compact date format supported
```

### Returns

`Promise<boolean>`: `true` for a trading day, `false` for a holiday / weekend.

## sdk.calendar.nextTradingDay

Return the next A-share trading day (`'YYYY-MM-DD'`).

- If `date` is itself a trading day, returns the next trading day **after** it.
- If `date` is a holiday, returns the first trading day greater than it.
- If it falls outside the known calendar range, throws `InvalidArgumentError` (an `SdkError`, see [Error Handling](../guide/retry.md)).

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `string \| Date` | No | Reference date; defaults to today (Asia/Shanghai) |

### Example

```ts
// First trading day after a pre-holiday session
await sdk.calendar.nextTradingDay('2026-02-13');

// Omit to count from today
const next = await sdk.calendar.nextTradingDay();
```

### Returns

`Promise<string>` in `'YYYY-MM-DD'` format.

## sdk.calendar.prevTradingDay

Return the previous A-share trading day (`'YYYY-MM-DD'`).

- If `date` is itself a trading day, returns the trading day **before** it.
- If `date` is a holiday, returns the last trading day less than it.
- If it falls outside the known calendar range, throws `InvalidArgumentError`.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `string \| Date` | No | Reference date; defaults to today (Asia/Shanghai) |

### Example

```ts
await sdk.calendar.prevTradingDay('2026-02-17');
const prev = await sdk.calendar.prevTradingDay();
```

### Returns

`Promise<string>` in `'YYYY-MM-DD'` format.

## sdk.calendar.marketStatus

Return the current market status (**synchronous, no network request**).

- **A-shares**: judged purely by trading sessions and **does not recognize public holidays** (the SDK won't issue a request for that). A `'closed'` result means "weekend or outside trading hours" — could be a holiday, early morning, or late night. For an accurate "is today actually a trading day" check, use `await sdk.calendar.isTradingDay()`.
- **Hong Kong / US**: judged by "Mon–Fri + known sessions"; likewise no holiday awareness.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `market` | `'A' \| 'HK' \| 'US'` | No | Target market, defaults to `'A'` |

### Status Enum

```ts
type MarketStatus =
  | 'pre_market'   // pre-market (incl. opening auction)
  | 'open'         // continuous trading
  | 'lunch_break'  // midday break (A-share 11:30-13:00 / HK 12:00-13:00; US none)
  | 'after_hours'  // after-hours
  | 'closed';      // non-trading day / weekend / far from sessions
```

Trading sessions (market local time):

| Market | Continuous sessions | Lunch break |
|---|---|---|
| A-shares | 09:30–11:30, 13:00–15:00 | 11:30–13:00 |
| Hong Kong | 09:30–12:00, 13:00–16:00 | 12:00–13:00 |
| US | 09:30–16:00 (regular hours only) | none |

### Example

```ts
sdk.calendar.marketStatus();      // A-shares, e.g. 'open' / 'lunch_break' / 'closed'
sdk.calendar.marketStatus('HK');  // Hong Kong
sdk.calendar.marketStatus('US');  // US

// Accurate "is A-share market open now": check calendar, then session
if ((await sdk.calendar.isTradingDay()) && sdk.calendar.marketStatus() === 'open') {
  // currently trading
}
```

### Returns

A `MarketStatus` string (returned synchronously, not a Promise).

## Notes

1. **A-share trading-day methods depend on the upstream calendar**: `isTradingDay` / `nextTradingDay` / `prevTradingDay` fetch the full trading-day list on first call (12-hour cache) and are therefore async.
2. **`marketStatus` is pure local computation**: synchronous, no request, no holiday awareness — judged only by session and weekday. To detect A-share holidays, pair it with `isTradingDay`.
3. **No official HK / US calendar**: `nextTradingDay` / `prevTradingDay` / `isTradingDay` cover A-shares only; for HK / US only `marketStatus` offers a session-based approximation.
4. The raw underlying trading-day array is available via [`sdk.reference.tradingCalendar()`](./reference.md).
