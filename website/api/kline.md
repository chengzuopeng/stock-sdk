# 历史 K 线

## getHistoryKline

获取 A 股历史 K 线（日/周/月），数据来源：东方财富。

### 签名

```typescript
getHistoryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<HistoryKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 股票代码，如 `'000001'` 或 `'sz000001'` |
| `period` | `string` | `'daily'` | K 线周期：`'daily'` / `'weekly'` / `'monthly'` |
| `adjust` | `string` | `'qfq'` | 复权类型：`''`（不复权）/ `'qfq'`（前复权）/ `'hfq'`（后复权） |
| `startDate` | `string` | - | 开始日期 `YYYYMMDD` |
| `endDate` | `string` | - | 结束日期 `YYYYMMDD` |

### 返回类型

```typescript
interface HistoryKline {
  date: string;               // 日期 YYYY-MM-DD
  code: string;               // 股票代码
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
// 获取日线（默认前复权）
const dailyKlines = await sdk.getHistoryKline('000001');

// 获取周线，前复权，指定日期范围
const weeklyKlines = await sdk.getHistoryKline('sz000858', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});

weeklyKlines.forEach(k => {
  console.log(`${k.date}: 开 ${k.open} 高 ${k.high} 低 ${k.low} 收 ${k.close}`);
});
```

---

## getHKHistoryKline

获取港股历史 K 线（日/周/月），数据来源：东方财富。

### 签名

```typescript
getHKHistoryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<HKUSHistoryKline[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 港股代码，5 位数字（如 `'00700'`、`'09988'`） |

### 返回类型

```typescript
interface HKUSHistoryKline {
  date: string;               // 日期 YYYY-MM-DD
  code: string;               // 股票代码
  name: string;               // 股票名称
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
// 获取腾讯控股日 K 线
const klines = await sdk.getHKHistoryKline('00700');

// 获取阿里巴巴周 K 线，前复权
const weeklyKlines = await sdk.getHKHistoryKline('09988', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});

console.log(klines[0].name);   // 腾讯控股
console.log(klines[0].close);  // 收盘价
```

---

## getUSHistoryKline

获取美股历史 K 线（日/周/月），数据来源：东方财富。

### 签名

```typescript
getUSHistoryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<HKUSHistoryKline[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 美股代码，格式：`{market}.{ticker}`（如 `'105.MSFT'`、`'106.BABA'`） |

### 市场代码

| 代码 | 说明 | 示例 |
|------|------|------|
| `105` | 纳斯达克 | `105.AAPL`、`105.MSFT`、`105.TSLA` |
| `106` | 纽交所 | `106.BABA` |
| `107` | 美国其他 | `107.XXX` |

### 示例

```typescript
// 获取微软日 K 线
const klines = await sdk.getUSHistoryKline('105.MSFT');

// 获取苹果周 K 线，前复权
const weeklyKlines = await sdk.getUSHistoryKline('105.AAPL', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});

console.log(klines[0].name);   // 微软
console.log(klines[0].close);  // 收盘价

// 获取阿里巴巴月 K 线
const monthlyKlines = await sdk.getUSHistoryKline('106.BABA', {
  period: 'monthly',
});
```

---

## 复权说明

| 类型 | 值 | 说明 |
|------|-----|------|
| 不复权 | `''` | 原始价格，可能存在跳空缺口 |
| 前复权 | `'qfq'` | 以最新价格为基准向前调整，适合技术分析 |
| 后复权 | `'hfq'` | 以上市价格为基准向后调整，适合计算真实收益 |

::: tip 复权选择建议
- **技术分析**：使用前复权 `'qfq'`，图形连续性更好
- **收益计算**：使用后复权 `'hfq'`，价格反映真实收益
- **原始数据**：使用不复权 `''`，获取实际成交价格
:::

