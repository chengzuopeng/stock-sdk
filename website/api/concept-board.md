# 概念板块

获取东方财富概念板块相关数据，包括板块列表、实时行情、成分股和 K 线数据。

## getConceptBoardList

获取所有概念板块的名称、代码及实时行情概览。

### 签名

```typescript
getConceptBoardList(): Promise<ConceptBoard[]>
```

### 返回类型

```typescript
interface ConceptBoard {
  rank: number;                        // 排名（按涨跌幅）
  name: string;                        // 板块名称
  code: string;                        // 板块代码（如 BK0800）
  price: number | null;                // 最新价
  change: number | null;               // 涨跌额
  changePercent: number | null;        // 涨跌幅 %
  totalMarketCap: number | null;       // 总市值
  turnoverRate: number | null;         // 换手率 %
  riseCount: number | null;            // 上涨家数
  fallCount: number | null;            // 下跌家数
  leadingStock: string | null;         // 领涨股票名称
  leadingStockChangePercent: number | null;  // 领涨股票涨跌幅 %
}
```

### 示例

```typescript
// 获取所有概念板块
const boards = await sdk.getConceptBoardList();

// 打印涨幅前 5 的板块
boards.slice(0, 5).forEach(b => {
  console.log(`${b.name}: ${b.changePercent}% (领涨: ${b.leadingStock})`);
});
```

---

## getConceptBoardSpot

获取指定概念板块的实时行情数据。

### 签名

```typescript
getConceptBoardSpot(symbol: string): Promise<ConceptBoardSpot[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 概念板块名称（如 `'人工智能'`）或代码（如 `'BK0800'`） |

### 返回类型

```typescript
interface ConceptBoardSpot {
  item: string;         // 指标名称
  value: number | null; // 指标值
}
```

返回的指标包括：最新、最高、最低、开盘、成交量、成交额、涨跌幅、振幅、换手率、涨跌额。

### 示例

```typescript
// 使用板块名称查询
const spot = await sdk.getConceptBoardSpot('人工智能');

// 使用板块代码查询
const spot2 = await sdk.getConceptBoardSpot('BK0800');

spot.forEach(s => {
  console.log(`${s.item}: ${s.value}`);
});
```

---

## getConceptBoardConstituents

获取指定概念板块的成分股列表及其实时行情。

### 签名

```typescript
getConceptBoardConstituents(symbol: string): Promise<ConceptBoardConstituent[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 概念板块名称或代码 |

### 返回类型

```typescript
interface ConceptBoardConstituent {
  rank: number;              // 序号
  code: string;              // 股票代码
  name: string;              // 股票名称
  price: number | null;      // 最新价
  changePercent: number | null;  // 涨跌幅 %
  change: number | null;     // 涨跌额
  volume: number | null;     // 成交量
  amount: number | null;     // 成交额
  amplitude: number | null;  // 振幅 %
  high: number | null;       // 最高价
  low: number | null;        // 最低价
  open: number | null;       // 今开
  prevClose: number | null;  // 昨收
  turnoverRate: number | null;   // 换手率 %
  pe: number | null;         // 市盈率-动态
  pb: number | null;         // 市净率
}
```

### 示例

```typescript
// 获取人工智能板块的成分股
const stocks = await sdk.getConceptBoardConstituents('人工智能');

// 打印涨幅前 10 的股票
stocks.slice(0, 10).forEach(s => {
  console.log(`${s.name}(${s.code}): ${s.price} (${s.changePercent}%)`);
});
```

---

## getConceptBoardKline

获取概念板块的历史 K 线数据（日/周/月）。

### 签名

```typescript
getConceptBoardKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<ConceptBoardKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 概念板块名称或代码 |
| `period` | `string` | `'daily'` | K 线周期：`'daily'` / `'weekly'` / `'monthly'` |
| `adjust` | `string` | `''` | 复权类型：`''`（不复权）/ `'qfq'`（前复权）/ `'hfq'`（后复权） |
| `startDate` | `string` | - | 开始日期 `YYYYMMDD` |
| `endDate` | `string` | - | 结束日期 `YYYYMMDD` |

### 返回类型

```typescript
interface ConceptBoardKline {
  date: string;               // 日期
  open: number | null;        // 开盘价
  close: number | null;       // 收盘价
  high: number | null;        // 最高价
  low: number | null;         // 最低价
  changePercent: number | null;   // 涨跌幅 %
  change: number | null;          // 涨跌额
  volume: number | null;          // 成交量
  amount: number | null;          // 成交额
  amplitude: number | null;       // 振幅 %
  turnoverRate: number | null;    // 换手率 %
}
```

### 示例

```typescript
// 获取日 K 线
const dailyKlines = await sdk.getConceptBoardKline('人工智能', {
  startDate: '20240101',
  endDate: '20241231',
});

// 获取周 K 线
const weeklyKlines = await sdk.getConceptBoardKline('BK0800', {
  period: 'weekly',
  startDate: '20240101',
  endDate: '20241231',
});

dailyKlines.forEach(k => {
  console.log(`${k.date}: 开 ${k.open} 高 ${k.high} 低 ${k.low} 收 ${k.close}`);
});
```

---

## getConceptBoardMinuteKline

获取概念板块的分时行情数据（1/5/15/30/60 分钟）。

### 签名

```typescript
getConceptBoardMinuteKline(
  symbol: string,
  options?: {
    period?: '1' | '5' | '15' | '30' | '60';
  }
): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 概念板块名称或代码 |
| `period` | `string` | `'5'` | 分钟周期：`'1'` / `'5'` / `'15'` / `'30'` / `'60'` |

### 返回类型

**1 分钟周期返回：**

```typescript
interface ConceptBoardMinuteTimeline {
  time: string;              // 日期时间
  open: number | null;       // 开盘价
  close: number | null;      // 收盘价
  high: number | null;       // 最高价
  low: number | null;        // 最低价
  volume: number | null;     // 成交量
  amount: number | null;     // 成交额
  price: number | null;      // 最新价
}
```

**5/15/30/60 分钟周期返回：**

```typescript
interface ConceptBoardMinuteKline {
  time: string;                   // 日期时间
  open: number | null;            // 开盘价
  close: number | null;           // 收盘价
  high: number | null;            // 最高价
  low: number | null;             // 最低价
  changePercent: number | null;   // 涨跌幅 %
  change: number | null;          // 涨跌额
  volume: number | null;          // 成交量
  amount: number | null;          // 成交额
  amplitude: number | null;       // 振幅 %
  turnoverRate: number | null;    // 换手率 %
}
```

### 示例

```typescript
// 获取 1 分钟分时数据
const timeline = await sdk.getConceptBoardMinuteKline('人工智能', {
  period: '1',
});

// 获取 5 分钟 K 线
const minuteKlines = await sdk.getConceptBoardMinuteKline('BK0800', {
  period: '5',
});

// 获取 60 分钟 K 线
const hourlyKlines = await sdk.getConceptBoardMinuteKline('人工智能', {
  period: '60',
});

minuteKlines.forEach(k => {
  console.log(`${k.time}: ${k.close} (${k.changePercent}%)`);
});
```

---

## 使用技巧

### 板块名称与代码互查

```typescript
// 先获取板块列表，建立名称到代码的映射
const boards = await sdk.getConceptBoardList();
const boardMap = new Map(boards.map(b => [b.name, b.code]));

// 查找特定板块的代码
const code = boardMap.get('人工智能');  // BK0800
```

### 热门概念板块追踪

```typescript
// 获取涨幅前 10 的概念板块
const boards = await sdk.getConceptBoardList();
const hotBoards = boards.slice(0, 10);

// 获取每个热门板块的龙头股
for (const board of hotBoards) {
  const stocks = await sdk.getConceptBoardConstituents(board.code);
  console.log(`${board.name} 龙头: ${stocks[0]?.name}`);
}
```

