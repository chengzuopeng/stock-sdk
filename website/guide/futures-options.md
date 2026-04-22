# 期货与期权

Stock SDK 已经覆盖国内期货、全球期货和多类期权接口。文档站此前缺少任务型说明，这一页用于把常见组合方式串起来。

## 期货

### 国内期货日常分析

```ts
const rbMain = await sdk.getFuturesKline('RBM', {
  period: 'daily',
  startDate: '20250101',
});

const ifWeekly = await sdk.getFuturesKline('IF2604', {
  period: 'weekly',
  startDate: '20250101',
});
```

适用场景：

- 主力连续合约趋势跟踪
- 单一合约回测或图表展示

### 全球期货监控

```ts
const globalSpot = await sdk.getGlobalFuturesSpot();
const copper = await sdk.getGlobalFuturesKline('HG00Y', {
  period: 'daily',
  startDate: '20250101',
});
```

`getGlobalFuturesSpot` 适合做盘中看板，`getGlobalFuturesKline` 适合做历史走势和技术指标分析。

## 期权

### 中金所股指期权

```ts
const ioTQuote = await sdk.getIndexOptionSpot('io', 'io2504');
const ioKline = await sdk.getIndexOptionKline('io2504C3600');
```

`getIndexOptionSpot` 返回 T 型报价，适合做行权价分布、隐含波动率前置分析或到期月筛选。

### 上交所 ETF 期权

```ts
const monthInfo = await sdk.getETFOptionMonths('50ETF');
const expireInfo = await sdk.getETFOptionExpireDay('50ETF', monthInfo.months[0]);
const minuteData = await sdk.getETFOptionMinute('10009633');
```

推荐组合：

- `getETFOptionMonths` 先拿可交易月份
- `getETFOptionExpireDay` 再补到期日和剩余天数
- `getETFOptionMinute` / `getETFOptionDailyKline` 获取分钟或日线走势

### 商品期权

```ts
const auSpot = await sdk.getCommodityOptionSpot('au', 'au2506');
const mKline = await sdk.getCommodityOptionKline('m2409C3200');
```

## 组合示例

### 1. 国内期货看板

- 用 `getFuturesKline` 展示主力连续 K 线
- 用 `getFuturesInventorySymbols`、`getFuturesInventory` 补库存数据
- 对主连数据叠加 `calcMA`、`calcMACD`、`calcATR`

### 2. ETF 期权到期月筛选

- 先用 `getETFOptionMonths`
- 再用 `getETFOptionExpireDay`
- 最后根据剩余天数和分钟行情做策略筛选

### 3. 指数期权 T 型报价监控

- 用 `getIndexOptionSpot` 拉取 calls / puts
- 按行权价聚合成交量、持仓量和价差
- 需要历史走势时再调用 `getIndexOptionKline`

## 相关 API

- [期货行情 API](/api/futures)
- [期权数据 API](/api/options)
- [技术指标](/guide/indicators)
