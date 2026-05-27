# Minute K-Line

Get minute-level K-line data.

::: warning Default adjustment
`getMinuteKline` defaults `adjust` to `'qfq'` (forward-adjusted) for
`period='5'/'15'/'30'/'60'`; `period='1'` (1-minute timeline) does not
support price adjustment. For back-tests or dividend-reinvested return
calculations pass `'hfq'` or `''` explicitly. See
[Dividend Adjustment](/en/guide/dividend-adjustment) for details.
:::

## getMinuteKline

```typescript
const klines = await sdk.getMinuteKline('sz000858', {
  period: '5',
  adjust: 'qfq',
});
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| code | `string` | Yes | - | Stock code |
| options.period | `'1' \| '5' \| '15' \| '30' \| '60'` | No | `'5'` | Minutes per candle |
| options.adjust | `'' \| 'qfq' \| 'hfq'` | No | `'qfq'` | Price adjustment |

### Return Type

```typescript
interface MinuteKlineData {
  time: string;    // Time (YYYY-MM-DD HH:mm)
  open: number;    // Open price
  close: number;   // Close price
  high: number;    // High price
  low: number;     // Low price
  volume: number;  // Trading volume
  amount: number;  // Trading amount
}
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 5-minute K-line
const min5 = await sdk.getMinuteKline('sz000858', {
  period: '5',
});

min5.forEach(k => {
  console.log(`${k.time}: ${k.close}`);
});
// 2024-12-17 09:35: 150.00
// 2024-12-17 09:40: 150.50
// ...

// 1-minute K-line (same as timeline)
const min1 = await sdk.getMinuteKline('sz000858', {
  period: '1',
});

// 60-minute K-line
const min60 = await sdk.getMinuteKline('sz000858', {
  period: '60',
});
```

---

## getHKMinuteKline (v1.10.0+)

HK minute K-line or intraday timeline. Source: EastMoney (`33.push2his.eastmoney.com`).

### Signature

```typescript
getHKMinuteKline(
  symbol: string,
  options?: HKMinuteKlineOptions
): Promise<HKMinuteTimeline[] | HKMinuteKline[]>
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `symbol` | `string` | HK code, accepts `hk` prefix or numeric (auto-padded to 5 digits) |
| `options.period` | `'1' \| '5' \| '15' \| '30' \| '60'` | Default `'1'` (intraday timeline) |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | Default `'qfq'`; only applies to 5/15/30/60 |
| `options.ndays` | `number` | Only when `period='1'`; returns last N trading days, default `1` (today only). Set to `5` for 5-day timeline |
| `options.startDate` / `options.endDate` | `string` | `YYYY-MM-DD HH:mm` (HK local time `Asia/Hong_Kong`), client-side filter |

### Return type

`period='1'` → `HKMinuteTimeline[]` (`time` / `timestamp` / `tz: 'Asia/Hong_Kong'` / OHLC / `volume` / `amount` / `avgPrice` / `currency: 'HKD'` / `code`).
Other periods → `HKMinuteKline[]`.

### Example

```typescript
const k5 = await sdk.getHKMinuteKline('00700', { period: '5' });
const timeline = await sdk.getHKMinuteKline('00700');
console.log(timeline[0].avgPrice, timeline[0].currency); // 100.05 'HKD'
```

---

## getUSMinuteKline (v1.10.0+)

US minute K-line or intraday timeline. **Regular trading session only** (no pre/post market). Source: EastMoney (`63.push2his.eastmoney.com`).

### Signature

```typescript
getUSMinuteKline(
  symbol: string,
  options?: USMinuteKlineOptions
): Promise<USMinuteTimeline[] | USMinuteKline[]>
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `symbol` | `string` | Format `{market}.{ticker}` (e.g. `'105.AAPL'` NASDAQ / `'106.BABA'` NYSE) |
| `options.period` | `'1' \| '5' \| '15' \| '30' \| '60'` | Default `'1'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | Default `'qfq'` |
| `options.ndays` | `number` | Only when `period='1'`; returns last N trading days, default `1` (today only) |
| `options.startDate` / `options.endDate` | `string` | `YYYY-MM-DD HH:mm` (America/New_York, DST aware), client-side filter |

### Return type

`period='1'` → `USMinuteTimeline[]`. Other → `USMinuteKline[]`. Both have `tz: 'America/New_York'` (DST aware), `currency: 'USD'`, `code` extracted from `secid.split('.')[1]`.

::: warning Time zone
The upstream EastMoney trends2 / kline endpoints return `time` strings in **Beijing time** (e.g. during DST, the US market open at Beijing 21:30 corresponds to NYC 09:30). The SDK internally converts: the returned `time` field is **NY local time**, `timestamp` is UTC ms, and `tz` is `'America/New_York'`. When passing `startDate`/`endDate`, use NY-local time strings too.
:::

### Example

```typescript
const k60 = await sdk.getUSMinuteKline('105.AAPL', { period: '60' });
const timeline = await sdk.getUSMinuteKline('106.BABA');
```

