# sdk.options 期权

期权命名空间覆盖中金所股指期权、上交所 ETF 期权、商品期权、中金所期权全量行情，以及期权龙虎榜。它使用二级命名空间组织：

- `sdk.options.index` —— 中金所股指期权
- `sdk.options.etf` —— 上交所 ETF 期权
- `sdk.options.commodity` —— 商品期权
- `sdk.options.cffex` —— 中金所全量期权行情
- `sdk.options.lhb` —— 期权龙虎榜（顶层方法）

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const spot = await sdk.options.index.spot('io', 'io2504');
const kline = await sdk.options.etf.dailyKline('10009633');
const lhb = await sdk.options.lhb('510050', '2022-01-21');
```

## 方法表

| 方法 | 说明 |
|------|------|
| `options.index.spot(product, contract)` | 中金所股指期权 T 型报价（看涨 + 看跌） |
| `options.index.kline(symbol)` | 中金所股指期权合约日 K 线 |
| `options.etf.months(cate)` | 上交所 ETF 期权到期月份列表 |
| `options.etf.expireDay(cate, month)` | ETF 期权到期日与剩余天数 |
| `options.etf.minute(code)` | ETF 期权当日分钟行情 |
| `options.etf.dailyKline(code)` | ETF 期权历史日 K 线 |
| `options.etf.fiveDayMinute(code)` | ETF 期权 5 日分钟行情 |
| `options.commodity.spot(variety, contract)` | 商品期权 T 型报价 |
| `options.commodity.kline(symbol)` | 商品期权合约日 K 线 |
| `options.cffex.quotes()` | 中金所全部期权实时行情列表 |
| `options.lhb(symbol, date)` | 期权龙虎榜 |

> v2 数据契约：返回对象不含 `raw` 字段；带时间的字段 `timestamp` 为 `number | null`（无法解析为 `null`）；百分比为百分数（如 `5.2`）。下方字段为常见结构示意，**具体字段以实现为准**。

## 中金所股指期权 `options.index`

### `options.index.spot(product, contract)`

获取中金所股指期权 T 型报价，返回看涨（calls）与看跌（puts）两个合约列表。

```ts
const spot = await sdk.options.index.spot('io', 'io2504');
console.log(spot.calls); // 看涨合约列表
console.log(spot.puts);  // 看跌合约列表
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `product` | `'ho' \| 'io' \| 'mo'` | 品种代码：`ho`（上证 50）、`io`（沪深 300）、`mo`（中证 1000） |
| `contract` | `string` | 合约代码，如 `'io2504'` |

**返回说明：** `{ calls, puts }`，每个元素是一条 T 型报价（合约标识、最新价、买卖价量、持仓量、涨跌、行权价等）。

### `options.index.kline(symbol)`

获取中金所股指期权合约日 K 线。

```ts
const klines = await sdk.options.index.kline('io2504C3600');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 合约代码（含看涨 `C` / 看跌 `P` 标识），如 `'io2504C3600'` |

**返回说明：** 日 K 线数组，每根含日期、开高低收、成交量等字段（结构对齐统一 K 线契约）。

## 上交所 ETF 期权 `options.etf`

### `options.etf.months(cate)`

获取上交所 ETF 期权到期月份列表。

```ts
const info = await sdk.options.etf.months('50ETF');
console.log(info.months);  // ['2026-03', '2026-04', '2026-06']
console.log(info.stockId); // 标的证券代码
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cate` | `'50ETF' \| '300ETF' \| '500ETF' \| '科创50'` | 期权品种名称 |

**返回说明：** 含到期月份数组、标的证券代码、当前品种标识与可选品种列表。

### `options.etf.expireDay(cate, month)`

获取上交所 ETF 期权指定月份的到期日与剩余天数。

```ts
const info = await sdk.options.etf.expireDay('50ETF', '2026-03');
console.log(info.expireDay);     // '2026-03-25'
console.log(info.remainderDays); // 12
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cate` | `'50ETF' \| '300ETF' \| '500ETF' \| '科创50'` | 期权品种名称 |
| `month` | `string` | 到期月份 `YYYY-MM` |

**返回说明：** 含到期日、剩余天数、标的证券代码与标的名称。

### `options.etf.minute(code)`

获取上交所 ETF 期权当日分钟行情。

```ts
const minutes = await sdk.options.etf.minute('10009633');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 期权代码（纯数字），如 `'10009633'` |

**返回说明：** 分钟行情数组，每条含时间、价格、成交量、持仓量、均价等字段。

### `options.etf.dailyKline(code)`

获取上交所 ETF 期权历史日 K 线。

```ts
const klines = await sdk.options.etf.dailyKline('10009633');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 期权代码（纯数字） |

**返回说明：** 日 K 线数组（结构对齐统一 K 线契约）。

### `options.etf.fiveDayMinute(code)`

获取上交所 ETF 期权 5 日分钟行情。

```ts
const minutes = await sdk.options.etf.fiveDayMinute('10009633');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 期权代码（纯数字） |

**返回说明：** 跨 5 个交易日的分钟行情数组，字段同 `options.etf.minute`。

## 商品期权 `options.commodity`

### `options.commodity.spot(variety, contract)`

获取商品期权 T 型报价，返回看涨与看跌合约列表。

```ts
const spot = await sdk.options.commodity.spot('au', 'au2506');
console.log(spot.calls); // 看涨合约列表
console.log(spot.puts);  // 看跌合约列表
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `variety` | `string` | 品种代码，如 `'au'`、`'cu'`、`'SR'`、`'m'` |
| `contract` | `string` | 合约代码，如 `'au2506'` |

**支持的商品期权品种（示意）：**

- **上期所**：au（黄金）、ag（白银）、cu（铜）、al（铝）、zn（锌）、ru（橡胶）
- **能源所**：sc（原油）
- **大商所**：m（豆粕）、c（玉米）、i（铁矿石）、p（棕榈油）、pp、l、v、pg、y、a、b、eg、eb
- **郑商所**：SR（白糖）、CF（棉花）、TA、MA、RM、OI、PK、PF、SA、UR

**返回说明：** `{ calls, puts }`，结构同股指期权 T 型报价。

### `options.commodity.kline(symbol)`

获取商品期权合约日 K 线。

```ts
const klines = await sdk.options.commodity.kline('m2409C3200');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 合约代码（含看涨 `C` / 看跌 `P` 标识），如 `'m2409C3200'` |

**返回说明：** 日 K 线数组（结构对齐统一 K 线契约）。

## 中金所全量期权 `options.cffex`

### `options.cffex.quotes()`

获取中金所全部期权实时行情列表（东方财富数据源）。

```ts
const quotes = await sdk.options.cffex.quotes();
console.log(quotes[0].code); // 'MO2603-P-8200'
```

**返回说明：** 实时行情数组，每条含合约代码、名称、最新价、涨跌额/幅、成交量/额、持仓量、行权价、剩余天数、昨结算价等字段。

## 期权龙虎榜 `options.lhb`

### `options.lhb(symbol, date)`

获取指定标的、指定交易日的期权龙虎榜（成交量/持仓量排名席位）。

```ts
const lhb = await sdk.options.lhb('510050', '2022-01-21');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 标的代码，如 `'510050'`、`'510300'`、`'159919'` |
| `date` | `string` | 交易日期 `YYYY-MM-DD` |

**返回说明：** 龙虎榜条目数组，含交易类型、日期、标的代码/名称、会员简称、排名、买卖量等字段。

> v2 已移除旧版 `OptionLHBItem` 上的 `@deprecated` 字段别名（`tradeDate` / `volume` / `volumeChange` / 旧持仓与金额别名等）；请改用统一后的标准字段。具体字段以实现为准。
