# 基金扩展数据（v1.10.0+）

公募基金深度数据：分红送配、历史净值、实时估值、同类排名走势。

实时行情见 [基金行情](./fund-quotes.md)，本页是它的扩展。所有方法挂在 `StockSDK` 实例上，由内部 `FundService` 承载，数据来源为东方财富 / 天天基金。

## getFundDividendList

获取基金分红明细（来自天天基金分红送配频道）。

接口本身只支持「年份 + 全市场 + 翻页」查询，**不支持服务端按基金代码精确查**；要拿单只基金该年完整分红记录，请同时设置 `page: 'all'` 与 `code`。

### 签名

```typescript
getFundDividendList(options?: FundDividendListOptions): Promise<FundDividendListResult>
```

### 参数

```typescript
interface FundDividendListOptions {
  /** 查询年份，默认当前年（Asia/Shanghai） */
  year?: number | string;
  /** 页码（从 1 开始，默认 1）；设为 'all' 时自动翻完该年份所有页面并聚合 */
  page?: number | 'all';
  /** 基金类型筛选（例：'股票型' / '指数型-股票' / 'REITs' 等），空表示全部 */
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

### 返回类型

```typescript
interface FundDividendListResult {
  items: FundDividend[];
  totalPages: number;       // 数据源汇报的总页数
  pageSize: number;         // 每页条数
  currentPage: number;      // 当前页码；page: 'all' 时为 -1 表示已聚合
}

interface FundDividend {
  code: string;
  name: string;
  equityRecordDate: string | null;    // 权益登记日 YYYY-MM-DD
  exDividendDate: string | null;      // 除息日期 YYYY-MM-DD
  dividendPerShare: number | null;    // 分红金额（元/份）
  payDate: string | null;             // 分红发放日 YYYY-MM-DD
  raw: string[];                      // 原始 7 字段数组（含末位类型代码）
}
```

### 示例

```typescript
// 拉 2024 年第 1 页（默认按除息日倒序）
const r1 = await sdk.getFundDividendList({ year: 2024 });
console.log(r1.totalPages, r1.pageSize, r1.items.length);

// 拉 2024 年某只基金的完整分红
const r2 = await sdk.getFundDividendList({
  year: 2024,
  page: 'all',
  code: '110011',
});
r2.items.forEach(d => {
  console.log(`${d.exDividendDate}  分红 ${d.dividendPerShare} 元/份`);
});
```

---

## getFundNavHistory

获取基金历史净值（单位净值 + 累计净值，按 timestamp 对齐合并）。

一次请求拿到该基金从成立日到最新交易日的全部净值（数千条），无需翻页。开放式 / ETF / LOF / 货币 / QDII 均通用。

### 签名

```typescript
getFundNavHistory(code: string): Promise<FundNavHistory>
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | `string` | ✅ | 基金代码（纯数字，如 `'110011'`） |

### 返回类型

```typescript
interface FundNavHistory {
  code: string;             // 基金代码
  name: string | null;      // 基金简称
  items: FundNavPoint[];    // 按日期升序
}

interface FundNavPoint {
  date: string;             // 净值日期 YYYY-MM-DD
  timestamp: number;        // 净值日期对应的毫秒时间戳（UTC 当日 00:00）
  nav: number;              // 单位净值
  accNav: number | null;    // 累计净值（按 timestamp 对齐，对齐失败为 null）
  dailyReturn: number | null;  // 日增长率（%）
  unitMoney: string;        // 每万份收益（货币基金有意义；其余多为空串）
}
```

### 示例

```typescript
const h = await sdk.getFundNavHistory('110011');

console.log(h.name, '共', h.items.length, '条净值');
const latest = h.items[h.items.length - 1];
console.log(`最新: ${latest.date}  单位 ${latest.nav}  累计 ${latest.accNav}`);

// 拿最近 5 个交易日
console.log(h.items.slice(-5));
```

### 注意

响应体较大（约 600KB / gzip 后约 120KB），同一基金多次调用建议在应用层做缓存。

---

## getFundEstimate

获取基金当日实时估值（来自天天基金 fundgz 接口）。

同时返回最新已结算的单位净值（`nav` + `navDate`）和盘中实时估算（`estimatedNav` + `estimatedChangePercent` + `estimateTime`），适合做"当日实时表现 vs 上一收盘"对比图。

QDII / 非交易日 / 部分小众基金的盘中估算字段可能为空，会返回 `null`。

### 签名

```typescript
getFundEstimate(code: string): Promise<FundEstimate>
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | `string` | ✅ | 基金代码（纯数字，如 `'005827'`） |

### 返回类型

```typescript
interface FundEstimate {
  code: string;
  name: string | null;
  navDate: string | null;               // 已结算净值日期 YYYY-MM-DD
  nav: number | null;                   // 已结算单位净值
  estimatedNav: number | null;          // 盘中实时估值
  estimatedChangePercent: number | null;// 估算涨跌幅 %
  estimateTime: string | null;          // 估算时间，如 "2026-05-26 15:00"
}
```

### 示例

```typescript
const e = await sdk.getFundEstimate('005827');
console.log(`${e.name}  最新净值 ${e.nav}（${e.navDate}）`);
console.log(`盘中估算 ${e.estimatedNav}  (${e.estimatedChangePercent}%)`);
console.log(`估算时间 ${e.estimateTime}`);
```

---

## getFundRankHistory

获取基金同类排名走势（每日近三月排名 + 百分位）。

数据源与 `getFundNavHistory` 相同（同一个 pingzhongdata 文件，不同字段），适合做"该基金在同类基金里的相对表现"折线图。

### 签名

```typescript
getFundRankHistory(code: string): Promise<FundRankHistory>
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | `string` | ✅ | 基金代码 |

### 返回类型

```typescript
interface FundRankHistory {
  code: string;
  name: string | null;
  items: FundRankPoint[];
}

interface FundRankPoint {
  date: string;              // 报告日期 YYYY-MM-DD
  timestamp: number;
  rank: number | null;       // 同类近三月排名（越小越前）
  total: number | null;      // 同类基金总数
  percentile: number | null; // 同类百分位 %（越小越好）
}
```

### 示例

```typescript
const r = await sdk.getFundRankHistory('110011');
const latest = r.items[r.items.length - 1];
console.log(`${r.name}  最新排名 ${latest.rank}/${latest.total}（前 ${latest.percentile}%）`);
```

---

## 浏览器端并发与请求治理

### 并发安全

新基金接口在浏览器端通过 `<script>` 注入加载（数据源 `fund.eastmoney.com` / `fundgz.1234567.com.cn` 均无 CORS 头），易触发全局变量并发覆盖。SDK 内部用 `withScriptMutex` 兜底：

- 浏览器端所有 `fetchJsVars` 调用共享一个全局互斥锁（key `'jsVars'`），任意两个浏览器调用都按提交顺序**串行**执行
- fundgz JSONP 独立串行（key `'fundgz:jsonpgz'`）
- Node 端不受此限制，并发不受影响

调用方对此**透明**，但 `Promise.all([...])` 在浏览器端实际上是串行的，预期会比 Node 端慢。

### 请求治理

`FundService` 4 个方法在 **Node 端**已接入 `RequestClient`：

```typescript
const sdk = new StockSDK({
  retry: { maxRetries: 3, baseDelay: 500 },
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: { requestsPerSecond: 3, maxBurst: 3 },
    },
  },
});

// 上述配置对 getFundDividendList / getFundNavHistory /
// getFundEstimate / getFundRankHistory 在 Node 端全部生效
```

⚠️ **浏览器端限制**：`<script>` 注入路径不走 `fetch`，因此 `headers` / `circuitBreaker` / `rateLimit` 等仅在 Node 端生效。`timeout` 通过工具内部参数生效。

---

## 注意事项

1. **数据源**：分红走 `https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx`；历史净值 / 同类排名走 `https://fund.eastmoney.com/pingzhongdata/{code}.js`；实时估值走 `https://fundgz.1234567.com.cn/js/{code}.js?rt={ts}`
2. **历史净值数据量**：`getFundNavHistory` 一次返回数千条，应用层应做适当缓存
3. **同基金同接口**：`getFundNavHistory` 和 `getFundRankHistory` 实际下载同一份 pingzhongdata 文件（约 600KB），SDK 目前不做请求级缓存——如同时需要两类数据，建议自行做缓存或合并调用
4. **场内 ETF 行情**：场内 ETF（如 510050、159919）的实时行情和 K 线请走 [`getFullQuotes`](./quotes.md) / [`getHistoryKline`](./kline.md) 等股票接口，不走本页方法
