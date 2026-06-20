# fund · 公募基金扩展

公募基金深度数据：分红送配、历史净值、实时估值、同类排名走势。

基金的实时行情请走 [`sdk.quotes.fund()`](./quotes.md)，本命名空间是它的扩展。所有方法挂在 `sdk.fund` 命名空间下，由内部 `FundService` 承载，数据来源为东方财富 / 天天基金。

## 方法一览

| 方法 | 说明 |
|---|---|
| `sdk.fund.dividendList(options?)` | 按年份分页查询全市场基金分红送配明细 |
| `sdk.fund.navHistory(code)` | 单只基金完整历史净值（单位净值 + 累计净值） |
| `sdk.fund.estimate(code)` | 当日盘中实时估值 + 最新已结算净值 |
| `sdk.fund.rankHistory(code)` | 同类排名走势（近三月排名 + 百分位） |

> 符号入参遵循 v2 统一约定：基金代码为纯数字字符串（如 `'110011'`）。具体字段以实现为准。

## sdk.fund.dividendList

按年份查询基金分红送配明细（数据来自天天基金分红送配频道）。

上游接口本身只支持「年份 + 全市场 + 翻页」查询，**不支持服务端按基金代码精确查**；要拿单只基金该年完整分红记录，请同时设置 `page: 'all'` 与 `code`（客户端过滤）。

### 参数

```ts
interface FundDividendListOptions {
  /** 查询年份，默认当前年（Asia/Shanghai） */
  year?: number | string;
  /** 页码（从 1 开始，默认 1）；设为 'all' 时自动翻完该年所有页并聚合 */
  page?: number | 'all';
  /** 基金类型筛选（例：'股票型' / '指数型-股票' / 'REITs'），空表示全部 */
  fundType?: string;
  /** 排序字段，默认 'FSRQ'（除息日期） */
  rank?: 'BZDM' | 'ABBNAME' | 'DJR' | 'FSRQ' | 'FHFCZ' | 'FFR';
  /** 排序方向，默认 'desc' */
  sort?: 'asc' | 'desc';
  /** 按基金代码客户端过滤；一般搭配 page: 'all' 使用 */
  code?: string;
}
```

`rank` 取值对应字段：

| 取值 | 含义 |
|---|---|
| `BZDM` | 基金代码 |
| `ABBNAME` | 基金简称 |
| `DJR` | 权益登记日 |
| `FSRQ` | 除息日期（默认） |
| `FHFCZ` | 分红（元/份） |
| `FFR` | 分红发放日 |

### 调用示例

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 拉 2024 年第 1 页（默认按除息日倒序）
const r1 = await sdk.fund.dividendList({ year: 2024 });
console.log(r1.totalPages, r1.pageSize, r1.items.length);

// 拉 2024 年某只基金的完整分红
const r2 = await sdk.fund.dividendList({
  year: 2024,
  page: 'all',
  code: '110011',
});
r2.items.forEach((d) => {
  console.log(`${d.exDividendDate}  分红 ${d.dividendPerShare} 元/份`);
});
```

### 返回说明

返回 `FundDividendListResult`，含分页元信息与分红条目数组：

```ts
interface FundDividendListResult {
  items: FundDividend[];
  totalPages: number;   // 数据源汇报的总页数
  pageSize: number;     // 每页条数
  currentPage: number;  // 当前页码；page: 'all' 时为 -1 表示已聚合
}

interface FundDividend {
  code: string;
  name: string;
  equityRecordDate: string | null;  // 权益登记日 YYYY-MM-DD
  exDividendDate: string | null;    // 除息日期 YYYY-MM-DD
  dividendPerShare: number | null;  // 分红金额（元/份）
  payDate: string | null;           // 分红发放日 YYYY-MM-DD
}
```

> v2 已移除返回对象上的 `raw` 字段（调试逃生舱改为 provider 层 `getXxxRaw()`）。具体字段以实现为准。

## sdk.fund.navHistory

获取单只基金完整历史净值（单位净值 + 累计净值，按时间对齐合并）。

一次请求即拿到该基金从成立日到最新交易日的全部净值（数千条），无需翻页。开放式 / ETF / LOF / 货币 / QDII 均通用。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | `string` | 是 | 基金代码（纯数字，如 `'110011'`） |

### 调用示例

```ts
const h = await sdk.fund.navHistory('110011');

console.log(h.name, '共', h.items.length, '条净值');
const latest = h.items[h.items.length - 1];
console.log(`最新: ${latest.date}  单位 ${latest.nav}  累计 ${latest.accNav}`);

// 拿最近 5 个交易日
console.log(h.items.slice(-5));
```

### 返回说明

返回 `FundNavHistory`，`items` 按日期升序：

```ts
interface FundNavHistory {
  code: string;
  name: string | null;
  items: FundNavPoint[];
}

interface FundNavPoint {
  date: string;                // 净值日期 YYYY-MM-DD
  timestamp: number | null;    // UTC 毫秒；无法解析为 null
  nav: number;                 // 单位净值
  accNav: number | null;       // 累计净值（对齐失败为 null）
  dailyReturn: number | null;  // 日增长率（百分数，如 1.23）
  unitMoney: string;           // 每万份收益（货币基金有意义；其余多为空串）
}
```

::: tip 数据量提示
单次响应较大（约 600KB / gzip 后约 120KB）。同一基金多次使用建议借助 [统一缓存层](../guide/installation.md) 或自行缓存。
:::

## sdk.fund.estimate

获取基金当日盘中实时估值（来自天天基金 fundgz 接口）。

同时返回最新已结算的单位净值（`nav` + `navDate`）和盘中实时估算（`estimatedNav` + `estimatedChangePercent` + `estimateTime`），适合做「当日实时表现 vs 上一收盘」对比。

QDII / 非交易日 / 部分小众基金的盘中估算字段可能为空，会返回 `null`。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | `string` | 是 | 基金代码（纯数字，如 `'005827'`） |

### 调用示例

```ts
const e = await sdk.fund.estimate('005827');
console.log(`${e.name}  最新净值 ${e.nav}（${e.navDate}）`);
console.log(`盘中估算 ${e.estimatedNav}  (${e.estimatedChangePercent}%)`);
console.log(`估算时间 ${e.estimateTime}`);
```

### 返回说明

```ts
interface FundEstimate {
  code: string;
  name: string | null;
  navDate: string | null;                // 已结算净值日期 YYYY-MM-DD
  nav: number | null;                    // 已结算单位净值
  estimatedNav: number | null;           // 盘中实时估值
  estimatedChangePercent: number | null; // 估算涨跌幅（百分数，如 1.23）
  estimateTime: string | null;           // 估算时间，如 "2026-05-26 15:00"
}
```

## sdk.fund.rankHistory

获取基金同类排名走势（每日近三月排名 + 百分位）。

数据源与 `navHistory` 相同（同一份 pingzhongdata 文件，不同字段），适合做「该基金在同类基金里的相对表现」折线图。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | `string` | 是 | 基金代码 |

### 调用示例

```ts
const r = await sdk.fund.rankHistory('110011');
const latest = r.items[r.items.length - 1];
console.log(`${r.name}  最新排名 ${latest.rank}/${latest.total}（前 ${latest.percentile}%）`);
```

### 返回说明

```ts
interface FundRankHistory {
  code: string;
  name: string | null;
  items: FundRankPoint[];
}

interface FundRankPoint {
  date: string;               // 报告日期 YYYY-MM-DD
  timestamp: number | null;   // UTC 毫秒；无法解析为 null
  rank: number | null;        // 同类近三月排名（越小越前）
  total: number | null;       // 同类基金总数
  percentile: number | null;  // 同类百分位（百分数，越小越好）
}
```

## 注意事项

1. **数据源**：分红走 `fund.eastmoney.com/Data/funddataIndex_Interface.aspx`；历史净值 / 同类排名走 `fund.eastmoney.com/pingzhongdata/{code}.js`；实时估值走 `fundgz.1234567.com.cn/js/{code}.js`。
2. **同基金同接口**：`navHistory` 与 `rankHistory` 实际下载同一份 pingzhongdata 文件（约 600KB）。如同时需要两类数据，建议合并调用或借助缓存层。
3. **浏览器端串行**：浏览器端这些接口通过 `<script>` 注入加载（数据源无 CORS 头），SDK 内部用脚本互斥锁兜底并发覆盖，因此 `Promise.all([...])` 在浏览器端实际是串行的。Node 端不受此限制。
4. **请求治理差异**：Node 端这些方法已接入 `RequestClient`（`retry` / `providerPolicies` 生效）；浏览器端 `<script>` 注入路径不走 `fetch`，`headers` / `rateLimit` / `circuitBreaker` 不生效，`timeout` 通过内部参数生效。详见 [请求治理](../guide/request-governance.md)。
5. **场内 ETF 行情**：场内 ETF（如 510050、159919）的实时行情与 K 线请走 [`sdk.quotes.cn()`](./quotes.md) / [`sdk.kline.cn()`](./kline.md) 等股票接口，不走本命名空间。
