# sdk.quotes · 实时行情

`sdk.quotes` 命名空间提供各市场的实时/快照行情：A 股全量与简要、港股、美股、基金，以及资金流(简版)、盘口大单、当日分时。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const list = await sdk.quotes.cn(['600519', '000001'])
```

## 方法表

| 方法 | 说明 |
|---|---|
| `quotes.cn(codes)` | A 股全量行情（含五档、换手率、PE/PB、涨跌停等专有字段） |
| `quotes.cnSimple(codes)` | A 股简要行情（精简字段，开销更小） |
| `quotes.hk(codes)` | 港股行情 |
| `quotes.us(codes)` | 美股行情 |
| `quotes.fund(codes)` | 基金行情（单位净值 / 累计净值） |
| `quotes.fundFlow(codes)` | 资金流向（简版，腾讯源） |
| `quotes.largeOrder(codes)` | 盘口大单 |
| `quotes.timeline(code)` | 当日分时 |

> **`quotes.fundFlow` vs `sdk.fundFlow.*`**：前者是简版资金流（腾讯源，随行情快照返回）；后者是深度资金流（东财源，含个股 / 大盘 / 排名 / 板块历史）。两者数据来源与维度不同，见 [fundFlow](/api/fund-flow)。

## 调用示例

### A 股行情

```ts
// 入参为代码数组，符号写法容错：裸码 / 带前缀 / secid 均可
const quotes = await sdk.quotes.cn(['600519', 'sh601318', '000001'])

for (const q of quotes) {
  console.log(q.name, q.price, q.changePercent) // 贵州茅台 1680.5 1.23
}
```

### A 股简要行情

```ts
// 字段更少、开销更小，适合做大盘/自选列表轮询
const simple = await sdk.quotes.cnSimple(['600519', '000858'])
```

### 港股 / 美股

```ts
const hk = await sdk.quotes.hk(['00700', '09988']) // 5 位数字识别为港股
const us = await sdk.quotes.us(['AAPL', 'TSLA']) // 纯字母识别为美股
```

### 基金

```ts
const fund = await sdk.quotes.fund(['161725'])
console.log(fund[0].nav, fund[0].accNav) // 单位净值 / 累计净值
```

### 盘口大单 / 当日分时

```ts
const orders = await sdk.quotes.largeOrder(['600519'])
const timeline = await sdk.quotes.timeline('600519') // 单个代码
```

## 返回说明：Quote 可辨识联合

A 股 / 港股 / 美股 / 基金行情返回**以 `assetType` 判别的联合类型** `Quote`。先用 `switch` 收窄，再访问各市场专有字段：

```ts
const [q] = await sdk.quotes.cn(['600519'])

switch (q.assetType) {
  case 'stock':
    console.log(q.bid, q.ask, q.turnoverRate, q.pe) // A 股专有
    break
  case 'fund':
    console.log(q.nav, q.accNav) // 基金专有
    break
}
```

### 基础字段（所有行情共有）

| 字段 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | 规范化标准符号 |
| `code` | `string` | 纯代码（无前缀，如 `600519`） |
| `name` | `string` | 名称 |
| `market` | `'CN' \| 'HK' \| 'US' \| 'GLOBAL'` | 交易区域 |
| `assetType` | `'stock' \| 'fund' \| ...` | 资产类型（联合判别字段） |
| `exchange` | `string` | 交易所（如 `SSE` / `HKEX` / `NASDAQ`） |
| `currency` | `string` | ISO 计价货币（`CNY` / `HKD` / `USD`），决定下方金额 / 价格单位 |
| `source` | `string` | 数据来源（`tencent` / `eastmoney` / `sina`） |
| `time` | `string` | 原始时间字符串（市场时区） |
| `timestamp` | `number \| null` | UTC 毫秒；无法解析为 `null` |
| `tz` | `MarketTz` | 市场时区 |

### 行情字段（股票类）

| 字段 | 类型 | 说明 |
|---|---|---|
| `price` | `number` | 现价（当前 beta 以数据源原始口径为准） |
| `prevClose` / `open` / `high` / `low` | `number` | 昨收 / 今开 / 最高 / 最低 |
| `change` | `number` | 涨跌额 |
| `changePercent` | `number` | 涨跌幅（百分数，如 `5.2`） |
| `volume` | `number` | 成交量（当前 beta 以数据源原始口径为准） |
| `amount` | `number` | 成交额（当前 beta 以数据源原始口径为准） |

A 股（`StockQuote`）额外含五档 `bid` / `ask`、`turnoverRate`、`pe`、`pb`、`limitUp`、`limitDown` 等；港股含 `lotSize`；美股含 `pe` / `pb`。基金（`FundQuote`）则为 `nav` / `accNav` / `change` / `changePercent`。

::: tip 口径约定
- 百分比为**百分数**（`5.2` 表示 5.2%，非 `0.052`）。
- 金额 / 价格目标口径为各市场**计价货币主单位**（A股=元 / 港股=港元 / 美股=美元），由 `currency` 标明，**不跨币种折算**。
- 成交量目标口径为**股**。
- 当前 beta 尚未完成逐源单位校准，运行值仍以各 provider 原始口径为准（例如腾讯 A 股成交量为手、成交额为万元）。
- 无效时间用 `null` 表示（不再是 `NaN`）。
- `raw` 字段已移除；如需调试原始报文，使用 provider 层的 `getXxxRaw()`。
:::

> 具体字段以实现为准。完整字段列表随 `src/sdk/namespaces/quotesNs.ts` 与各类型定义最终确定。
