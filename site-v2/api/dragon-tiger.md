# dragonTiger · 龙虎榜

`sdk.dragonTiger` 提供 A 股龙虎榜数据：每日上榜详情、个股汇总统计、机构买卖、营业部排行，以及个股某日的席位明细。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const detail = await sdk.dragonTiger.detail({ startDate: '20240101', endDate: '20240131' })
```

## 方法一览

| 方法 | 说明 |
|---|---|
| `dragonTiger.detail(options)` | 按日期范围获取每日龙虎榜上榜详情 |
| `dragonTiger.stockStats(period?)` | 按个股汇总的上榜统计（次数、累计买卖额等） |
| `dragonTiger.institution(options)` | 按日期范围获取机构买卖统计 |
| `dragonTiger.branchRank(period?)` | 营业部（席位）排行榜 |
| `dragonTiger.seatDetail(symbol, date)` | 个股某日上榜的席位明细（买入榜 + 卖出榜） |

> 所有金额字段以人民币元（CNY）为单位；含日期的返回项遵循统一数据契约，带 `date` / `timestamp`（`number | null`）/ `tz`。具体字段以实现为准。

## dragonTiger.detail

按日期范围获取每日龙虎榜上榜详情，每条记录对应一只个股某日的一次上榜。

### 调用示例

```ts
const details = await sdk.dragonTiger.detail({
  startDate: '20240101', // YYYYMMDD
  endDate: '20240131',
})

console.log(`1 月共上榜 ${details.length} 次`)

// 按龙虎榜净买额排序，取前 10
const topNet = [...details]
  .sort((a, b) => (b.netBuyAmount ?? 0) - (a.netBuyAmount ?? 0))
  .slice(0, 10)

for (const d of topNet) {
  console.log(`${d.date} ${d.name}(${d.code}) 净买入 ${d.netBuyAmount} 元`)
}
```

### 返回说明

返回 `DragonTigerDetailItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` / `name` | 股票代码 / 名称 |
| `date` | 上榜日期 |
| `close` | 当日收盘价（元，`number \| null`） |
| `changePercent` | 当日涨跌幅（百分数，如 `5.2`） |
| `netBuyAmount` | 龙虎榜净买额（元） |
| `buyAmount` / `sellAmount` | 龙虎榜买入额 / 卖出额（元） |
| `dealAmount` | 龙虎榜成交额（元） |
| `totalAmount` | 个股当日市场总成交额（元） |
| `netBuyRatio` | 净买额占总成交比（百分数） |
| `turnoverRate` | 换手率（百分数） |
| `reason` | 上榜原因 |
| `afterChange1d` / `afterChange2d` / `afterChange5d` / `afterChange10d` | 上榜后 N 日涨跌幅（百分数） |

> 完整字段以实现为准。

## dragonTiger.stockStats

按个股聚合的上榜统计，反映一段时间内的活跃个股。

### 调用示例

```ts
const stats = await sdk.dragonTiger.stockStats('3month')

const hot = stats
  .filter(s => (s.count ?? 0) >= 5)
  .sort((a, b) => (b.totalNetAmount ?? 0) - (a.totalNetAmount ?? 0))

console.log(`近 3 月上榜 5 次以上的有 ${hot.length} 只`)
```

### 参数

`period?: '1month' | '3month' | '6month' | '1year'`，默认按实现取近一月。

### 返回说明

返回 `DragonTigerStockStatItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` / `name` | 股票代码 / 名称 |
| `latestDate` | 最近一次上榜日期 |
| `close` / `changePercent` | 最新收盘价（元） / 涨跌幅（百分数） |
| `count` | 区间内上榜次数 |
| `totalBuyAmount` / `totalSellAmount` | 累计买入额 / 卖出额（元） |
| `totalNetAmount` | 累计净额（元） |
| `totalDealAmount` | 累计成交额（元） |
| `buyOrgCount` / `sellOrgCount` | 累计买方 / 卖方机构次数 |

> 完整字段以实现为准。

## dragonTiger.institution

按日期范围获取机构席位的买卖统计。

### 调用示例

```ts
const inst = await sdk.dragonTiger.institution({
  startDate: '20240101',
  endDate: '20240131',
})

const netBuy = inst.filter(i => (i.orgNetAmount ?? 0) > 0)
console.log(`机构净买入个股 ${netBuy.length} 条`)
```

### 返回说明

返回 `DragonTigerInstitutionItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` / `name` | 股票代码 / 名称 |
| `date` | 上榜日期 |
| `close` / `changePercent` | 收盘价（元） / 涨跌幅（百分数） |
| `buyOrgCount` / `sellOrgCount` | 买方 / 卖方机构数 |
| `orgBuyAmount` / `orgSellAmount` | 机构买入额 / 卖出额（元） |
| `orgNetAmount` | 机构净买额（元） |

> 完整字段以实现为准。

## dragonTiger.branchRank

获取营业部（席位）排行榜，按区间内累计买卖额衡量活跃营业部。

### 调用示例

```ts
const branches = await sdk.dragonTiger.branchRank('1month')

const topBuy = [...branches]
  .sort((a, b) => (b.totalBuyAmount ?? 0) - (a.totalBuyAmount ?? 0))
  .slice(0, 10)

for (const b of topBuy) {
  console.log(`${b.name} 累计买入 ${b.totalBuyAmount} 元`)
}
```

### 参数

`period?: '1month' | '3month' | '6month' | '1year'`。

### 返回说明

返回 `DragonTigerBranchItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` | 营业部编码 |
| `name` | 营业部名称 |
| `totalBuyAmount` / `totalSellAmount` | 累计买入额 / 卖出额（元） |
| `buyCount` / `sellCount` | 买入 / 卖出上榜次数 |
| `totalCount` | 累计上榜次数 |

> 完整字段以实现为准。

## dragonTiger.seatDetail

获取个股某日上榜的席位明细，买入榜与卖出榜合并返回，用 `side` 区分。

### 调用示例

```ts
const seats = await sdk.dragonTiger.seatDetail('600519', '20240115')

const buySide = seats.filter(s => s.side === 'buy')
const sellSide = seats.filter(s => s.side === 'sell')

console.log(`买方席位 ${buySide.length} 个`)
buySide.forEach(s => console.log(`  ${s.branchName} 买入 ${s.buyAmount} 元`))

console.log(`卖方席位 ${sellSide.length} 个`)
sellSide.forEach(s => console.log(`  ${s.branchName} 卖出 ${s.sellAmount} 元`))
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string \| SymbolRef` | 个股符号，如 `'600519'` / `'sh600519'` / `{ code: '600519' }` |
| `date` | `string` | 上榜日期，如 `'20240115'` |

### 返回说明

返回 `DragonTigerSeatItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `rank` | 席位排名 |
| `branchName` | 营业部 / 席位名称 |
| `buyAmount` / `buyAmountRatio` | 买入额（元） / 占比（百分数） |
| `sellAmount` / `sellAmountRatio` | 卖出额（元） / 占比（百分数） |
| `netAmount` | 净额（元） |
| `side` | `'buy'`（买入榜）/ `'sell'`（卖出榜） |

> 完整字段以实现为准。
