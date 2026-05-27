# 分钟 K 线

::: warning 复权默认值
`getMinuteKline` 在 `period='5'/'15'/'30'/'60'` 时 `adjust` 参数**默认 `'qfq'`(前复权)**，
`period='1'` 分时数据不支持复权。回测/收益计算请显式传 `'hfq'` 或 `''`，
详见 [复权说明](/guide/dividend-adjustment)。
:::

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
| `adjust` | `string` | `'qfq'` | 复权类型（仅 5/15/30/60 有效） |
| `startDate` | `string` | - | 开始时间 `YYYY-MM-DD HH:mm[:ss]` |
| `endDate` | `string` | - | 结束时间 `YYYY-MM-DD HH:mm[:ss]` |

### 返回类型

当 `period='1'` 时返回分时数据：

```typescript
interface MinuteTimeline {
  time: string;       // 时间 YYYY-MM-DD HH:mm
  open: number | null;      // 开盘价
  close: number | null;     // 收盘价
  high: number | null;      // 最高价
  low: number | null;       // 最低价
  volume: number | null;    // 成交量
  amount: number | null;    // 成交额
  avgPrice: number | null;  // 均价
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

::: tip 时间过滤
- `period='1'` 时数据范围固定为近 5 个交易日，`startDate/endDate` 仅在此范围内过滤
- 时间精度为分钟，秒级会被自动截断
:::

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

## getHKMinuteKline（v1.10.0+）

获取港股分钟 K 线或当日分时数据。数据来源：东方财富（`33.push2his.eastmoney.com`），与 `getHKHistoryKline` 共用同一域名体系。

### 签名

```typescript
getHKMinuteKline(
  symbol: string,
  options?: HKMinuteKlineOptions
): Promise<HKMinuteTimeline[] | HKMinuteKline[]>
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | `string` | ✅ | 港股代码，纯数字或带 `hk` 前缀均可（如 `'00700'` / `'hk00700'`）；自动 padStart 到 5 位 |
| `options.period` | `'1' \| '5' \| '15' \| '30' \| '60'` | — | 默认 `'1'`（分时）；其他值返回对应分钟 K |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | — | 默认 `'qfq'`（仅 5/15/30/60 分钟生效；1 分钟分时不复权） |
| `options.ndays` | `number` | — | 仅 `period='1'` 生效；返回最近 N 个交易日，默认 `1`（当日分时）。设为 `5` 可拿近 5 日分时 |
| `options.startDate` / `options.endDate` | `string` | — | `YYYY-MM-DD HH:mm`（**港股本地时区** `Asia/Hong_Kong`），客户端过滤 |

### 返回类型

`period='1'` 时返回 `HKMinuteTimeline[]`（含 `time` / `timestamp` / `tz: 'Asia/Hong_Kong'` / `open` / `close` / `high` / `low` / `volume` / `amount` / `avgPrice` / `currency: 'HKD'` / `code`）；其他周期返回 `HKMinuteKline[]`（结构同 A 股 `MinuteKline` 加 `currency` / `code`）。

### 示例

```typescript
// 港股腾讯 5 分钟 K 线
const k5 = await sdk.getHKMinuteKline('00700', { period: '5' });

// 港股腾讯今日分时
const timeline = await sdk.getHKMinuteKline('00700');
console.log(timeline[0].avgPrice, timeline[0].currency);  // 100.05 'HKD'
```

---

## getUSMinuteKline（v1.10.0+）

获取美股分钟 K 线或当日分时数据。**不含盘前 / 盘后数据**，仅常规交易时段。数据来源：东方财富（`63.push2his.eastmoney.com`）。

### 签名

```typescript
getUSMinuteKline(
  symbol: string,
  options?: USMinuteKlineOptions
): Promise<USMinuteTimeline[] | USMinuteKline[]>
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | `string` | ✅ | 美股代码，格式 `{market}.{ticker}`（如 `'105.AAPL'` NASDAQ / `'106.BABA'` NYSE） |
| `options.period` | `'1' \| '5' \| '15' \| '30' \| '60'` | — | 默认 `'1'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | — | 默认 `'qfq'` |
| `options.ndays` | `number` | — | 仅 `period='1'` 生效；返回最近 N 个交易日，默认 `1`（当日分时） |
| `options.startDate` / `options.endDate` | `string` | — | `YYYY-MM-DD HH:mm`（**美东时区** `America/New_York`，自动 DST），客户端过滤 |

### 返回类型

`period='1'` 返回 `USMinuteTimeline[]`，其他返回 `USMinuteKline[]`。两者 `tz` 固定 `'America/New_York'`（含夏令时切换）、`currency: 'USD'`、`code` 取自 `secid.split('.')[1]`。

::: warning 时区说明
上游东方财富 trends2 / kline 接口返回的 `time` 字符串以**北京时间**表示（如夏令时下美股开盘的北京 21:30 对应 NYC 09:30）。SDK 内部已经做转换：返回的 `time` 字段是**美东本地时间**，`timestamp` 是 UTC 毫秒，`tz` 标 `'America/New_York'`。用户传 `startDate`/`endDate` 时也应使用美东时间字符串。
:::

### 示例

```typescript
// 苹果 60 分钟 K 线
const k60 = await sdk.getUSMinuteKline('105.AAPL', { period: '60' });

// 阿里今日分时
const timeline = await sdk.getUSMinuteKline('106.BABA');
console.log(timeline[0].time, timeline[0].avgPrice);
```

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
