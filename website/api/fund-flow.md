# 扩展数据

## getTradingCalendar

获取 A 股交易日历，返回从 1990 年至未来的所有交易日列表。

### 签名

```typescript
getTradingCalendar(): Promise<string[]>
```

### 返回类型

```typescript
string[]  // 交易日期数组，格式如 ['1990-12-19', '1990-12-20', ...]
```

### 示例

```typescript
const calendar = await sdk.getTradingCalendar();

console.log(`共有 ${calendar.length} 个交易日`);
console.log(`第一个交易日: ${calendar[0]}`);  // 1990-12-19
console.log(`最后一个交易日: ${calendar[calendar.length - 1]}`);

// 判断某天是否为交易日
function isTradingDay(date: string): boolean {
  return calendar.includes(date);
}

console.log(isTradingDay('2024-01-02'));  // true
console.log(isTradingDay('2024-01-01'));  // false (元旦)
```

### 应用场景

```typescript
// 获取最近 N 个交易日
function getRecentTradingDays(n: number): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const idx = calendar.findIndex(d => d >= today);
  return calendar.slice(Math.max(0, idx - n), idx);
}

// 计算两个日期之间的交易日数量
function countTradingDays(start: string, end: string): number {
  return calendar.filter(d => d >= start && d <= end).length;
}

// 获取下一个交易日
function getNextTradingDay(date: string): string | undefined {
  return calendar.find(d => d > date);
}
```

---

## getFundFlow

获取股票的资金流向数据。

### 签名

```typescript
getFundFlow(codes: string[]): Promise<FundFlow[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 股票代码数组，如 `['sz000858']` |

### 返回类型

```typescript
interface FundFlow {
  code: string;           // 股票代码
  name: string;           // 股票名称
  mainInflow: number;     // 主力流入（万）
  mainOutflow: number;    // 主力流出（万）
  mainNet: number;        // 主力净流入（万）
  mainNetRatio: number;   // 主力净流入占比 %
  retailInflow: number;   // 散户流入（万）
  retailOutflow: number;  // 散户流出（万）
  retailNet: number;      // 散户净流入（万）
  retailNetRatio: number; // 散户净流入占比 %
  totalFlow: number;      // 总资金流（万）
  date: string;           // 日期
  raw: string[];          // 原始字段数组
}
```

::: tip 单位说明
资金流向数值的单位以数据源返回为准，通常为“万”。如需更精细的单位，请结合 `raw` 字段自行换算。
:::

### 示例

```typescript
const flows = await sdk.getFundFlow(['sz000858', 'sh600519']);

flows.forEach(f => {
  console.log(`${f.name} (${f.code})`);
  console.log(`  主力流入: ${f.mainInflow} 万`);
  console.log(`  主力流出: ${f.mainOutflow} 万`);
  console.log(`  主力净流入: ${f.mainNet} 万 (${f.mainNetRatio}%)`);
  console.log(`  散户净流入: ${f.retailNet} 万 (${f.retailNetRatio}%)`);
});
```

---

## getPanelLargeOrder

获取盘口大单占比数据。

### 签名

```typescript
getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 股票代码数组，如 `['sz000858']` |

### 返回类型

```typescript
interface PanelLargeOrder {
  buyLargeRatio: number;   // 买盘大单占比 %
  buySmallRatio: number;   // 买盘小单占比 %
  sellLargeRatio: number;  // 卖盘大单占比 %
  sellSmallRatio: number;  // 卖盘小单占比 %
  raw: string[];           // 原始字段数组
}
```

### 示例

```typescript
const orders = await sdk.getPanelLargeOrder(['sz000858']);

const order = orders[0];
console.log(`买盘大单占比: ${order.buyLargeRatio}%`);
console.log(`买盘小单占比: ${order.buySmallRatio}%`);
console.log(`卖盘大单占比: ${order.sellLargeRatio}%`);
console.log(`卖盘小单占比: ${order.sellSmallRatio}%`);
```

---

## 数据解读

### 资金流向分析

| 指标 | 含义 | 应用 |
|------|------|------|
| 主力净流入 > 0 | 大资金买入 | 看多信号 |
| 主力净流入 < 0 | 大资金卖出 | 看空信号 |
| 主力净流入占比 | 相对总成交额的比例 | 资金意愿强度 |
| 散户净流入 | 散户资金动向 | 反向参考 |

### 大单占比分析

```typescript
// 分析买卖力量对比
function analyzeLargeOrders(order: PanelLargeOrder) {
  const buyPower = order.buyLargeRatio;
  const sellPower = order.sellLargeRatio;
  
  if (buyPower > sellPower * 1.5) {
    return 'strong_buy';  // 买盘占优
  } else if (sellPower > buyPower * 1.5) {
    return 'strong_sell'; // 卖盘占优
  } else {
    return 'balanced';    // 买卖均衡
  }
}
```

---

## 使用注意

1. **时效性**：资金流向数据为实时数据，建议在交易时间内获取
2. **数据质量**：资金流向基于成交数据计算，不同平台算法可能略有差异
3. **综合判断**：资金流向仅供参考，需结合其他指标综合分析

```typescript
// 综合分析示例
async function analyzeStock(code: string) {
  const [quotes, flows, orders] = await Promise.all([
    sdk.getFullQuotes([code]),
    sdk.getFundFlow([code]),
    sdk.getPanelLargeOrder([code])
  ]);
  
  const quote = quotes[0];
  const flow = flows[0];
  const order = orders[0];
  
  return {
    code,
    name: quote.name,
    price: quote.price,
    changePercent: quote.changePercent,
    mainNet: flow.mainNet,
    mainNetRatio: flow.mainNetRatio,
    buyLargeRatio: order.buyLargeRatio,
    sellLargeRatio: order.sellLargeRatio,
  };
}
```
