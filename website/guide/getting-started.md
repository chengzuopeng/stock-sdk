# 快速开始

本页用几段最小示例带你跑通 v2 的命名空间 API。开始前请先完成[安装](/guide/installation)。

## 创建实例

`StockSDK` 是唯一入口，所有命名空间挂在实例上：

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
```

构造函数接受可选配置（自定义 `fetch`、外部 `AbortSignal`、请求 hooks、缓存等），不传则使用默认值。详见[请求治理](/guide/request-governance)。

::: tip 长驻进程请复用单例
实例级缓存（代码表 / 交易日历 / 板块映射等）按 `StockSDK` 实例隔离（v2.4.0 起）。"每请求 `new StockSDK()`"会让每个实例缓存冷启——长驻服务请在模块顶层创建一次并复用；需要强刷缓存时调用 `sdk.clearCaches()`。
:::

## 10 行 demo

获取一只 A 股的实时行情，并打印价格与涨跌幅：

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

const quotes = await sdk.quotes.cn(['sh600519'])
const q = quotes[0]

console.log(q.name)           // 名称
console.log(q.price)          // 现价（单位以数据源当前口径为准）
console.log(q.changePercent)  // 涨跌幅（百分数，如 5.2 表示 5.2%）
```

> 符号 `string` 是一等公民，`'sh600519'` / `'600519'` 都能识别；需要消歧时可先用 `stock-sdk/symbols` 的 `normalizeSymbol`。返回字段以最终实现为准。

## 常见用法

### 取多市场实时行情

```ts
await sdk.quotes.cn(['sh600519', '000001'])  // A 股
await sdk.quotes.hk(['00700'])               // 港股
await sdk.quotes.us(['AAPL'])                // 美股
await sdk.quotes.fund(['510300'])            // 基金
```

### 历史 K 线

```ts
// A 股日 K 线
const kline = await sdk.kline.cn('600519', { period: 'daily' })

// 分钟 K 线 / 港股 / 美股
await sdk.kline.cnMinute('600519')
await sdk.kline.hk('00700', { period: 'daily' })
await sdk.kline.us('AAPL', { period: 'daily' })
```

> K 线方法的具体参数（周期、复权、数量、日期范围等）以实现为准。

### K 线 + 技术指标

```ts
// 直接返回带指标的 K 线
const withInd = await sdk.kline.withIndicators('600519', {
  indicators: { ma: [5, 20], macd: true },
})
```

也可以先拿原始 K 线，再用纯计算函数贴指标（不发网络请求）：

```ts
import { addIndicators } from 'stock-sdk/indicators'

const kline = await sdk.kline.cn('600519', { period: 'daily' })
const enriched = addIndicators(kline, { ma: [5, 20], macd: true, kdj: true })
```

### 识别买卖信号

```ts
import { addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'

const kline = await sdk.kline.cn('600519', { period: 'daily' })
const enriched = addIndicators(kline, { ma: [5, 20], macd: true })

const signals = calcSignals(enriched, {
  ma: { fast: 5, slow: 20 },  // 金叉 / 死叉
  macd: true,
})
// [{ type: 'ma_golden_cross', at, index, detail }, ...]
```

### 搜索标的

```ts
const results = await sdk.search('贵州茅台')
```

### 交易日历

```ts
await sdk.calendar.isTradingDay('2026-06-08')
await sdk.calendar.nextTradingDay('2026-06-08')
await sdk.calendar.marketStatus('CN')
```

### 板块与衍生品

```ts
await sdk.board.industry.list()            // 行业板块列表
await sdk.board.concept.constituents('半导体') // 概念板块成分股

await sdk.options.etf.dailyKline('10004336') // ETF 期权日 K
await sdk.futures.kline('rb2510')            // 期货 K 线
```

### 资金面

```ts
await sdk.fundFlow.individual('600519')   // 个股资金流向
await sdk.northbound.summary()            // 北向资金概况
await sdk.dragonTiger.detail('2026-06-06') // 龙虎榜
```

## 错误处理

v2 对外只抛 `SdkError`，带稳定的 `code` 字段，便于按类型分支处理：

```ts
import { SdkError } from 'stock-sdk/errors'

try {
  await sdk.quotes.cn(['sh600519'])
} catch (err) {
  if (err instanceof SdkError) {
    console.error(err.code, err.message) // 如 'TIMEOUT' / 'HTTP_ERROR'
  }
}
```

详见[错误处理与重试](/guide/retry)。

## 下一步

- [符号与代码规则](/guide/symbols)：`string` 与 `SymbolRef` 的容错解析与已知歧义。
- [技术指标与信号](/guide/indicators)：指标函数与信号层全貌。
- [API 总览](/api/)：命名空间地图与完整方法表。
- [从 v1 迁移](/guide/migration-v1-to-v2)：方法映射与契约变化。
