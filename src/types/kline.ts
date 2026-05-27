import type { MarketTz } from '../core/time';

/**
 * A 股历史 K 线（日/周/月）
 */
export interface HistoryKline {
  /** 日期 YYYY-MM-DD (A 股时区) */
  date: string;
  /** 当日 00:00 (`Asia/Shanghai`) 的 UTC 毫秒时间戳;无法解析时为 `NaN` */
  timestamp: number;
  /** 日期所属市场时区 (`Asia/Shanghai`) */
  tz: MarketTz;
  /** 股票代码 */
  code: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * A 股分时数据（1 分钟）
 */
export interface MinuteTimeline {
  /** 时间 YYYY-MM-DD HH:mm (A 股时区) */
  time: string;
  /** UTC 毫秒时间戳 (`Asia/Shanghai` 解释);无法解析时为 `NaN` */
  timestamp: number;
  /** 时间所属市场时区 (`Asia/Shanghai`) */
  tz: MarketTz;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 均价 */
  avgPrice: number | null;
}

/**
 * A 股分钟 K 线（5/15/30/60）
 */
export interface MinuteKline {
  /** 时间 YYYY-MM-DD HH:mm (A 股时区) */
  time: string;
  /** UTC 毫秒时间戳 (`Asia/Shanghai` 解释);无法解析时为 `NaN` */
  timestamp: number;
  /** 时间所属市场时区 (`Asia/Shanghai`) */
  tz: MarketTz;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * 当日分时项
 */
export interface TodayTimeline {
  /** 时间 HH:mm (A 股时区) */
  time: string;
  /**
   * UTC 毫秒时间戳。由所属 `TodayTimelineResponse.date` 与 `time` 拼接后,
   * 按 `Asia/Shanghai` 解释得到;无法解析时为 `NaN`。
   */
  timestamp: number;
  /** 时间所属市场时区 (`Asia/Shanghai`) */
  tz: MarketTz;
  /** 当前价 */
  price: number;
  /** 均价 */
  avgPrice: number;
  /** 累计成交量(股) */
  volume: number;
  /** 累计成交额(元) */
  amount: number;
}

/**
 * 当日分时响应
 */
export interface TodayTimelineResponse {
  /** 股票代码 */
  code: string;
  /** 交易日期 YYYY-MM-DD (A 股时区) */
  date: string;
  /** 交易日 00:00 (`Asia/Shanghai`) 的 UTC 毫秒时间戳;无法解析时为 `NaN` */
  timestamp: number;
  /** 日期所属市场时区 (`Asia/Shanghai`) */
  tz: MarketTz;
  /**
   * 昨收价
   * - 由 SDK 解析腾讯接口的 `quoteFields[4]` 得到
   * - 上游异常或接口未返回时可能为 `0` 或 `undefined`
   */
  preClose?: number;
  /** 当日分时序列 */
  data: TodayTimeline[];
}

/**
 * 港股 / 美股历史 K 线公共字段。
 *
 * 内部基类,通常不直接使用。请用具体的 `HKHistoryKline` 或 `USHistoryKline`,
 * 它们各自带本地化字段 (`currency` / `lotSize`)。
 */
interface ForeignHistoryKlineBase {
  /** 日期 YYYY-MM-DD (市场本地时区) */
  date: string;
  /** UTC 毫秒时间戳;无法解析时为 `NaN` */
  timestamp: number;
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * 港股历史 K 线
 *
 * `currency` 固定 `'HKD'`,`tz` 固定 `'Asia/Hong_Kong'`。
 * `lotSize`(每手股数)由 K 线接口本身不直接返回,目前为 `null`,
 * 后续若数据源补齐再填充;如需港股每手股数请用 `getHKQuotes` 的 `lotSize` 字段。
 */
export interface HKHistoryKline extends ForeignHistoryKlineBase {
  /** 时区 (`Asia/Hong_Kong`) */
  tz: MarketTz;
  /** 计价币种 (固定 `'HKD'`) */
  currency: 'HKD';
  /** 港股每手股数;K 线接口暂不返回,固定 `null` */
  lotSize: number | null;
}

/**
 * 美股历史 K 线
 *
 * `currency` 固定 `'USD'`,`tz` 固定 `'America/New_York'`(自动处理夏令时切换)。
 * 不含盘前/盘后(extended hours)数据,仅常规交易时段。
 */
export interface USHistoryKline extends ForeignHistoryKlineBase {
  /** 时区 (`America/New_York`,含夏令时) */
  tz: MarketTz;
  /** 计价币种 (固定 `'USD'`) */
  currency: 'USD';
}

/**
 * 港股 / 美股历史 K 线 (兼容别名)
 *
 * @deprecated 自 v1.9.1 起拆分为 {@link HKHistoryKline} 与 {@link USHistoryKline},
 * 各自带本地化字段 (currency / lotSize)。本别名仍是它们的 union,
 * 老代码无需立即迁移;新代码请直接用具体类型以获得更好的类型推断。
 */
export type HKUSHistoryKline = HKHistoryKline | USHistoryKline;

/**
 * 港股分钟 K 线（5/15/30/60；v1.10.0+）
 *
 * 字段与 A 股 {@link MinuteKline} 同结构，额外携带 `currency` / `code`。
 * `tz` 固定为 `'Asia/Hong_Kong'`。
 */
export interface HKMinuteKline extends Omit<MinuteKline, 'tz'> {
  tz: MarketTz;
  currency: 'HKD';
  code: string;
}

/**
 * 港股当日分时（1 分钟；v1.10.0+）
 *
 * `tz` 固定为 `'Asia/Hong_Kong'`。
 */
export interface HKMinuteTimeline extends Omit<MinuteTimeline, 'tz'> {
  tz: MarketTz;
  currency: 'HKD';
  code: string;
}

/**
 * 美股分钟 K 线（5/15/30/60；v1.10.0+）
 *
 * `tz` 固定为 `'America/New_York'`（含夏令时切换）。
 * 不含盘前 / 盘后数据，仅常规交易时段。
 */
export interface USMinuteKline extends Omit<MinuteKline, 'tz'> {
  tz: MarketTz;
  currency: 'USD';
  code: string;
}

/**
 * 美股当日分时（1 分钟；v1.10.0+）
 *
 * `tz` 固定为 `'America/New_York'`。
 */
export interface USMinuteTimeline extends Omit<MinuteTimeline, 'tz'> {
  tz: MarketTz;
  currency: 'USD';
  code: string;
}
