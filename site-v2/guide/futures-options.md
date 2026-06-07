# 期货与期权

stock-sdk 在 `sdk.futures` 与 `sdk.options` 两个命名空间下提供期货与期权数据。本页给出整体用法概览；逐方法的参数与返回结构详见 API 章节的 [futures](/api/futures) 与 [options](/api/options)。

::: tip 符号入参
期货与期权同样遵循「`string` 一等公民 + 可选 `SymbolRef`」的约定。`normalizeSymbol` 能容错解析 `rb2510`、`RBM`（主连）、`CFFEX.IF2412` 等形态。详见[符号与代码规则](/guide/symbols)。
:::

## 期货 sdk.futures

`sdk.futures` 覆盖国内期货 K 线与全球（海外）期货行情 / K 线，以及交易所库存数据。

| 方法 | 说明 |
|---|---|
| `futures.kline(symbol, opts)` | 国内期货历史 K 线 |
| `futures.globalSpot(symbol)` | 全球期货实时行情（COMEX / NYMEX / CBOT / LME 等） |
| `futures.globalKline(symbol, opts)` | 全球期货历史 K 线 |
| `futures.inventorySymbols()` | 可查库存的期货品种列表 |
| `futures.inventory(symbol)` | 指定品种的库存数据 |
| `futures.comexInventory(symbol)` | COMEX 黄金 / 白银等库存 |

::: tip market 与 exchange
国内期货归 `market: 'CN'`，靠 `exchange`（`SHFE` / `DCE` / `CZCE` / `INE` / `CFFEX` / `GFEX`）区分交易所；海外期货归 `market: 'GLOBAL'`，靠 `exchange`（`COMEX` / `NYMEX` / `CBOT` / `LME` 等）区分。
:::

### 示例

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// 国内期货 K 线：螺纹钢 2510 合约
const rbKline = await sdk.futures.kline('rb2510', { period: 'day' })

// 全球期货实时行情
const comexGold = await sdk.futures.globalSpot('GC') // COMEX 黄金（示意）

// 全球期货 K 线
const wtiKline = await sdk.futures.globalKline('CL', { period: 'day' })

// 库存：先列可查品种，再取具体库存
const symbols = await sdk.futures.inventorySymbols()
const inv = await sdk.futures.inventory('rb')

// COMEX 库存
const comexInv = await sdk.futures.comexInventory('AU')
```

各方法的具体参数（周期、起止、复权等）与返回字段以实现为准。

## 期权 sdk.options

`sdk.options` 按标的类别拆为四个二级命名空间——`index`（股指期权）、`etf`（ETF 期权）、`commodity`（商品期权）、`cffex`（中金所期权）——外加顶层的 `options.lhb`（期权龙虎榜）。

| 二级命名空间 | 方法 | 说明 |
|---|---|---|
| `options.index` | `spot` / `kline` | 股指期权实时行情 / K 线 |
| `options.etf` | `months` / `expireDay` / `minute` / `dailyKline` / `fiveDayMinute` | ETF 期权：合约月份 / 到期日 / 分时 / 日 K / 五日分时 |
| `options.commodity` | `spot` / `kline` | 商品期权实时行情 / K 线 |
| `options.cffex` | `quotes` | 中金所期权行情 |
| `options`（顶层） | `lhb(symbol, date)` | 期权龙虎榜 |

### 股指期权

```ts
// 股指期权实时行情与 K 线
const idxSpot = await sdk.options.index.spot('IO2412')   // 示意
const idxKline = await sdk.options.index.kline('IO2412')
```

### ETF 期权

ETF 期权的典型流程是「先查月份 → 取到期日 → 再取行情 / K 线」：

```ts
// 1. 某 ETF 期权的可交易月份
const months = await sdk.options.etf.months('10004336')

// 2. 指定月份的到期日
const expire = await sdk.options.etf.expireDay('10004336')

// 3. 行情数据
const minute = await sdk.options.etf.minute('10004336')        // 分时
const dailyK = await sdk.options.etf.dailyKline('10004336')    // 日 K
const fiveDay = await sdk.options.etf.fiveDayMinute('10004336') // 五日分时
```

### 商品期权与中金所期权

```ts
// 商品期权
const cmdSpot = await sdk.options.commodity.spot('m2501')  // 示意
const cmdKline = await sdk.options.commodity.kline('m2501')

// 中金所期权行情
const cffex = await sdk.options.cffex.quotes('IF')

// 期权龙虎榜（顶层方法）
const lhb = await sdk.options.lhb('10004336', '2025-06-06')
```

各方法的具体入参（合约代码 / 月份 / 日期格式）与返回字段以实现为准——细节请以 API 章节的 [options](/api/options) 与 `src/sdk/namespaces/*` 为准。

## 数据契约要点

期货与期权同样遵循 v2 的统一数据契约：

- 凡含时间的记录都带 `timestamp`（`number | null`，无效值为 `null` 而非 `NaN`）与 `tz`。
- 不再有 `raw` 字段；如需原始上游数据，用 provider 层的调试函数。
- 金额 / 价格以报价单位表示，不做跨币种折算；**股票 / 基金 / 期权类带 `currency` 字段（CNY/HKD/USD），而期货按交易所合约报价、类型不含 `currency`**。
