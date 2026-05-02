# 资金流向（深度）

提供个股 / 大盘 / 排名 / 板块 4 个维度的资金流向数据，覆盖东方财富数据中心 push2his 与 push2 接口。

::: tip
本节方法与既有 `getFundFlow` 互补：`getFundFlow` 按代码批量返回单日资金流；本节方法返回历史序列、排名榜和板块汇总。
:::

## getIndividualFundFlow

获取个股的资金流历史（日 / 周 / 月线）。

### 签名

```typescript
getIndividualFundFlow(
  symbol: string,
  options?: { period?: 'daily' | 'weekly' | 'monthly' }
): Promise<StockFundFlowDaily[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 股票代码（带或不带 `sh/sz/bj` 前缀均可） |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | 周期，默认 `'daily'` |

### 返回类型

```typescript
interface StockFundFlowDaily {
  date: string;                          // YYYY-MM-DD
  close: number | null;                  // 收盘价
  changePercent: number | null;          // 涨跌幅 %
  mainNetInflow: number | null;          // 主力净流入(元)
  mainNetInflowPercent: number | null;   // 主力净流入占比 %
  superLargeNetInflow: number | null;
  superLargeNetInflowPercent: number | null;
  largeNetInflow: number | null;
  largeNetInflowPercent: number | null;
  mediumNetInflow: number | null;
  mediumNetInflowPercent: number | null;
  smallNetInflow: number | null;
  smallNetInflowPercent: number | null;
}
```

### 示例

```typescript
const flow = await sdk.getIndividualFundFlow('sh600519', { period: 'daily' });
console.log(`数据条数: ${flow.length}`);
console.log(`最新一天主力净流入: ${flow.at(-1)?.mainNetInflow} 元`);
```

---

## getMarketFundFlow

获取大盘资金流历史（同时包含上证指数与深证成指）。

### 签名

```typescript
getMarketFundFlow(): Promise<MarketFundFlow[]>
```

### 返回类型

```typescript
interface MarketFundFlow {
  date: string;
  shClose: number | null;          // 上证收盘
  shChangePercent: number | null;  // 上证涨跌幅 %
  szClose: number | null;          // 深证收盘
  szChangePercent: number | null;  // 深证涨跌幅 %
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  // ... 超大单 / 大单 / 中单 / 小单 同结构
}
```

### 示例

```typescript
const market = await sdk.getMarketFundFlow();
const today = market.at(-1);
console.log(`今日上证 ${today?.shClose} (${today?.shChangePercent}%)`);
console.log(`主力净流入 ${today?.mainNetInflow} 元`);
```

---

## getFundFlowRank

按主力净流入排序的个股资金流排名。

### 签名

```typescript
getFundFlowRank(options?: {
  indicator?: 'today' | '3day' | '5day' | '10day';
}): Promise<FundFlowRankItem[]>
```

### 示例

```typescript
const rank = await sdk.getFundFlowRank({ indicator: '5day' });
rank.slice(0, 10).forEach((item, idx) => {
  console.log(
    `#${idx + 1} ${item.name}(${item.code}) 主力净流入: ${item.mainNetInflow} 元`
  );
});
```

---

## getSectorFundFlowRank

板块资金流排名，支持行业 / 概念 / 地域三种维度。

### 签名

```typescript
getSectorFundFlowRank(options?: {
  indicator?: 'today' | '3day' | '5day' | '10day';
  sectorType?: 'industry' | 'concept' | 'region';
}): Promise<SectorFundFlowItem[]>
```

### 返回类型

```typescript
interface SectorFundFlowItem {
  code: string;                         // 板块代码（如 BK0438）
  name: string;                         // 板块名称
  changePercent: number | null;
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  superLargeNetInflow: number | null;
  largeNetInflow: number | null;
  mediumNetInflow: number | null;
  smallNetInflow: number | null;
  topStockCode?: string;                // 主力净流入最大股代码
  topStockName?: string;                // 主力净流入最大股名称
}
```

### 示例

```typescript
const sectors = await sdk.getSectorFundFlowRank({
  indicator: 'today',
  sectorType: 'industry',
});
sectors.slice(0, 5).forEach(s => {
  console.log(
    `${s.name}: 净流入 ${s.mainNetInflow} 元，领涨 ${s.topStockName}`
  );
});
```

---

## getSectorFundFlowHistory

获取单个板块的历史资金流。`symbol` 接受 BK 编号（如 `BK0438`）或全前缀格式（如 `90.BK0438`）。

### 签名

```typescript
getSectorFundFlowHistory(
  symbol: string,
  options?: { period?: 'daily' | 'weekly' | 'monthly' }
): Promise<StockFundFlowDaily[]>
```

### 示例

```typescript
const banking = await sdk.getSectorFundFlowHistory('BK0475');
console.log(`银行板块历史数据 ${banking.length} 条`);
```
