# sdk.batch · 批量行情

`sdk.batch` 命名空间用于**全市场或大批量**行情拉取：一次取回整个 A 股 / 港股 / 美股市场的行情快照，或按给定代码批量取数。相比逐个调用 [quotes](/api/quotes)，batch 内部做了分片与并发编排，适合选股、扫描、看板等场景。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const all = await sdk.batch.cn()
```

## 方法表

| 方法 | 说明 |
|---|---|
| `batch.cn(opts?)` | 全市场 A 股批量行情 |
| `batch.hk(opts?)` | 全市场港股批量行情 |
| `batch.us(opts?)` | 全市场美股批量行情 |
| `batch.byCodes(codes, opts?)` | 按指定代码批量取行情（跨市场可由符号推断） |
| `batch.raw(params)` | 原始批量接口（直传底层参数，返回未归并的原始结构） |

## 调用示例

### 全市场快照

```ts
// 一次取回整个 A 股市场
const all = await sdk.batch.cn()
console.log(all.length) // 数千条

// 港股 / 美股全市场
const hk = await sdk.batch.hk()
const us = await sdk.batch.us()
```

### 按代码批量

```ts
// 跨市场代码可混传，由 normalizeSymbol 推断各自市场
const quotes = await sdk.batch.byCodes(['600519', '00700', 'AAPL'])
```

### 进度回调

全市场批量内部分片并发，可通过 options 监听进度（具体参数以实现为准）：

```ts
const all = await sdk.batch.cn({
  onProgress: ({ loaded, total }) => {
    console.log(`${loaded}/${total}`)
  },
})
```

### 原始批量

`batch.raw` 直传底层参数、返回未归并的原始结构，作为高级逃生舱（绕过统一契约）：

```ts
const raw = await sdk.batch.raw({ /* 底层参数，以实现为准 */ })
```

## 返回说明

`batch.cn` / `batch.hk` / `batch.us` / `batch.byCodes` 返回 [Quote 可辨识联合](/api/quotes#返回说明-quote-可辨识联合) **数组**，字段与 `sdk.quotes.*` 一致：基础字段 `symbol` / `market` / `assetType` / `exchange` / `currency` / `timestamp` / `tz` / `source`，行情字段 `price` / `change` / `changePercent` / `volume` / `amount` 等。

```ts
const all = await sdk.batch.cn()

// 全市场本地筛选（也可直接用 sdk.screener()）
const hot = all.filter(
  (q) => q.assetType === 'stock' && q.changePercent > 5,
)
```

::: tip 口径与缓存
- 返回值遵循 v2 统一口径：百分比为百分数、金额 / 价格为计价货币主单位、成交量单位为股、`timestamp` 为 `number | null`、无 `raw` 字段。
- 全市场快照适合配合缓存做短 TTL 复用，避免短时间内重复全量拉取。
- `batch.raw` 返回原始结构，**不**经统一契约归并，字段以底层接口为准。
:::

> batch 是 [选股器 `sdk.screener()`](/api/) 的底层数据源。具体并发参数、进度回调签名与原始结构以实现为准，随 `src/sdk/namespaces` 最终确定。
