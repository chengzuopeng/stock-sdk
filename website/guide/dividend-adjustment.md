# 复权说明

> **TL;DR**:`getHistoryKline` / `getMinuteKline` / `getHKHistoryKline` / `getUSHistoryKline` 的 `adjust` 参数**默认值是 `'qfq'`(前复权)**。如果你做回测、计算分红再投资收益,务必显式传 `'hfq'` 或 `''`。

## 三种复权类型

| 取值 | 含义 | 价格特性 | 典型场景 |
|------|------|----------|----------|
| `''` | **不复权** | 交易所原始成交价 | 成交流水核对、深度订单簿分析 |
| `'qfq'` | **前复权(默认)** | 以最近一次分红送股为锚,把历史价格按比例向下调整 | 看技术走势、画 K 线图、技术指标计算 |
| `'hfq'` | **后复权** | 以上市首日为锚,把每次分红送股摊到当下,价格随时间累计上扬 | 长期收益率、回测策略、复利计算 |

## 为什么默认 `'qfq'`?

主流财经网站、券商交易软件展示 K 线时几乎都用前复权,
价格曲线在分红除权日没有跳空缺口,视觉上"连续",方便看走势。

但**前复权的"价格"不是当时的真实成交价**:
某只股票如果在 2020 年除权前价格 100 元、除权后变成 50 元,
今天用前复权拉历史 K 线,2020 年除权前的"价格"会被调整成 50 元附近。
直接拿这个价格算"我那时买入花了多少钱"是错的。

## 三种场景如何选

### 场景 1:画 K 线图、做技术分析(MA/MACD/BOLL 等)

**用 `'qfq'`(默认即可)**。

```ts
const klines = await sdk.getHistoryKline('sh600519');
// 等价于:
// const klines = await sdk.getHistoryKline('sh600519', { adjust: 'qfq' });
```

技术指标本质上是对价格序列的统计变换,需要序列连续无缺口。
前复权恰好满足这个要求。

### 场景 2:回测策略、计算长期收益率

**用 `'hfq'`,显式传**。

```ts
const klines = await sdk.getHistoryKline('sh600519', { adjust: 'hfq' });
const totalReturn = (klines.at(-1)!.close! / klines[0].close! - 1) * 100;
console.log(`${totalReturn.toFixed(2)}% 累计收益`);
```

后复权下,首日 close 与末日 close 的比值就是真实(含分红再投资)的累计涨幅。
前复权下首末价比会丢掉分红的影响,低估真实收益。

### 场景 3:成交流水核对、做特定日期的资金成本回溯

**用 `''`(不复权)**。

```ts
const klines = await sdk.getHistoryKline('sh600519', { adjust: '' });
const dayKline = klines.find(k => k.date === '2020-06-24');
// dayKline.close 就是 2020-06-24 当天交易所撮合的真实收盘价
```

只有不复权能拿到当时的真实价格,可以和券商对账单 / 历史持仓成本对得上。

## 港股 / 美股

`getHKHistoryKline` / `getUSHistoryKline` 的 `adjust` 默认值同样是 `'qfq'`。
逻辑与 A 股一致,选择标准相同。

## 1 分钟分时不支持复权

`getMinuteKline(symbol)`(period='1' 默认)走的是东方财富 `trends2/get` 接口,
本身不接受复权参数。5/15/30/60 分钟 K 线走 `kline/get` 接口,
和日 K 一样支持 `adjust='qfq'/'hfq'/''`。

## 常见误区

::: danger 不要用前复权数据算累计收益率
```ts
// ❌ 错的
const klines = await sdk.getHistoryKline('sh600519'); // 默认 qfq
const totalReturn = klines.at(-1)!.close! / klines[0].close! - 1;
// 这个 totalReturn 不包含分红收益,可能比真实收益少 20-50%
```
:::

::: danger 不要拿前复权价反推"那时候我花了多少钱买入"
前复权下的"历史价格"已经被调整过,不等于当时的撮合价。
要查历史成本请用 `adjust: ''`。
:::

::: tip 价格变了但不要慌
同一个 symbol 在不同 adjust 下返回的 OHLCV 数值会不一样。
这不是 bug,是复权算法本身的特性。
:::
