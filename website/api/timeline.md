# 分时走势

## getTodayTimeline

获取当日分时走势数据，数据来源：腾讯财经。

::: tip 提示
此方法仅返回当日交易时段数据，成交量和成交额为累计值。
:::

### 签名

```typescript
getTodayTimeline(code: string): Promise<TodayTimelineResponse>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 股票代码，如 `'sz000001'` |

### 返回类型

```typescript
interface TodayTimelineResponse {
  code: string;             // 股票代码
  date: string;             // 交易日期 YYYYMMDD
  data: TodayTimeline[];    // 分时数据列表
}

interface TodayTimeline {
  time: string;      // 时间 HH:mm
  price: number;     // 成交价
  volume: number;    // 累计成交量（股）
  amount: number;    // 累计成交额（元）
  avgPrice: number;  // 当日均价
}
```

### 示例

```typescript
const timeline = await sdk.getTodayTimeline('sz000001');

console.log(`股票代码: ${timeline.code}`);
console.log(`交易日期: ${timeline.date}`);
console.log(`数据条数: ${timeline.data.length}`);

// 查看第一条数据（09:30）
const first = timeline.data[0];
console.log(`${first.time}: 价格 ${first.price}, 均价 ${first.avgPrice}`);
// 09:30: 价格 11.47, 均价 11.47

// 查看最后一条数据
const last = timeline.data[timeline.data.length - 1];
console.log(`${last.time}: 价格 ${last.price}, 均价 ${last.avgPrice}`);
console.log(`累计成交量: ${last.volume} 股`);
console.log(`累计成交额: ${last.amount} 元`);
```

---

## 数据说明

### 时间范围

- 返回当日交易时段的分时数据
- 交易日开盘后，数据实时更新
- 非交易时间返回空数据或前一交易日数据

### 均价计算

均价 = 累计成交额 / 累计成交量 × 100

```typescript
// 验证均价计算
const avgPrice = timeline.data[100].amount / timeline.data[100].volume * 100;
console.log(avgPrice === timeline.data[100].avgPrice);  // true
```

### 成交量单位

- `volume`: 累计成交量，单位为**股**
- `amount`: 累计成交额，单位为**元**

---

## 与分钟 K 线的区别

| 特性 | getTodayTimeline | getMinuteKline |
|------|------------------|----------------|
| 数据范围 | 仅当日 | 近 5 个交易日 |
| 成交量 | 累计值 | 该分钟成交量 |
| 均价 | 有 | 有 |
| 数据来源 | 腾讯财经 | 东方财富 |
| 更新频率 | 实时 | 分钟级 |

### 使用场景

- **getTodayTimeline**: 适合实时盯盘、日内交易分析
- **getMinuteKline**: 适合多日分时图、短线分析

