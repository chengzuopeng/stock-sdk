# blockTrade · 大宗交易

`sdk.blockTrade` 提供 A 股大宗交易数据：市场每日总览、逐笔成交明细，以及按个股聚合的每日统计。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const stat = await sdk.blockTrade.marketStat()
```

## 方法一览

| 方法 | 说明 |
|---|---|
| `blockTrade.marketStat()` | 大宗交易市场每日总览（按日聚合的宏观数据） |
| `blockTrade.detail(options?)` | 按日期范围获取大宗交易逐笔明细 |
| `blockTrade.dailyStat(options?)` | 按个股聚合的大宗交易每日统计 |

> 所有金额字段以人民币元（CNY）为单位；含日期的返回项遵循统一数据契约，带 `date` / `timestamp`（`number | null`）/ `tz`。具体字段以实现为准。

## blockTrade.marketStat

获取大宗交易市场每日总览，反映每日大宗成交规模与溢价 / 折价结构。

### 调用示例

```ts
const stat = await sdk.blockTrade.marketStat()

stat.slice(0, 5).forEach(s => {
  console.log(
    `${s.date} 总额 ${s.totalAmount} 元，溢价占比 ${s.premiumRatio}%，折价占比 ${s.discountRatio}%`,
  )
})
```

### 返回说明

返回 `BlockTradeMarketStatItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `date` | 交易日 |
| `shClose` | 上证指数收盘 |
| `shChangePercent` | 上证涨跌幅（百分数） |
| `totalAmount` | 大宗交易总成交额（元） |
| `premiumAmount` / `premiumRatio` | 溢价成交额（元） / 占比（百分数） |
| `discountAmount` / `discountRatio` | 折价成交额（元） / 占比（百分数） |

> 完整字段以实现为准。

## blockTrade.detail

按日期范围获取大宗交易逐笔明细，每条记录对应一笔成交。

### 调用示例

```ts
const detail = await sdk.blockTrade.detail({
  startDate: '20240101', // YYYYMMDD 或 YYYY-MM-DD
  endDate: '20240131',
})

// 筛选某只个股的大宗成交
const moutai = detail.filter(d => d.code === '600519')
for (const d of moutai) {
  console.log(`${d.date} 成交价 ${d.dealPrice}，溢价率 ${d.premiumRate}%`)
}
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `options.startDate` | `string?` | 起始日期，`YYYYMMDD` 或 `YYYY-MM-DD` |
| `options.endDate` | `string?` | 结束日期 |

> 不传参时按实现取默认区间。

### 返回说明

返回 `BlockTradeDetailItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` / `name` | 股票代码 / 名称 |
| `date` | 成交日期 |
| `close` / `changePercent` | 当日收盘价（元） / 涨跌幅（百分数） |
| `dealPrice` | 大宗成交价（元） |
| `dealVolume` | 成交量（股） |
| `dealAmount` | 成交额（元） |
| `premiumRate` | 溢价率（百分数，负值为折价） |
| `buyBranch` / `sellBranch` | 买方 / 卖方营业部 |

> 完整字段以实现为准。

## blockTrade.dailyStat

按个股聚合的大宗交易每日统计，把同一个股同一日的多笔成交汇总成一条。

### 调用示例

```ts
const daily = await sdk.blockTrade.dailyStat({
  startDate: '20240101',
  endDate: '20240131',
})

// 找出当月大宗成交总额最高的个股
const top = [...daily]
  .sort((a, b) => (b.dealTotalAmount ?? 0) - (a.dealTotalAmount ?? 0))
  .slice(0, 10)

top.forEach(d => console.log(`${d.name}(${d.code}) 成交总额 ${d.dealTotalAmount} 元`))
```

### 参数

与 `blockTrade.detail` 一致，支持可选的 `startDate` / `endDate`。

### 返回说明

返回 `BlockTradeDailyStatItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` / `name` | 股票代码 / 名称 |
| `date` | 统计日期 |
| `close` / `changePercent` | 收盘价（元） / 涨跌幅（百分数） |
| `dealCount` | 成交笔数 |
| `dealTotalAmount` | 成交总额（元） |
| `dealTotalVolume` | 成交总量（股） |
| `premiumAmount` / `discountAmount` | 溢价 / 折价成交额（元） |

> 完整字段以实现为准。
