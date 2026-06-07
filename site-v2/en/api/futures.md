# sdk.futures Futures

The futures namespace provides domestic futures K-lines, global futures real-time quotes and K-lines, and futures inventory data. The primary data source is Eastmoney.

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Rebar continuous daily K-line
const klines = await sdk.futures.kline('RBM');

// Global futures real-time quotes
const global = await sdk.futures.globalSpot();

// Futures inventory
const inventory = await sdk.futures.inventory('rb');
```

## Method overview

| Method | Description |
|--------|-------------|
| `futures.kline(symbol, opts?)` | Domestic futures historical K-line (daily/weekly/monthly) |
| `futures.globalSpot(opts?)` | Global futures real-time quotes |
| `futures.globalKline(symbol, opts?)` | Global futures historical K-line (daily/weekly/monthly) |
| `futures.inventorySymbols()` | List of futures inventory varieties |
| `futures.inventory(symbol, opts?)` | Domestic futures inventory data |
| `futures.comexInventory(symbol, opts?)` | COMEX gold / silver inventory data |

> v2 data contract: returned objects no longer carry a `raw` field; for time-bearing records `timestamp` is `number | null`; percentages are percentage numbers (e.g. `5.2`). **Note: futures `volume` is contract volume (lots / contracts), not "shares"; futures are quoted per exchange contract and the types have no `currency` field.** The field descriptions below are indicative — **the exact fields follow the implementation**.

## `futures.kline(symbol, opts?)`

Fetch domestic futures historical K-lines (daily/weekly/monthly), covering all varieties on SHFE, DCE, CZCE, INE, CFFEX and GFEX.

```ts
// Rebar continuous daily K-line
const klines = await sdk.futures.kline('RBM');

// CSI 300 futures specific-contract weekly K-line
const weekly = await sdk.futures.kline('IF2604', {
  period: 'weekly',
  startDate: '20250101',
});

weekly.forEach(k => {
  console.log(`${k.date}: close ${k.close} OI ${k.openInterest}`);
});
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Contract code, e.g. `'rb2605'` (specific contract) or `'RBM'` (continuous) |
| `opts.period` | `'daily' \| 'weekly' \| 'monthly'` | `'daily'` | K-line period |
| `opts.startDate` | `string` | - | Start date `YYYYMMDD` |
| `opts.endDate` | `string` | - | End date `YYYYMMDD` |

**symbol format:**

| Input form | Description | Example |
|------------|-------------|---------|
| variety + contract month | Specific contract | `rb2605`, `IF2604`, `TA509` |
| variety + `M` | Main continuous contract | `RBM`, `IFM`, `TAM`, `scM` |

**Returns:** an array of K-lines, each with date, contract code/name, OHLC, volume/amount, amplitude, change/percent, turnover rate, open interest, etc.

## `futures.globalSpot(opts?)`

Fetch global futures real-time quotes across COMEX, NYMEX, CBOT, SGX, NYBOT, LME, MDEX, TOCOM, IPE and more.

```ts
const quotes = await sdk.futures.globalSpot();
quotes.forEach(q => {
  console.log(`${q.name} (${q.code}): ${q.price} ${q.changePercent}%`);
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts.pageSize` | `number` | Rows per response (optional) |

**Returns:** an array of real-time quotes, each with contract code, name, last price, change/percent, open, high, low, previous settlement price, volume, buy/sell volume and open interest.

## `futures.globalKline(symbol, opts?)`

Fetch global futures historical K-lines (daily/weekly/monthly).

```ts
// COMEX copper continuous daily K-line
const klines = await sdk.futures.globalKline('HG00Y');

// NYMEX crude oil weekly K-line
const oil = await sdk.futures.globalKline('CL00Y', {
  period: 'weekly',
  startDate: '20250101',
});
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Contract code, e.g. `'HG00Y'` (COMEX copper continuous) |
| `opts.period` | `'daily' \| 'weekly' \| 'monthly'` | `'daily'` | K-line period |
| `opts.startDate` | `string` | - | Start date `YYYYMMDD` |
| `opts.endDate` | `string` | - | End date `YYYYMMDD` |
| `opts.marketCode` | `number` | - | Eastmoney market code (for varieties not built in) |

**Built-in varieties (indicative):**

| Market | Varieties | Market code |
|--------|-----------|-------------|
| COMEX | HG, GC, SI, QI, QO, MGC | 101 |
| NYMEX | CL, NG, RB, HO, PA, PL | 102 |
| CBOT | ZW, ZM, ZS, ZC, ZL, ZR, YM, NQ, ES | 103 |
| NYBOT | SB, CT | 108 |
| LME | LCPT, LZNT, LALT | 109 |

**Returns:** an array of K-lines with the same structure as `futures.kline`.

## `futures.inventorySymbols()`

Fetch the list of futures inventory varieties (Eastmoney data center), used to drive `futures.inventory`.

```ts
const symbols = await sdk.futures.inventorySymbols();
symbols.forEach(s => {
  console.log(`${s.name} (${s.code})`);
});
```

**Returns:** an array of varieties, each with variety code, variety name and market code.

## `futures.inventory(symbol, opts?)`

Fetch domestic futures inventory data (Eastmoney data center).

```ts
const inventory = await sdk.futures.inventory('rb');
inventory.forEach(item => {
  console.log(`${item.date}: inventory ${item.inventory} change ${item.change}`);
});
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Variety code (from `futures.inventorySymbols()`) |
| `opts.startDate` | `string` | `'2020-10-28'` | Start date `YYYY-MM-DD` |
| `opts.pageSize` | `number` | - | Rows per response (optional) |

**Returns:** an array of inventory records, each with variety code, date, inventory level and change.

## `futures.comexInventory(symbol, opts?)`

Fetch COMEX gold / silver inventory data (Eastmoney data center).

```ts
// COMEX gold inventory
const gold = await sdk.futures.comexInventory('gold');
gold.forEach(item => {
  console.log(`${item.date}: ${item.storageTon} tons`);
});

// COMEX silver inventory
const silver = await sdk.futures.comexInventory('silver');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `'gold' \| 'silver'` | `'gold'` or `'silver'` |
| `opts.pageSize` | `number` | Rows per response (optional) |

**Returns:** an array of inventory records, each with date, variety name, inventory in tons and inventory in ounces.

> v2 removes the `@deprecated` fields on the legacy `ComexInventory` (the `inventory` alias, the always-`null` `change`, and the old `name`); use the unified standard fields instead. The exact fields follow the implementation.
