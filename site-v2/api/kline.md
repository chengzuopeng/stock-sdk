# kline · K 线与分时

`sdk.kline` 提供 A 股 / 港股 / 美股的历史 K 线、分钟 K 线，以及带技术指标的 K 线。所有方法第一个参数都是符号（裸 `string` 或 `SymbolRef`，由 `normalizeSymbol` 容错解析），第二个参数是可选的周期 / 复权 / 时间范围选项。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// A 股日线（默认前复权）
const daily = await sdk.kline.cn('600519')

// 美股分钟 K 线（15 分钟）
const us15 = await sdk.kline.us('AAPL', { period: '15' })
```

## 方法表

| 方法 | 说明 |
|---|---|
| `kline.cn(symbol, opts?)` | A 股历史 K 线（日 / 周 / 月） |
| `kline.cnMinute(symbol, opts?)` | A 股分钟 K 线 / 分时（1 / 5 / 15 / 30 / 60 分钟） |
| `kline.hk(symbol, opts?)` | 港股历史 K 线 |
| `kline.hkMinute(symbol, opts?)` | 港股分钟 K 线 / 分时 |
| `kline.us(symbol, opts?)` | 美股历史 K 线 |
| `kline.usMinute(symbol, opts?)` | 美股分钟 K 线 / 分时 |
| `kline.withIndicators(symbol, opts?)` | 历史 K 线 + 内置技术指标（MA / MACD / KDJ 等） |

> 数据来源为东方财富。港股 / 美股 K 线仅含常规交易时段，不含盘前 / 盘后。

## 参数概览

历史 K 线（`cn` / `hk` / `us`）的选项形如：

```ts
interface HistoryKlineOptions {
  /** K 线周期 @default 'daily' */
  period?: 'daily' | 'weekly' | 'monthly'
  /** 复权类型 @default 'qfq' */
  adjust?: '' | 'qfq' | 'hfq'
  /** 开始日期 YYYYMMDD */
  startDate?: string
  /** 结束日期 YYYYMMDD */
  endDate?: string
}
```

分钟 K 线（`cnMinute` / `hkMinute` / `usMinute`）的选项形如：

```ts
interface MinuteKlineOptions {
  /** 周期(分钟) @default '1' */
  period?: '1' | '5' | '15' | '30' | '60'
  /** 复权类型(仅 5/15/30/60 生效;1 分钟分时不复权) @default 'qfq' */
  adjust?: '' | 'qfq' | 'hfq'
  startDate?: string
  endDate?: string
}
```

> 具体字段以实现为准。

### 周期（period）

| 维度 | 取值 | 含义 |
|---|---|---|
| 历史 K 线 | `'daily'` / `'weekly'` / `'monthly'` | 日线（默认） / 周线 / 月线 |
| 分钟 K 线 | `'1'` / `'5'` / `'15'` / `'30'` / `'60'` | 1（默认）/ 5 / 15 / 30 / 60 分钟 |

分钟方法在 `period: '1'` 时返回**当日分时**结构（含 `avgPrice` 均价），`'5' | '15' | '30' | '60'` 时返回标准**分钟 K 线**结构（含 `amplitude` / `changePercent` / `turnoverRate`）。

### 复权（adjust）

| 取值 | 含义 | 适用场景 |
|---|---|---|
| `'qfq'` | 前复权（**默认**） | 以最新价为基准回调历史价格，适合看走势、画图 |
| `'hfq'` | 后复权 | 固定历史价格、把分红送股摊到当下，适合**回测 / 长期收益率 / 复利**计算 |
| `''` | 不复权 | 交易所原始价格 |

> 做回测或收益率计算时，请**显式**传 `'hfq'` 或 `''`，不要依赖默认的前复权——更多见[复权说明](/guide/dividend-adjustment)。1 分钟分时不支持复权。

## 调用示例

```ts
// A 股周线，后复权，限定时间范围
const cnWeekly = await sdk.kline.cn('600519', {
  period: 'weekly',
  adjust: 'hfq',
  startDate: '20240101',
  endDate: '20241231',
})

// A 股 5 分钟 K 线
const cn5m = await sdk.kline.cnMinute('600519', { period: '5' })

// A 股当日分时（period 默认 '1'）
const cnTimeline = await sdk.kline.cnMinute('600519')

// 港股日线（符号可写 '00700' / 'hk00700' / '00700.HK'）
const hk = await sdk.kline.hk('00700')

// 美股日线，不复权
const us = await sdk.kline.us('AAPL', { adjust: '' })

// 带指标的 K 线
const withInd = await sdk.kline.withIndicators('600519', { period: 'daily' })
```

## 返回说明

历史 K 线返回一个数组，每一项为某周期内的一根 K 线，按时间升序排列。核心字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | `string` | 日期 `YYYY-MM-DD`（市场本地时区） |
| `timestamp` | `number \| null` | 当日 00:00 对应的 UTC 毫秒；无法解析为 `null` |
| `tz` | `string` | 该日期所属市场时区，如 `Asia/Shanghai` |
| `code` | `string` | 标的代码 |
| `open` / `close` / `high` / `low` | `number \| null` | 开 / 收 / 高 / 低 |
| `volume` / `amount` | `number \| null` | 成交量 / 成交额 |
| `amplitude` / `changePercent` / `change` / `turnoverRate` | `number \| null` | 振幅% / 涨跌幅% / 涨跌额 / 换手率% |

港股 / 美股历史 K 线额外带 `currency`（`'HKD'` / `'USD'`）与 `name`；港股另含 `lotSize`（K 线接口暂不返回，固定 `null`，每手股数请用 `sdk.quotes.hk`）。

分钟 K 线（`'5'~'60'`）字段与历史 K 线类似，时间字段为 `time`（`YYYY-MM-DD HH:mm`）；当日分时（`'1'`）则为 `time` + `open/close/high/low` + `volume/amount` + `avgPrice`。

> 百分比字段为百分数（如涨跌幅 `5.2` 表示 5.2%）；金额 / 价格以各市场计价货币的主单位计（A 股=元、港股=港元、美股=美元，不跨币种折算），成交量目标口径为「股」。`timestamp` 无效时为 `null`（不再使用 `NaN`）。**具体字段以实现为准。**

## 带指标的 K 线

`kline.withIndicators` 在历史 K 线基础上贴上内置技术指标（MA / MACD / BOLL / KDJ / RSI 等），返回 `KlineWithIndicators` 结构，省去自己拼接指标的步骤。

```ts
const klines = await sdk.kline.withIndicators('600519', {
  period: 'daily',
  adjust: 'hfq',
})
```

如果你已经拿到了 K 线数组，也可以用 subpath 导出的纯函数自行计算，互不依赖网络：

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'

const macd = calcMACD(klines)
const enriched = addIndicators(klines, { ma: [5, 20], macd: true })
const signals = calcSignals(enriched, { ma: { fast: 5, slow: 20 }, macd: true })
```

详见 [indicators](/api/indicators) 与 [signals](/api/signals)。

## 相关

- [符号与代码规则](/guide/symbols) —— `string` / `SymbolRef` 与 `normalizeSymbol`
- [复权说明](/guide/dividend-adjustment) —— qfq / hfq / 不复权口径
- [quotes](/api/quotes) —— 实时行情
- [board](/api/board) —— 板块 K 线
