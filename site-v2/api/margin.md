# margin · 融资融券

`sdk.margin` 提供 A 股融资融券数据：市场层面的账户统计，以及个股层面的两融标的明细。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const account = await sdk.margin.accountInfo()
```

## 方法一览

| 方法 | 说明 |
|---|---|
| `margin.accountInfo()` | 融资融券账户统计（按日，市场宏观数据） |
| `margin.targetList(date?)` | 两融标的明细，可按指定交易日筛选 |

> 金额字段以人民币元（CNY）为单位、`loanBalance`（融券余量）等数量字段以股为单位；含日期的返回项遵循统一数据契约，带 `date` / `timestamp`（`number | null`）/ `tz`。具体字段以实现为准。

## margin.accountInfo

获取融资融券账户的市场宏观统计，按日返回，反映整体杠杆水平与担保比例。

### 调用示例

```ts
const account = await sdk.margin.accountInfo()
const latest = account[0]

console.log(`最新融资余额 ${latest?.finBalance} 元`)
console.log(`平均维持担保比例 ${latest?.avgGuaranteeRatio}%`)

// 近 30 日融资余额变化
const last30 = account.slice(0, 30)
const delta = (last30[0]?.finBalance ?? 0) - (last30.at(-1)?.finBalance ?? 0)
console.log(`30 日融资余额变化 ${delta} 元`)
```

### 返回说明

返回 `MarginAccountItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `date` | 统计日期 |
| `finBalance` | 融资余额（元） |
| `loanBalance` | 融券余额（元） |
| `finBuyAmount` | 融资买入额（元） |
| `loanSellAmount` | 融券卖出额（元） |
| `investorCount` | 参与交易的投资者数量 |
| `liabilityInvestorCount` | 有融资融券负债的投资者数量 |
| `totalGuarantee` | 担保物总额（元） |
| `avgGuaranteeRatio` | 平均维持担保比例（百分数） |

> 完整字段以实现为准。

## margin.targetList

获取两融标的明细，每条记录对应一只可融资融券的个股；不传日期时取服务端最新交易日。

### 调用示例

```ts
// 默认服务端最新交易日
const targets = await sdk.margin.targetList()
console.log(`两融标的数量 ${targets.length}`)

// 按融资余额排序，找出加杠杆最多的 10 只
const top10 = [...targets]
  .sort((a, b) => (b.finBalance ?? 0) - (a.finBalance ?? 0))
  .slice(0, 10)

top10.forEach((t, i) => {
  console.log(`#${i + 1} ${t.name}(${t.code}) 融资余额 ${t.finBalance} 元`)
})

// 查询指定日期
const jan15 = await sdk.margin.targetList('2024-01-15')
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `date` | `string?` | 交易日，如 `'2024-01-15'`；省略时取最新交易日 |

### 返回说明

返回 `MarginTargetItem[]`，代表性字段：

| 字段 | 说明 |
|---|---|
| `code` / `name` | 股票代码 / 名称 |
| `date` | 数据日期 |
| `finBalance` | 融资余额（元） |
| `finBuyAmount` | 融资买入额（元） |
| `finRepayAmount` | 融资偿还额（元） |
| `loanBalance` | 融券余量（股） |
| `loanSellVolume` | 融券卖出量（股） |
| `loanRepayVolume` | 融券偿还量（股） |

> 完整字段以实现为准。
