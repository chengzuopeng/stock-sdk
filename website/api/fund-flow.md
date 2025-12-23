# 资金流向

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
}
```

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

