# 行业板块

获取东方财富行业板块相关数据，包括板块列表、实时行情、成分股和 K 线数据。

## getIndustryBoardList

获取所有行业板块的名称、代码及实时行情概览。

### 签名

```typescript
getIndustryBoardList(): Promise<IndustryBoard[]>
```

### 返回类型

```typescript
interface IndustryBoard {
  rank: number;                        // 排名（按涨跌幅）
  name: string;                        // 板块名称
  code: string;                        // 板块代码（如 BK0447）
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
// 获取所有行业板块
const boards = await sdk.getIndustryBoardList();

// 打印涨幅前 5 的板块
boards.slice(0, 5).forEach(b => {
  console.log(`${b.name}: ${b.changePercent}% (领涨: ${b.leadingStock})`);
});
```

---

## getIndustryBoardSpot

获取指定行业板块的实时行情数据。

### 签名

```typescript
getIndustryBoardSpot(symbol: string): Promise<IndustryBoardSpot[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 行业板块名称（如 `'互联网服务'`）或代码（如 `'BK0447'`） |

### 返回类型

```typescript
interface IndustryBoardSpot {
  item: string;         // 指标名称
  value: number | null; // 指标值
}
```

返回的指标包括：最新、最高、最低、开盘、成交量、成交额、涨跌幅、振幅、换手率、涨跌额。

### 示例

```typescript
// 使用板块名称查询
const spot = await sdk.getIndustryBoardSpot('互联网服务');

// 使用板块代码查询
const spot2 = await sdk.getIndustryBoardSpot('BK0447');

spot.forEach(s => {
  console.log(`${s.item}: ${s.value}`);
});
```

---

## getIndustryBoardConstituents

获取指定行业板块的成分股列表及其实时行情。

### 签名

```typescript
getIndustryBoardConstituents(symbol: string): Promise<IndustryBoardConstituent[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 行业板块名称或代码 |

### 返回类型

```typescript
interface IndustryBoardConstituent {
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
// 获取互联网服务板块的成分股
const stocks = await sdk.getIndustryBoardConstituents('互联网服务');

// 打印涨幅前 10 的股票
stocks.slice(0, 10).forEach(s => {
  console.log(`${s.name}(${s.code}): ${s.price} (${s.changePercent}%)`);
});
```

---

## getIndustryBoardKline

获取行业板块的历史 K 线数据（日/周/月）。

### 签名

```typescript
getIndustryBoardKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<IndustryBoardKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 行业板块名称或代码 |
| `period` | `string` | `'daily'` | K 线周期：`'daily'` / `'weekly'` / `'monthly'` |
| `adjust` | `string` | `''` | 复权类型：`''`（不复权）/ `'qfq'`（前复权）/ `'hfq'`（后复权） |
| `startDate` | `string` | - | 开始日期 `YYYYMMDD` |
| `endDate` | `string` | - | 结束日期 `YYYYMMDD` |

### 返回类型

```typescript
interface IndustryBoardKline {
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
const dailyKlines = await sdk.getIndustryBoardKline('互联网服务', {
  startDate: '20240101',
  endDate: '20241231',
});

// 获取周 K 线
const weeklyKlines = await sdk.getIndustryBoardKline('BK0447', {
  period: 'weekly',
  startDate: '20240101',
  endDate: '20241231',
});

dailyKlines.forEach(k => {
  console.log(`${k.date}: 开 ${k.open} 高 ${k.high} 低 ${k.low} 收 ${k.close}`);
});
```

---

## getIndustryBoardMinuteKline

获取行业板块的分时行情数据（1/5/15/30/60 分钟）。

### 签名

```typescript
getIndustryBoardMinuteKline(
  symbol: string,
  options?: {
    period?: '1' | '5' | '15' | '30' | '60';
  }
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 行业板块名称或代码 |
| `period` | `string` | `'5'` | 分钟周期：`'1'` / `'5'` / `'15'` / `'30'` / `'60'` |

### 返回类型

**1 分钟周期返回：**

```typescript
interface IndustryBoardMinuteTimeline {
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
interface IndustryBoardMinuteKline {
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
const timeline = await sdk.getIndustryBoardMinuteKline('互联网服务', {
  period: '1',
});

// 获取 5 分钟 K 线
const minuteKlines = await sdk.getIndustryBoardMinuteKline('BK0447', {
  period: '5',
});

// 获取 60 分钟 K 线
const hourlyKlines = await sdk.getIndustryBoardMinuteKline('互联网服务', {
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
const boards = await sdk.getIndustryBoardList();
const boardMap = new Map(boards.map(b => [b.name, b.code]));

// 查找特定板块的代码
const code = boardMap.get('互联网服务');  // BK0447
```

### 获取板块龙头股

```typescript
// 获取成分股列表（已按涨跌幅排序）
const stocks = await sdk.getIndustryBoardConstituents('互联网服务');

// 龙头股就是涨幅第一的股票
const leader = stocks[0];
console.log(`龙头股: ${leader.name} 涨幅: ${leader.changePercent}%`);
```

