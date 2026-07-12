# chips · 筹码分布

`sdk.chips` 提供 A 股 / 港股 / 美股的**筹码分布(CYQ,成本转换分布)**:每日获利比例、平均成本、90% / 70% 成本区间与集中度,以及筹码峰直方图本身。

筹码分布没有公开查询接口 —— 行情软件里看到的筹码图都是**用日 K 线 + 换手率在本地推演**出来的。本 SDK 移植了东方财富前端的原版算法(与 akshare `stock_cyq_em` 运行的是同一段逻辑),在你本地完成计算:数据原料来自对应市场的日 K 线接口,**不新增任何数据源依赖**,浏览器 / Node.js 双端可用。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

// 贵州茅台最近 90 个交易日的筹码分布序列(默认前复权、120 根回看窗口)
const rows = await sdk.chips.cn('600519')
console.log(rows.at(-1))
// {
//   date: '2026-07-06',
//   profitRatio: 0.923,      // 获利比例(收盘价之下的筹码占比)
//   avgCost: 1420.5,         // 平均成本(累计 50% 筹码处,东财口径)
//   cost90Low: 1350.2,       // 90% 筹码成本区间
//   cost90High: 1489.7,
//   concentration90: 0.049,  // 90% 集中度 (高-低)/(高+低)
//   cost70Low: 1382.4,
//   cost70High: 1461.3,
//   concentration70: 0.028,
// }

// 附带最新一日的筹码峰形状(150 个价格档的占比分布)
const withPeak = await sdk.chips.cn('600519', { days: 30, includeHistogram: 'last' })
const peak = withPeak.at(-1)!.histogram!
// peak.prices: [1350.2, 1351.1, ...]  150 档价格(低 → 高)
// peak.ratios: [0.0021, 0.0038, ...]  各档筹码占比,总和 ≈ 1
```

## 方法表

| 方法 | 说明 |
|---|---|
| `chips.cn(symbol, opts?)` | A 股筹码分布(符号写法同 `kline.cn`,如 `'600519'` / `'sh600519'`) |
| `chips.hk(symbol, opts?)` | 港股筹码分布(如 `'00700'` / `'hk00700'`) |
| `chips.us(symbol, opts?)` | 美股筹码分布(裸 ticker `'AAPL'` 或 secid `'105.AAPL'` 均可) |

> 数据原料:东方财富对应市场日 K 线(含换手率)。指数 / ETF 没有换手率概念,不适用本模型。

## 参数

```ts
interface ChipDistributionRequestOptions {
  /** 返回最近 N 个交易日的序列 @default 90 */
  days?: number
  /** 复权方式(与 kline 一致) @default 'qfq' */
  adjust?: '' | 'qfq' | 'hfq'
  /**
   * 分布回看窗口(K 线根数)
   * - 120(默认):与东财 App / 网页筹码分布的显示口径一致
   * - 0:从上市首日全量累计 —— akshare stock_cyq_em 的口径(计算量更大)
   * @default 120
   */
  range?: number
  /**
   * 筹码峰直方图:
   * - 不传 / false:不附带
   * - 'last' 或 true:仅最后一日附带
   * - 'all':每日都附带(注意体积:每行 150 档 × 2 数组)
   */
  includeHistogram?: boolean | 'last' | 'all'
  /** 获利比例 / 集中度的舍入小数位(价格类字段固定 2 位) @default 3 */
  decimals?: number
}
```

## 返回值

`Promise<ChipDistributionItem[]>`,按日期升序:

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | `string` | 日期 `YYYY-MM-DD` |
| `profitRatio` | `number \| null` | 获利比例 0~1:成本低于收盘价的筹码占比 |
| `avgCost` | `number \| null` | 平均成本(元):累计 50% 筹码处的价格(即中位数成本,东财「平均成本」口径) |
| `cost90Low` / `cost90High` | `number \| null` | 90% 筹码的成本区间(掐头去尾各 5%) |
| `concentration90` | `number \| null` | 90% 集中度 `(高-低)/(高+低)`,越小越集中 |
| `cost70Low` / `cost70High` | `number \| null` | 70% 筹码的成本区间 |
| `concentration70` | `number \| null` | 70% 集中度 |
| `histogram` | `ChipHistogram?` | 筹码峰:`prices`(150 档价格)+ `ratios`(各档占比,总和 ≈ 1) |

窗口内换手全部缺失 / 为 0(分布无从推演)时,该行统计字段为 `null`。

## 算法与口径

- **算法**:忠实移植东财前端 `CYQCalculator` —— 价格域均分 150 档(精度下限 0.01 元);逐日先把存量筹码 ×(1 - 换手率),再把当日换手筹码按三角形分布(顶点在均价 `(O+C+H+L)/4`)铺到 `[low, high]`;一字板堆入单一价格档。单元测试与原版 JS 逐日逐字段对拍。
- **`range` 与 akshare 的差异**:东财 App 实际使用 120 根回看窗口;akshare 调用原版 JS 时窗口参数未生效,等价于全量累计。因此**同一天两种口径的数值不同**。默认 `120` 对齐东财 App;要复现 akshare 输出请传 `{ range: 0, adjust: '' }`。
- **复权**:分布数值随复权口径变化。默认 `qfq` 与 SDK 的 K 线默认一致(送股除权后成本摊薄,前复权价更可比);akshare 默认不复权。
- **纯函数入口**:计算本体 `calcChipDistribution(klines, options)` 从 `stock-sdk/indicators` 导出,可以喂自备 K 线(需含 `open/high/low/close/turnoverRate`),`tail` 选项可只对尾部 N 根产出统计(全量累计口径下避免 O(N²) 计算)。

```ts
import { calcChipDistribution } from 'stock-sdk/indicators'

const klines = await sdk.kline.cn('600519', { startDate: '20250101' })
const rows = calcChipDistribution(klines, { range: 120, tail: 30 })
```

## 适用性提示

- **仅个股有意义**:指数 / ETF 无换手率概念;
- **低换手个股失真**:长期停牌或极低换手(如部分港股仙股)时,窗口累计换手过低,分布主要由窗口首日堆叠决定,参考价值有限;
- **港股低价股粒度**:价格档精度下限 0.01 元,对 3 位小数报价的低价港股,直方图粒度偏粗;
- **美股换手率口径**:东财口径(交易所公开成交量 / 流通股本),不含暗池细节,模型结论以相对形态为主。

## CLI / MCP

```bash
stock-sdk chips cn 600519 --days 30 --histogram last
stock-sdk chips hk 00700 --range 0 --adjust none
stock-sdk chips us 105.AAPL --days 60
```

MCP 工具:`get_chip_distribution`(core 工具集)/ `get_hk_chip_distribution` / `get_us_chip_distribution`。
