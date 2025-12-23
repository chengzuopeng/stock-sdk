# 基金行情

## getFundQuotes

获取公募基金行情。

### 签名

```typescript
getFundQuotes(codes: string[]): Promise<FundQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 基金代码数组，如 `['000001', '110011']` |

### 返回类型

```typescript
interface FundQuote {
  code: string;      // 基金代码
  name: string;      // 基金名称
  nav: number;       // 最新单位净值
  accNav: number;    // 累计净值
  change: number;    // 当日涨跌额
  navDate: string;   // 净值日期
}
```

### 示例

```typescript
const funds = await sdk.getFundQuotes(['000001', '110011']);

funds.forEach(f => {
  console.log(`${f.name} (${f.code})`);
  console.log(`  单位净值: ${f.nav}`);
  console.log(`  累计净值: ${f.accNav}`);
  console.log(`  涨跌额: ${f.change}`);
  console.log(`  净值日期: ${f.navDate}`);
});
// 华夏成长混合 (000001)
//   单位净值: 1.234
//   累计净值: 3.456
//   涨跌额: 0.012
//   净值日期: 2024-12-20
```

---

## 基金代码格式

基金代码为 6 位数字：

| 基金 | 代码 |
|------|------|
| 华夏成长混合 | `000001` |
| 易方达中小盘混合 | `110011` |
| 南方消费进取 | `150050` |
| 富国天惠精选成长混合 | `161005` |
| 华安创新混合 | `040001` |

---

## 注意事项

### 净值更新时间

公募基金的净值通常在交易日晚间（18:00-22:00）更新，当天交易时间内查询到的是前一个交易日的净值。

### 基金类型

该接口支持大部分公募基金类型：

- 股票型基金
- 混合型基金
- 债券型基金
- 货币市场基金
- 指数型基金
- QDII 基金
- LOF/ETF（场内交易部分需用股票接口）

### ETF 行情

对于场内交易的 ETF，建议使用 `getFullQuotes` 或 `getSimpleQuotes`：

```typescript
// 场内 ETF 使用股票接口
const etfQuotes = await sdk.getSimpleQuotes([
  'sh510050',  // 上证50ETF
  'sh510300',  // 沪深300ETF
  'sz159919',  // 沪深300ETF
]);
```

