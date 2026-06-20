# board · 行业 / 概念板块

`sdk.board` 下分两个子命名空间，结构完全对称：

- `sdk.board.industry` —— 行业板块
- `sdk.board.concept` —— 概念板块

两者方法名一致：`list` / `spot` / `constituents` / `kline` / `minuteKline`。除 `list()` 外，其余方法第一个参数是**板块代码或板块名称**（如 `'BK1027'` 或 `'半导体'`），SDK 内部维护名称到代码的映射。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// 行业板块列表
const industries = await sdk.board.industry.list()

// 半导体概念成分股
const stocks = await sdk.board.concept.constituents('半导体')
```

## 方法表

> `industry` 与 `concept` 子命名空间方法完全相同，下表以 `board.industry.*` 示意，`board.concept.*` 同理。

| 方法 | 说明 |
|---|---|
| `board.industry.list()` | 行业板块列表（含涨跌幅、市值、领涨股等） |
| `board.industry.spot(symbol)` | 某板块的实时行情指标 |
| `board.industry.constituents(symbol)` | 某板块的成分股列表 |
| `board.industry.kline(symbol, opts?)` | 某板块的历史 K 线（日 / 周 / 月） |
| `board.industry.minuteKline(symbol, opts?)` | 某板块的分钟 K 线 / 分时 |

> 数据来源为东方财富。`symbol` 接受板块代码（如 `'BK1027'`）或板块名称（如 `'半导体'`）。

## 参数概览

板块历史 K 线选项与个股一致：

```ts
interface BoardKlineOptions {
  /** K 线周期 @default 'daily' */
  period?: 'daily' | 'weekly' | 'monthly'
  /** 复权类型 @default '' */
  adjust?: '' | 'qfq' | 'hfq'
  /** 开始日期 YYYYMMDD */
  startDate?: string
  /** 结束日期 YYYYMMDD */
  endDate?: string
}
```

板块分钟 K 线选项只含周期：

```ts
interface BoardMinuteKlineOptions {
  /** 周期(分钟) @default '5' */
  period?: '1' | '5' | '15' | '30' | '60'
}
```

`period: '1'` 返回**分时**结构（含 `price` 最新价），`'5' | '15' | '30' | '60'` 返回标准**分钟 K 线**结构。复权 / 周期取值含义与个股 K 线一致，详见 [kline](/api/kline) 与[复权说明](/guide/dividend-adjustment)。

> 具体字段以实现为准。

## 调用示例

```ts
// 概念板块列表
const concepts = await sdk.board.concept.list()

// 某行业板块的实时行情指标
const spot = await sdk.board.industry.spot('BK1027')

// 半导体概念成分股
const cons = await sdk.board.concept.constituents('半导体')

// 行业板块周线
const klineWeekly = await sdk.board.industry.kline('BK1027', {
  period: 'weekly',
})

// 概念板块 5 分钟 K 线
const minute = await sdk.board.concept.minuteKline('半导体', { period: '5' })
```

## 返回说明

### list()

返回板块数组，按涨跌幅排名。核心字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `rank` | `number` | 排名 |
| `name` | `string` | 板块名称 |
| `code` | `string` | 板块代码，如 `BK1027` |
| `price` | `number \| null` | 最新价 |
| `change` / `changePercent` | `number \| null` | 涨跌额 / 涨跌幅% |
| `totalMarketCap` | `number \| null` | 总市值 |
| `turnoverRate` | `number \| null` | 换手率% |
| `riseCount` / `fallCount` | `number \| null` | 上涨 / 下跌家数 |
| `leadingStock` | `string \| null` | 领涨股名称 |
| `leadingStockChangePercent` | `number \| null` | 领涨股涨跌幅% |

### spot(symbol)

返回 `{ item, value }` 形式的指标列表（如最新价、涨跌幅、成交额、换手率等），适合做键值展示。

### constituents(symbol)

返回成分股数组，每项含 `rank` / `code` / `name` / `price` / `changePercent` / `change` / `volume` / `amount` / `amplitude` / `high` / `low` / `open` / `prevClose` / `turnoverRate` / `pe` / `pb`。

### kline / minuteKline

历史 K 线每项含 `date` + OHLC（`open/close/high/low`）+ `volume/amount` + `amplitude/changePercent/change/turnoverRate`。分钟 K 线时间字段为 `time`；`period: '1'` 的分时项额外含 `price`（最新价）而不含涨跌幅 / 换手率字段。

> 百分比字段为百分数（如涨跌幅 `5.2` 表示 5.2%），金额 / 价格为人民币元口径。返回值不含 `raw` 字段。**具体字段以实现为准。**

## 相关

- [kline](/api/kline) —— 个股 K 线与复权 / 周期参数详解
- [复权说明](/guide/dividend-adjustment)
- [fundFlow](/api/fund-flow) —— 板块资金流向（`sectorRank` / `sectorHistory`）
