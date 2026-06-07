# reference · 参考数据

`sdk.reference` 命名空间收纳「参考型 / 基础型」数据：A 股分红派送详情、A 股交易日历原始数组。

| 方法 | 说明 |
|---|---|
| `sdk.reference.dividendDetail(symbol)` | A 股个股分红派送历史明细 |
| `sdk.reference.tradingCalendar()` | A 股交易日历（原始日期数组） |

> `dividendDetail` 关注「单只股票的完整分红送转记录」；如需「全市场基金分红」请用 [`sdk.fund.dividendList()`](./fund.md)。

## sdk.reference.dividendDetail

获取指定 A 股个股的分红派送历史记录，含送股转增、现金分红、财务指标、关键日期等完整信息。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | `string \| SymbolRef` | 是 | 股票符号，`string` 一等公民，如 `'600519'` / `'sh600519'` / `'600519.SH'`；也可传 `SymbolRef` |

> 符号经 `normalizeSymbol` 容错解析，写法不限前缀风格。详见 [符号与代码规则](../guide/symbols.md)。

### 调用示例

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 获取贵州茅台的分红历史
const dividends = await sdk.reference.dividendDetail('600519');
console.log('分红记录数:', dividends.length);

const latest = dividends[0];
console.log('股票名称:', latest.name);
console.log('报告期:', latest.reportDate);
console.log('每10股派息(税前):', latest.dividendPretax, '元');
console.log('分红描述:', latest.dividendDesc);
console.log('除权除息日:', latest.exDividendDate);
console.log('方案进度:', latest.assignProgress);
```

### 返回说明

返回 `Promise<DividendDetail[]>`，按报告日期降序排列（最新在前）：

```ts
interface DividendDetail {
  code: string;
  name: string;
  reportDate: string | null;       // 报告期 YYYY-MM-DD
  planNoticeDate: string | null;   // 预案公告日
  disclosureDate: string | null;   // 业绩披露日期

  // 送转股份信息
  assignTransferRatio: number | null; // 送转总比例（每10股送转 X 股）
  bonusRatio: number | null;          // 送股比例（每10股送 X 股）
  transferRatio: number | null;       // 转股比例（每10股转 X 股）

  // 现金分红信息
  dividendPretax: number | null;   // 每10股派息(税前)，单位：元
  dividendDesc: string | null;     // 分红描述，如「10派2.36元(含税...)」
  dividendYield: number | null;    // 股息率

  // 财务指标
  eps: number | null;              // 每股收益（元）
  bps: number | null;              // 每股净资产（元）
  capitalReserve: number | null;   // 每股公积金（元）
  unassignedProfit: number | null; // 每股未分配利润（元）
  netProfitYoy: number | null;     // 净利润同比增长（百分数）
  totalShares: number | null;      // 总股本（股）

  // 关键日期
  equityRecordDate: string | null; // 股权登记日 YYYY-MM-DD
  exDividendDate: string | null;   // 除权除息日 YYYY-MM-DD
  payDate: string | null;          // 现金分红发放日 YYYY-MM-DD

  // 进度信息
  assignProgress: string | null;   // 方案进度（如「实施分配」）
  noticeDate: string | null;       // 最新公告日期 YYYY-MM-DD
}
```

> 部分字段可能为 `null`，表示数据缺失或不适用；新上市 / 未分红公司可能返回空数组。具体字段以实现为准。

## sdk.reference.tradingCalendar

获取 A 股交易日历的原始日期数组（升序）。

这是底层日历数据；多数场景更推荐用 [`sdk.calendar.*`](./calendar.md) 的高层便利方法（判断交易日 / 跳转交易日 / 市场状态）。

### 参数

无。

### 调用示例

```ts
const days = await sdk.reference.tradingCalendar();

console.log('交易日总数:', days.length);
console.log('最早:', days[0], '最晚:', days[days.length - 1]);

// 自行判断某日是否交易日
const isOpen = days.includes('2026-06-01');
```

### 返回说明

返回 `Promise<string[]>`，元素为 `'YYYY-MM-DD'` 字符串，按日期升序。底层带缓存（约 12 小时），首次调用拉取全量列表。

## 注意事项

1. **缓存**：`tradingCalendar` 底层带约 12 小时缓存，`sdk.calendar.*` 的交易日相关方法复用同一份数据。
2. **市场范围**：交易日历与 `dividendDetail` 均针对 A 股；港股 / 美股不在覆盖范围内。
3. **高层便利方法优先**：判断「是否交易日 / 下一交易日 / 市场状态」请优先用 [`sdk.calendar`](./calendar.md)，无需自行处理原始数组。
