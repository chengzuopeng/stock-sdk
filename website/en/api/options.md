# sdk.options Options

The options namespace covers CFFEX index options, SSE ETF options, commodity options, the full CFFEX option quote list, and the option Dragon-Tiger list. It is organized into sub-namespaces:

- `sdk.options.index` — CFFEX stock-index options
- `sdk.options.etf` — SSE ETF options
- `sdk.options.commodity` — commodity options
- `sdk.options.cffex` — full CFFEX option quote list
- `sdk.options.lhb` — option Dragon-Tiger list (top-level method)

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const spot = await sdk.options.index.spot('io', 'io2504');
const kline = await sdk.options.etf.dailyKline('10009633');
const lhb = await sdk.options.lhb('510050', '2022-01-21');
```

## Method overview

| Method | Description |
|--------|-------------|
| `options.index.spot(product, contract)` | CFFEX index-option T-quote (calls + puts) |
| `options.index.kline(symbol)` | CFFEX index-option daily K-line |
| `options.etf.months(cate)` | SSE ETF-option expiry months |
| `options.etf.expireDay(cate, month)` | ETF-option expiry day and remaining days |
| `options.etf.minute(code)` | ETF-option intraday minute quotes |
| `options.etf.dailyKline(code)` | ETF-option historical daily K-line |
| `options.etf.fiveDayMinute(code)` | ETF-option 5-day minute quotes |
| `options.commodity.spot(variety, contract)` | Commodity-option T-quote |
| `options.commodity.kline(symbol)` | Commodity-option daily K-line |
| `options.cffex.quotes()` | Full list of real-time CFFEX option quotes |
| `options.lhb(symbol, date)` | Option Dragon-Tiger list |

> v2 data contract: returned objects no longer carry a `raw` field; for time-bearing records `timestamp` is `number | null` (`null` when it cannot be parsed); percentages are expressed as percentage numbers (e.g. `5.2`). The field descriptions below are indicative — **the exact fields follow the implementation**.

## CFFEX index options — `options.index`

### `options.index.spot(product, contract)`

Fetch the CFFEX index-option T-quote, returning `calls` and `puts` contract lists.

```ts
const spot = await sdk.options.index.spot('io', 'io2504');
console.log(spot.calls); // call contracts
console.log(spot.puts);  // put contracts
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `product` | `'ho' \| 'io' \| 'mo'` | Product code: `ho` (SSE 50), `io` (CSI 300), `mo` (CSI 1000) |
| `contract` | `string` | Contract code, e.g. `'io2504'` |

**Returns:** `{ calls, puts }`, where each element is a T-quote row (contract id, last price, bid/ask price and volume, open interest, change, strike price, etc.).

### `options.index.kline(symbol)`

Fetch the daily K-line of a CFFEX index-option contract.

```ts
const klines = await sdk.options.index.kline('io2504C3600');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Contract code including the call (`C`) / put (`P`) marker, e.g. `'io2504C3600'` |

**Returns:** an array of daily K-lines, each with date, OHLC, volume, etc. (aligned with the unified K-line contract).

## SSE ETF options — `options.etf`

### `options.etf.months(cate)`

Fetch the list of expiry months for SSE ETF options.

```ts
const info = await sdk.options.etf.months('50ETF');
console.log(info.months);  // ['2026-03', '2026-04', '2026-06']
console.log(info.stockId); // underlying security code
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cate` | `'50ETF' \| '300ETF' \| '500ETF' \| '科创50'` | Option product name |

**Returns:** the expiry-month array, underlying security code, current product id, and the list of available products.

### `options.etf.expireDay(cate, month)`

Fetch the expiry day and remaining days for an SSE ETF option in a given month.

```ts
const info = await sdk.options.etf.expireDay('50ETF', '2026-03');
console.log(info.expireDay);     // '2026-03-25'
console.log(info.remainderDays); // 12
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cate` | `'50ETF' \| '300ETF' \| '500ETF' \| '科创50'` | Option product name |
| `month` | `string` | Expiry month `YYYY-MM` |

**Returns:** the expiry day, remaining days, underlying security code and underlying name.

### `options.etf.minute(code)`

Fetch the intraday minute quotes for an SSE ETF option.

```ts
const minutes = await sdk.options.etf.minute('10009633');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | Option code (digits only), e.g. `'10009633'` |

**Returns:** an array of minute quotes, each with time, price, volume, open interest and average price.

### `options.etf.dailyKline(code)`

Fetch the historical daily K-line for an SSE ETF option.

```ts
const klines = await sdk.options.etf.dailyKline('10009633');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | Option code (digits only) |

**Returns:** an array of daily K-lines (aligned with the unified K-line contract).

### `options.etf.fiveDayMinute(code)`

Fetch 5-day minute quotes for an SSE ETF option.

```ts
const minutes = await sdk.options.etf.fiveDayMinute('10009633');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | Option code (digits only) |

**Returns:** an array of minute quotes spanning 5 trading days, with the same fields as `options.etf.minute`.

## Commodity options — `options.commodity`

### `options.commodity.spot(variety, contract)`

Fetch a commodity-option T-quote, returning `calls` and `puts` contract lists.

```ts
const spot = await sdk.options.commodity.spot('au', 'au2506');
console.log(spot.calls); // call contracts
console.log(spot.puts);  // put contracts
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `variety` | `string` | Variety code, e.g. `'au'`, `'cu'`, `'SR'`, `'m'` |
| `contract` | `string` | Contract code, e.g. `'au2506'` |

**Supported commodity-option varieties (indicative):**

- **SHFE**: au (gold), ag (silver), cu (copper), al (aluminum), zn (zinc), ru (rubber)
- **INE**: sc (crude oil)
- **DCE**: m (soybean meal), c (corn), i (iron ore), p (palm oil), pp, l, v, pg, y, a, b, eg, eb
- **CZCE**: SR (sugar), CF (cotton), TA, MA, RM, OI, PK, PF, SA, UR

**Returns:** `{ calls, puts }`, with the same structure as the index-option T-quote.

### `options.commodity.kline(symbol)`

Fetch the daily K-line of a commodity-option contract.

```ts
const klines = await sdk.options.commodity.kline('m2409C3200');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Contract code including the call (`C`) / put (`P`) marker, e.g. `'m2409C3200'` |

**Returns:** an array of daily K-lines (aligned with the unified K-line contract).

## Full CFFEX options — `options.cffex`

### `options.cffex.quotes()`

Fetch the full list of real-time CFFEX option quotes (Eastmoney data source).

```ts
const quotes = await sdk.options.cffex.quotes();
console.log(quotes[0].code); // 'MO2603-P-8200'
```

**Returns:** an array of real-time quotes, each with contract code, name, last price, change/percent, volume/amount, open interest, strike price, remaining days, previous settlement price, etc.

## Option Dragon-Tiger list — `options.lhb`

### `options.lhb(symbol, date)`

Fetch the option Dragon-Tiger list (top member seats by volume / open interest) for a given underlying and trading day.

```ts
const lhb = await sdk.options.lhb('510050', '2022-01-21');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Underlying code, e.g. `'510050'`, `'510300'`, `'159919'` |
| `date` | `string` | Trading date `YYYY-MM-DD` |

**Returns:** an array of Dragon-Tiger entries, each with trade type, date, underlying code/name, member short name, rank, buy/sell volume, etc.

> v2 removes the `@deprecated` field aliases on the legacy `OptionLHBItem` (`tradeDate` / `volume` / `volumeChange`, plus old open-interest and amount aliases); use the unified standard fields instead. The exact fields follow the implementation.
