# 期权数据

获取中金所股指期权、上交所 ETF 期权、商品期权的实时报价、K 线和分钟行情数据。

## 中金所股指期权

### getIndexOptionSpot

获取中金所股指期权 T 型报价（看涨 + 看跌）。

```ts
const spot = await sdk.getIndexOptionSpot('io', 'io2504');
console.log(spot.calls); // 看涨合约列表
console.log(spot.puts);  // 看跌合约列表
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `product` | `'ho' \| 'io' \| 'mo'` | 品种代码：ho(上证50)、io(沪深300)、mo(中证1000) |
| `contract` | `string` | 合约代码，如 `'io2504'` |

**返回值：** `OptionTQuoteResult`

```ts
interface OptionTQuoteResult {
  calls: OptionTQuote[];
  puts: OptionTQuote[];
}

interface OptionTQuote {
  symbol: string;        // 合约标识
  buyVolume: number | null;     // 买量
  buyPrice: number | null;      // 买价
  price: number | null;         // 最新价
  askPrice: number | null;      // 卖价
  askVolume: number | null;     // 卖量
  openInterest: number | null;  // 持仓量
  change: number | null;        // 涨跌
  strikePrice: number | null;   // 行权价（看跌为 null）
}
```

### getIndexOptionKline

获取中金所股指期权合约日 K 线。

```ts
const klines = await sdk.getIndexOptionKline('io2504C3600');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 合约代码（含看涨/看跌标识），如 `'io2504C3600'` |

**返回值：** `OptionKline[]`

```ts
interface OptionKline {
  date: string;    // 日期 YYYY-MM-DD
  open: number | null;    // 开盘价
  high: number | null;    // 最高价
  low: number | null;     // 最低价
  close: number | null;   // 收盘价
  volume: number | null;  // 成交量
}
```

### getCFFEXOptionQuotes

获取中金所全部期权实时行情列表（东方财富数据源）。

```ts
const quotes = await sdk.getCFFEXOptionQuotes();
console.log(quotes[0].code); // 'MO2603-P-8200'
```

**返回值：** `CFFEXOptionQuote[]`

```ts
interface CFFEXOptionQuote {
  code: string;           // 合约代码
  name: string;           // 合约名称
  price: number | null;          // 最新价
  change: number | null;         // 涨跌额
  changePercent: number | null;  // 涨跌幅%
  volume: number | null;         // 成交量
  amount: number | null;         // 成交额
  openInterest: number | null;   // 持仓量
  strikePrice: number | null;    // 行权价
  remainDays: number | null;     // 剩余天数
  dailyChange: number | null;    // 日增
  prevSettle: number | null;     // 昨结算价
  open: number | null;           // 今开
}
```

## 上交所 ETF 期权

### getETFOptionMonths

获取上交所 ETF 期权到期月份列表。

```ts
const info = await sdk.getETFOptionMonths('50ETF');
console.log(info.months); // ['2026-03', '2026-04', '2026-06']
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cate` | `ETFOptionCate` | 品种名称：`'50ETF'`、`'300ETF'`、`'500ETF'`、`'科创50'` |

**返回值：** `ETFOptionMonth`

```ts
interface ETFOptionMonth {
  months: string[];    // 到期月份数组
  stockId: string;     // 标的证券代码
  cateId: string;      // 当前品种标识
  cateList: string[];  // 可选品种列表
}
```

### getETFOptionExpireDay

获取上交所 ETF 期权到期日与剩余天数。

```ts
const info = await sdk.getETFOptionExpireDay('50ETF', '2026-03');
console.log(info.expireDay);      // '2026-03-25'
console.log(info.remainderDays);  // 12
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cate` | `ETFOptionCate` | 品种名称 |
| `month` | `string` | 到期月份 `YYYY-MM` |

**返回值：** `ETFOptionExpireDay`

```ts
interface ETFOptionExpireDay {
  expireDay: string;     // 到期日
  remainderDays: number; // 剩余天数
  stockId: string;       // 标的证券代码
  name: string;          // 标的名称
}
```

### getETFOptionMinute

获取上交所 ETF 期权当日分钟行情。

```ts
const minutes = await sdk.getETFOptionMinute('10009633');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 期权代码（纯数字） |

**返回值：** `OptionMinute[]`

```ts
interface OptionMinute {
  time: string;          // 时间 HH:mm:ss
  date: string;          // 日期 YYYY-MM-DD
  price: number | null;         // 价格
  volume: number | null;        // 成交量
  openInterest: number | null;  // 持仓量
  avgPrice: number | null;      // 均价
}
```

### getETFOptionDailyKline

获取上交所 ETF 期权历史日 K 线。

```ts
const klines = await sdk.getETFOptionDailyKline('10009633');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 期权代码（纯数字） |

**返回值：** `OptionKline[]`

### getETFOption5DayMinute

获取上交所 ETF 期权 5 日分钟行情。

```ts
const minutes = await sdk.getETFOption5DayMinute('10009633');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 期权代码（纯数字） |

**返回值：** `OptionMinute[]`

## 商品期权

### getCommodityOptionSpot

获取商品期权 T 型报价。

```ts
const spot = await sdk.getCommodityOptionSpot('au', 'au2506');
console.log(spot.calls); // 看涨合约列表
console.log(spot.puts);  // 看跌合约列表
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `variety` | `string` | 品种代码，如 `'au'`、`'cu'`、`'SR'`、`'m'` |
| `contract` | `string` | 合约代码，如 `'au2506'` |

**支持的商品期权品种：**

上期所：au（黄金）、ag（白银）、cu（铜）、al（铝）、zn（锌）、ru（橡胶）
能源所：sc（原油）
大商所：m（豆粕）、c（玉米）、i（铁矿石）、p（棕榈油）、pp、l、v、pg、y、a、b、eg、eb
郑商所：SR（白糖）、CF（棉花）、TA、MA、RM、OI、PK、PF、SA、UR

**返回值：** `OptionTQuoteResult`

### getCommodityOptionKline

获取商品期权合约日 K 线。

```ts
const klines = await sdk.getCommodityOptionKline('m2409C3200');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 合约代码（含看涨/看跌标识），如 `'m2409C3200'` |

**返回值：** `OptionKline[]`

## 排名数据

### getOptionLHB

获取期权龙虎榜。

```ts
const lhb = await sdk.getOptionLHB('510050', '2022-01-21');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 标的代码，如 `'510050'`、`'510300'`、`'159919'` |
| `date` | `string` | 交易日期 `YYYY-MM-DD` |

**返回值：** `OptionLHBItem[]`

```ts
interface OptionLHBItem {
  tradeType: string;   // 交易类型
  date: string;        // 交易日期
  symbol: string;      // 标的代码
  targetName: string;  // 标的名称
  memberName: string;  // 会员简称
  rank: number;        // 排名
  sellVolume: number | null;  // 卖量
  buyVolume: number | null;   // 买量
  // ...更多字段
}
```

该返回值同时保留了 `tradeDate`、`volume`、`amount`、`openInterest`、`side` 等旧字段别名，便于兼容历史调用。
