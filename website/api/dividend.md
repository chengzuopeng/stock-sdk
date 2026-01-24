# 分红派送

获取 A 股股票的分红派送详情数据，包括历史分红记录、送股转增、财务指标、关键日期等完整信息。

## 获取分红派送详情

`getDividendDetail(symbol)` 方法用于获取指定股票的分红派送历史记录。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `symbol` | `string` | ✅ | 股票代码（纯数字或带交易所前缀），如 `'600519'` 或 `'sh600519'` |

### 返回值

返回 `Promise<DividendDetail[]>`，分红派送详情列表，按报告日期降序排列。

### 数据结构

```typescript
interface DividendDetail {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 报告期 YYYY-MM-DD */
  reportDate: string | null;
  /** 预案公告日 YYYY-MM-DD */
  planNoticeDate: string | null;
  /** 业绩披露日期 YYYY-MM-DD */
  disclosureDate: string | null;

  // === 送转股份信息 ===
  /** 送转总比例（每10股送转X股） */
  assignTransferRatio: number | null;
  /** 送股比例（每10股送X股） */
  bonusRatio: number | null;
  /** 转股比例（每10股转X股） */
  transferRatio: number | null;

  // === 现金分红信息 ===
  /** 每10股派息(税前)，单位：元 */
  dividendPretax: number | null;
  /** 分红描述（如：10派2.36元(含税,扣税后2.124元)） */
  dividendDesc: string | null;
  /** 股息率 */
  dividendYield: number | null;

  // === 财务指标 ===
  /** 每股收益(元) */
  eps: number | null;
  /** 每股净资产(元) */
  bps: number | null;
  /** 每股公积金(元) */
  capitalReserve: number | null;
  /** 每股未分配利润(元) */
  unassignedProfit: number | null;
  /** 净利润同比增长(%) */
  netProfitYoy: number | null;
  /** 总股本(股) */
  totalShares: number | null;

  // === 关键日期 ===
  /** 股权登记日 YYYY-MM-DD */
  equityRecordDate: string | null;
  /** 除权除息日 YYYY-MM-DD */
  exDividendDate: string | null;
  /** 现金分红发放日 YYYY-MM-DD */
  payDate: string | null;

  // === 进度信息 ===
  /** 方案进度（如：实施分配、股东大会预案等） */
  assignProgress: string | null;
  /** 最新公告日期 YYYY-MM-DD */
  noticeDate: string | null;
}
```

### 使用示例

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 获取贵州茅台的分红历史
const dividends = await sdk.getDividendDetail('600519');

console.log('分红记录数:', dividends.length);

// 查看最近一次分红详情
if (dividends.length > 0) {
  const latest = dividends[0];

  // 基本信息
  console.log('股票名称:', latest.name);
  console.log('报告期:', latest.reportDate);

  // 分红信息
  console.log('每10股派息(税前):', latest.dividendPretax, '元');
  console.log('分红描述:', latest.dividendDesc);    // 10派2.36元(含税,扣税后2.124元)
  console.log('股息率:', (latest.dividendYield! * 100).toFixed(2), '%');

  // 财务指标
  console.log('每股收益:', latest.eps, '元');
  console.log('每股净资产:', latest.bps, '元');
  console.log('总股本:', latest.totalShares, '股');
  console.log('净利润同比:', latest.netProfitYoy, '%');

  // 关键日期
  console.log('除权除息日:', latest.exDividendDate);
  console.log('方案进度:', latest.assignProgress); // 实施分配
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `planNoticeDate` | 预案公告日 |
| `disclosureDate` | 业绩披露日期 |
| `assignTransferRatio` | 送转总比例（送股+转增），如每10股送转5股则值为 `5` |
| `bonusRatio` | 送股比例，如每10股送2股则值为 `2` |
| `transferRatio` | 转增比例，如每10股转增3股则值为 `3` |
| `dividendPretax` | 税前派息金额（每10股），单位：元 |
| `dividendDesc` | 分红方案描述，包含税前税后金额 |
| `dividendYield` | 股息率，小数形式（如 0.02 表示 2%） |
| `eps` | 每股收益(元) |
| `bps` | 每股净资产(元) |
| `capitalReserve` | 每股公积金(元) |
| `unassignedProfit` | 每股未分配利润(元) |
| `netProfitYoy` | 净利润同比增长率(%) |
| `totalShares` | 总股本(股) |
| `equityRecordDate` | 股权登记日，持股截止日期 |
| `exDividendDate` | 除权除息日，股价调整日 |
| `payDate` | 现金分红发放日 |
| `assignProgress` | 分配进度，如"实施分配"、"股东大会预案"等 |
| `noticeDate` | 最新公告日期 |

### 注意事项

1. 数据来源于东方财富网数据中心
2. 返回结果按报告日期降序排列（最新在前）
3. 部分字段可能为 `null`，表示数据缺失或不适用
4. 新上市公司或未分红公司可能返回空数组
5. 股息率 `dividendYield` 是小数形式，需要乘以 100 转换为百分比
