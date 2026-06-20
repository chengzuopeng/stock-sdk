# sdk.futures 期货

期货命名空间提供国内期货 K 线、全球期货实时行情与 K 线，以及期货库存数据。数据来源主要为东方财富。

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 螺纹钢主连日 K
const klines = await sdk.futures.kline('RBM');

// 全球期货实时行情
const global = await sdk.futures.globalSpot();

// 期货库存
const inventory = await sdk.futures.inventory('rb');
```

## 方法表

| 方法 | 说明 |
|------|------|
| `futures.kline(symbol, opts?)` | 国内期货历史 K 线（日/周/月） |
| `futures.globalSpot(opts?)` | 全球期货实时行情 |
| `futures.globalKline(symbol, opts?)` | 全球期货历史 K 线（日/周/月） |
| `futures.inventorySymbols()` | 期货库存品种列表 |
| `futures.inventory(symbol, opts?)` | 国内期货库存数据 |
| `futures.comexInventory(symbol, opts?)` | COMEX 黄金 / 白银库存数据 |

> v2 数据契约：返回对象不含 `raw` 字段；带时间的字段 `timestamp` 为 `number | null`；百分比为百分数（如 `5.2`）。**注意：期货 `volume` 为成交量（手 / 合约），并非"股"；期货按交易所合约报价计价，类型不含 `currency` 字段。** 下方字段为常见结构示意，**具体字段以实现为准**。

## `futures.kline(symbol, opts?)`

获取国内期货历史 K 线（日/周/月），支持上期所（SHFE）、大商所（DCE）、郑商所（CZCE）、上期能源（INE）、中金所（CFFEX）、广期所（GFEX）全部品种。

```ts
// 螺纹钢主连日 K
const klines = await sdk.futures.kline('RBM');

// 沪深 300 期货具体合约周 K
const weekly = await sdk.futures.kline('IF2604', {
  period: 'weekly',
  startDate: '20250101',
});

weekly.forEach(k => {
  console.log(`${k.date}: 收 ${k.close} 持仓 ${k.openInterest}`);
});
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 合约代码，如 `'rb2605'`（具体合约）或 `'RBM'`（主连） |
| `opts.period` | `'daily' \| 'weekly' \| 'monthly'` | `'daily'` | K 线周期 |
| `opts.startDate` | `string` | - | 开始日期 `YYYYMMDD` |
| `opts.endDate` | `string` | - | 结束日期 `YYYYMMDD` |

**symbol 格式：**

| 输入格式 | 说明 | 示例 |
|----------|------|------|
| 品种 + 合约月份 | 具体合约 | `rb2605`、`IF2604`、`TA509` |
| 品种 + `M` | 主力连续合约 | `RBM`、`IFM`、`TAM`、`scM` |

**返回说明：** K 线数组，每根含日期、合约代码/名称、开高低收、成交量/额、振幅、涨跌额/幅、换手率、持仓量等字段。

## `futures.globalSpot(opts?)`

获取全球期货实时行情，覆盖 COMEX、NYMEX、CBOT、SGX、NYBOT、LME、MDEX、TOCOM、IPE 等交易所。

```ts
const quotes = await sdk.futures.globalSpot();
quotes.forEach(q => {
  console.log(`${q.name} (${q.code}): ${q.price} ${q.changePercent}%`);
});
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `opts.pageSize` | `number` | 单次返回条数（可选） |

**返回说明：** 实时行情数组，每条含合约代码、名称、最新价、涨跌额/幅、今开、最高、最低、昨结算价、成交量、买/卖盘量、持仓量等字段。

## `futures.globalKline(symbol, opts?)`

获取全球期货历史 K 线（日/周/月）。

```ts
// COMEX 铜连续日 K
const klines = await sdk.futures.globalKline('HG00Y');

// 纽约原油周 K
const oil = await sdk.futures.globalKline('CL00Y', {
  period: 'weekly',
  startDate: '20250101',
});
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 合约代码，如 `'HG00Y'`（COMEX 铜连续） |
| `opts.period` | `'daily' \| 'weekly' \| 'monthly'` | `'daily'` | K 线周期 |
| `opts.startDate` | `string` | - | 开始日期 `YYYYMMDD` |
| `opts.endDate` | `string` | - | 结束日期 `YYYYMMDD` |
| `opts.marketCode` | `number` | - | 东方财富市场代码（用于未内置的品种） |

**内置品种（示意）：**

| 市场 | 品种 | 市场代码 |
|------|------|----------|
| COMEX | HG, GC, SI, QI, QO, MGC | 101 |
| NYMEX | CL, NG, RB, HO, PA, PL | 102 |
| CBOT | ZW, ZM, ZS, ZC, ZL, ZR, YM, NQ, ES | 103 |
| NYBOT | SB, CT | 108 |
| LME | LCPT, LZNT, LALT | 109 |

**返回说明：** K 线数组，结构同 `futures.kline`。

## `futures.inventorySymbols()`

获取期货库存品种列表（东方财富数据中心），用于驱动 `futures.inventory`。

```ts
const symbols = await sdk.futures.inventorySymbols();
symbols.forEach(s => {
  console.log(`${s.name} (${s.code})`);
});
```

**返回说明：** 品种数组，每条含品种代码、品种名称与市场代码。

## `futures.inventory(symbol, opts?)`

获取国内期货库存数据（东方财富数据中心）。

```ts
const inventory = await sdk.futures.inventory('rb');
inventory.forEach(item => {
  console.log(`${item.date}: 库存 ${item.inventory} 增减 ${item.change}`);
});
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 品种代码（从 `futures.inventorySymbols()` 获取） |
| `opts.startDate` | `string` | `'2020-10-28'` | 开始日期 `YYYY-MM-DD` |
| `opts.pageSize` | `number` | - | 单次返回条数（可选） |

**返回说明：** 库存数组，每条含品种代码、日期、库存量、增减量。

## `futures.comexInventory(symbol, opts?)`

获取 COMEX 黄金 / 白银库存数据（东方财富数据中心）。

```ts
// COMEX 黄金库存
const gold = await sdk.futures.comexInventory('gold');
gold.forEach(item => {
  console.log(`${item.date}: ${item.storageTon} 吨`);
});

// COMEX 白银库存
const silver = await sdk.futures.comexInventory('silver');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `'gold' \| 'silver'` | `'gold'`（黄金）或 `'silver'`（白银） |
| `opts.pageSize` | `number` | 单次返回条数（可选） |

**返回说明：** 库存数组，每条含日期、品种名称、库存量（吨）、库存量（盎司）。

> v2 已移除旧版 `ComexInventory` 上的 `@deprecated` 字段（如 `inventory` 别名、恒为 `null` 的 `change` 与旧 `name`）；请改用统一后的标准字段。具体字段以实现为准。
