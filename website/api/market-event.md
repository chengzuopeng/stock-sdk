# 涨停板 / 盘口异动

提供 6 大涨停股池、22 种盘口异动和板块异动详情数据，覆盖东方财富 push2ex 接口。

## getZTPool

获取涨停板专题股池数据。共 6 个池子：

| `type` | 说明 |
|--------|------|
| `'zt'`        | 涨停股池（默认） |
| `'yesterday'` | 昨日涨停股池 |
| `'strong'`    | 强势股池（60 日新高 / 多次涨停） |
| `'sub_new'`   | 次新股池（上市 1 年内中断一字板） |
| `'broken'`    | 炸板股池（当日触及涨停未封板） |
| `'dt'`        | 跌停股池 |

### 签名

```typescript
getZTPool(type?: ZTPoolType, date?: string): Promise<ZTPoolItem[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | `ZTPoolType` | 池子类型，默认 `'zt'` |
| `date` | `string` | `YYYYMMDD` 或 `YYYY-MM-DD`，默认今天 |

### 返回类型

```typescript
interface ZTPoolItem {
  code: string;
  name: string;
  price: number | null;                  // 最新价(元)，已自动 / 1000 缩放
  changePercent: number | null;
  limitPrice: number | null;             // 涨停价（部分池返回）
  amount: number | null;
  floatMarketValue: number | null;
  totalMarketValue: number | null;
  turnoverRate: number | null;
  continuousBoardCount: number | null;   // 连板数（仅 zt 池）
  firstBoardTime: string | null;         // HH:MM:SS
  lastBoardTime: string | null;
  boardAmount: number | null;            // 封板资金（涨停池）
  sealAmount: number | null;             // 封单资金（跌停池）
  failedCount: number | null;            // 炸板次数
  industry: string;
  ztStatistics: string;                  // '3/5' 表示 5 天内涨停 3 次
  amplitude: number | null;
  speed: number | null;
}
```

### 示例

```typescript
// 获取今日涨停股池
const ztPool = await sdk.getZTPool('zt');
console.log(`今日涨停 ${ztPool.length} 只`);

// 找出 3 连板及以上的强势股
const strongStocks = ztPool.filter(s => (s.continuousBoardCount ?? 0) >= 3);
strongStocks.forEach(s => {
  console.log(
    `${s.name}(${s.code}) ${s.continuousBoardCount}连板 - ${s.industry}`
  );
});

// 获取指定日期跌停池
const dtPool = await sdk.getZTPool('dt', '20240115');
```

---

## getStockChanges

获取个股盘口异动（共 22 种异动类型）。

### 签名

```typescript
getStockChanges(type?: StockChangeType): Promise<StockChangeItem[]>
```

### 异动类型枚举

| 类型 | 中文标签 | 类型 | 中文标签 |
|------|---------|------|---------|
| `rocket_launch` | 火箭发射 | `large_sell` | 大笔卖出 |
| `quick_rebound` | 快速反弹 | `accelerate_down` | 加速下跌 |
| `large_buy` | 大笔买入（默认） | `high_dive` | 高台跳水 |
| `limit_up_seal` | 封涨停板 | `limit_down_seal` | 封跌停板 |
| `limit_down_open` | 打开跌停板 | `limit_up_open` | 打开涨停板 |
| `big_buy_order` | 有大买盘 | `big_sell_order` | 有大卖盘 |
| `auction_up` | 竞价上涨 | `auction_down` | 竞价下跌 |
| `high_open_5d` | 高开 5 日线 | `low_open_5d` | 低开 5 日线 |
| `gap_up` | 向上缺口 | `gap_down` | 向下缺口 |
| `high_60d` | 60 日新高 | `low_60d` | 60 日新低 |
| `surge_60d` | 60 日大幅上涨 | `drop_60d` | 60 日大幅下跌 |

### 返回类型

```typescript
interface StockChangeItem {
  time: string;                  // HH:MM:SS
  code: string;
  name: string;
  changeType: StockChangeType;
  changeTypeLabel: string;       // 中文标签
  info: string;                  // 服务端附加信息
}
```

### 示例

```typescript
// 实时监控大笔买入
const largeBuys = await sdk.getStockChanges('large_buy');
largeBuys.slice(0, 10).forEach(c => {
  console.log(`${c.time} ${c.name}(${c.code}) ${c.info}`);
});

// 监控封涨停异动
const sealUp = await sdk.getStockChanges('limit_up_seal');
console.log(`当前封涨停: ${sealUp.length} 只`);
```

---

## getBoardChanges

获取当日板块异动详情。

### 签名

```typescript
getBoardChanges(): Promise<BoardChangeItem[]>
```

### 返回类型

```typescript
interface BoardChangeItem {
  name: string;                              // 板块名称
  changePercent: number | null;
  mainNetInflow: number | null;
  totalChangeCount: number | null;           // 异动总次数
  topStockCode: string;                      // 异动最频繁个股
  topStockName: string;
  topStockDirection: string;                 // '大笔买入' / '大笔卖出'
  changeTypeDistribution: Record<string, number>;
}
```

### 示例

```typescript
const boards = await sdk.getBoardChanges();
const topActive = boards
  .sort((a, b) => (b.totalChangeCount ?? 0) - (a.totalChangeCount ?? 0))
  .slice(0, 5);
topActive.forEach(b => {
  console.log(
    `${b.name}: 异动 ${b.totalChangeCount} 次，最活跃 ${b.topStockName}(${b.topStockDirection})`
  );
});
```
