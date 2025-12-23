# 分钟 K 线

## getMinuteKline

获取 A 股分钟 K 线或分时数据，数据来源：东方财富。

::: warning 注意
`period='1'` 分时数据仅返回近 5 个交易日数据。
:::

### 签名

```typescript
getMinuteKline(
  symbol: string,
  options?: {
    period?: '1' | '5' | '15' | '30' | '60';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<MinuteTimeline[] | MinuteKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 股票代码，如 `'000001'` 或 `'sz000001'` |
| `period` | `string` | `'1'` | K 线周期：`'1'`（分时）/ `'5'` / `'15'` / `'30'` / `'60'` |
| `adjust` | `string` | `'hfq'` | 复权类型（仅 5/15/30/60 有效） |
| `startDate` | `string` | - | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| `endDate` | `string` | - | 结束时间 `YYYY-MM-DD HH:mm:ss` |

### 返回类型

当 `period='1'` 时返回分时数据：

```typescript
interface MinuteTimeline {
  time: string;       // 时间 YYYY-MM-DD HH:mm
  open: number;       // 开盘价
  close: number;      // 收盘价
  high: number;       // 最高价
  low: number;        // 最低价
  volume: number;     // 成交量
  amount: number;     // 成交额
  avgPrice: number;   // 均价
}
```

当 `period` 为 5/15/30/60 时返回分钟 K 线：

```typescript
interface MinuteKline {
  time: string;               // 时间 YYYY-MM-DD HH:mm
  open: number | null;        // 开盘价
  close: number | null;       // 收盘价
  high: number | null;        // 最高价
  low: number | null;         // 最低价
  volume: number | null;      // 成交量
  amount: number | null;      // 成交额
  changePercent: number | null;  // 涨跌幅 %
  change: number | null;         // 涨跌额
  amplitude: number | null;      // 振幅 %
  turnoverRate: number | null;   // 换手率 %
}
```

### 示例

```typescript
// 获取分时数据（近 5 个交易日）
const timeline = await sdk.getMinuteKline('000001');

timeline.forEach(t => {
  console.log(`${t.time}: ${t.close} (均价: ${t.avgPrice})`);
});

// 获取 5 分钟 K 线
const kline5m = await sdk.getMinuteKline('sz000858', { period: '5' });

kline5m.forEach(k => {
  console.log(`${k.time}: 开 ${k.open} 收 ${k.close}`);
});

// 获取 15 分钟 K 线
const kline15m = await sdk.getMinuteKline('sz000858', { period: '15' });

// 获取 60 分钟 K 线
const kline60m = await sdk.getMinuteKline('sz000858', { period: '60' });
```

---

## 周期说明

| 周期 | 值 | 说明 |
|------|-----|------|
| 分时 | `'1'` | 1 分钟级别，仅返回近 5 个交易日 |
| 5 分钟 | `'5'` | 5 分钟 K 线 |
| 15 分钟 | `'15'` | 15 分钟 K 线 |
| 30 分钟 | `'30'` | 30 分钟 K 线 |
| 60 分钟 | `'60'` | 60 分钟 K 线（小时线） |

---

## 交易时间

A 股交易时间：

| 时段 | 时间 |
|------|------|
| 集合竞价 | 09:15 - 09:25 |
| 早盘 | 09:30 - 11:30 |
| 午休 | 11:30 - 13:00 |
| 午盘 | 13:00 - 15:00 |

每个交易日共 240 分钟（4 小时）。

