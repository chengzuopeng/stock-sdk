/**
 * 交易日历 / 市场状态工具
 *
 * 在原有 `getTradingCalendar()` 字符串数组之外,提供更高层的便利方法:
 * - `isTradingDay(date?)`:判断是否交易日 (A 股,基于上游日历)
 * - `nextTradingDay(date?)` / `prevTradingDay(date?)`:跳转最近的交易日
 * - `getMarketStatus(market?)`:返回当前市场是开盘/午休/盘前/盘后/休市等状态
 *
 * 港股 / 美股没有官方日历数据源,`getMarketStatus('HK' | 'US')` 退化为
 * "周一-周五 + 已知交易时段"判断。法定假日不会被识别。
 */
import type { QuoteService } from './quoteService';
import { MARKET_TZ, type MarketTz } from '../core';

/**
 * 市场实时状态。
 *
 * - `'pre_market'` 盘前(含集合竞价)
 * - `'open'` 连续竞价交易中
 * - `'lunch_break'` 午间休市(港股 12:00-13:00,A 股 11:30-13:00;美股无)
 * - `'after_hours'` 盘后
 * - `'closed'` 非交易日 / 周末 / 凌晨等远离交易时段的时间
 */
export type MarketStatus =
  | 'pre_market'
  | 'open'
  | 'lunch_break'
  | 'after_hours'
  | 'closed';

/** 支持的市场枚举,用于 `getMarketStatus`。 */
export type SupportedMarket = 'A' | 'HK' | 'US';

/**
 * 已支持的交易时段定义 (使用市场本地时间的"分钟数",从 00:00 起算)。
 * 数值采用 hour * 60 + minute,便于范围比较。
 */
interface MarketSession {
  tz: MarketTz;
  /** 多个连续竞价时段。每个 [开, 闭) 半开区间 */
  open: Array<[number, number]>;
  /** 午休时段 (开盘时段中间的休息),用于区分 lunch_break vs pre_market/after_hours */
  lunchBreak?: [number, number];
  /** 当地时区下的一周交易日 (1=Mon ... 7=Sun)。仅用于"无日历数据"市场的近似判断。 */
  tradingWeekdays: number[];
}

const HM = (h: number, m: number) => h * 60 + m;

const MARKET_SESSIONS: Record<SupportedMarket, MarketSession> = {
  A: {
    tz: MARKET_TZ.CN,
    open: [
      [HM(9, 30), HM(11, 30)],
      [HM(13, 0), HM(15, 0)],
    ],
    lunchBreak: [HM(11, 30), HM(13, 0)],
    tradingWeekdays: [1, 2, 3, 4, 5],
  },
  HK: {
    tz: MARKET_TZ.HK,
    open: [
      [HM(9, 30), HM(12, 0)],
      [HM(13, 0), HM(16, 0)],
    ],
    lunchBreak: [HM(12, 0), HM(13, 0)],
    tradingWeekdays: [1, 2, 3, 4, 5],
  },
  US: {
    tz: MARKET_TZ.US,
    // 仅常规交易时段 (Regular Trading Hours),不含盘前/盘后扩展时段
    open: [[HM(9, 30), HM(16, 0)]],
    tradingWeekdays: [1, 2, 3, 4, 5],
  },
};

/** 把多种输入归一化为 `'YYYY-MM-DD'` (按 `tz` 的当日)。 */
function normalizeDate(input: string | Date | undefined, tz: MarketTz): string {
  if (input == null) {
    return formatDateInTz(new Date(), tz);
  }
  if (input instanceof Date) {
    return formatDateInTz(input, tz);
  }
  const trimmed = input.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // YYYYMMDD
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  // 兜底:试着 new Date(input) 解析
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateInTz(parsed, tz);
  }
  throw new RangeError(
    `Unsupported date input: ${JSON.stringify(input)}. Expected 'YYYY-MM-DD', 'YYYYMMDD', or Date.`
  );
}

/** 取一个 Date 在指定时区下的"日期"部分 (`YYYY-MM-DD`)。 */
function formatDateInTz(date: Date, tz: MarketTz): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA 输出 YYYY-MM-DD
  return dtf.format(date);
}

/** 取一个 Date 在指定时区下的 "(分钟数, 周几 1=Mon..7=Sun)"。 */
function getWallTimeAndWeekday(
  date: Date,
  tz: MarketTz
): { minutes: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const partMap: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  let hour = parseInt(partMap.hour ?? '0', 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(partMap.minute ?? '0', 10);

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const weekday = weekdayMap[partMap.weekday ?? ''] ?? 0;
  return { minutes: hour * 60 + minute, weekday };
}

/**
 * 在已排序的 A 股交易日数组中,二分查找 `>= target` 的第一个元素索引。
 */
function lowerBound(arr: string[], target: string): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class TradingCalendarService {
  constructor(private readonly quoteService: QuoteService) {}

  /**
   * 判断给定日期是否为 A 股交易日。
   *
   * 数据源:`getTradingCalendar()` (腾讯接口,带 12 小时缓存)。
   * 因此第一次调用会拉取全量交易日列表,后续命中缓存。
   *
   * @param date 不传则取"现在 `Asia/Shanghai` 的当日"。可传 `'YYYY-MM-DD'` /
   *             `'YYYYMMDD'` / `Date` 对象。
   * @returns `true` 表示是交易日;`false` 表示节假日 / 周末。
   */
  async isTradingDay(date?: string | Date): Promise<boolean> {
    const target = normalizeDate(date, MARKET_TZ.CN);
    const calendar = await this.quoteService.getTradingCalendar();
    // 利用排序数组 + 二分快速查找
    const idx = lowerBound(calendar, target);
    return idx < calendar.length && calendar[idx] === target;
  }

  /**
   * 返回 A 股下一个交易日 (`'YYYY-MM-DD'`)。
   *
   * - 如果 `date` 本身是交易日,返回它**之后**的下一个交易日
   * - 如果 `date` 是节假日,返回大于它的第一个交易日
   * - 如果在已知日历范围之外,抛 `RangeError`
   *
   * @param date 不传则取"现在 `Asia/Shanghai` 的当日"
   */
  async nextTradingDay(date?: string | Date): Promise<string> {
    const target = normalizeDate(date, MARKET_TZ.CN);
    const calendar = await this.quoteService.getTradingCalendar();
    let idx = lowerBound(calendar, target);
    // 如果命中了 target 本身,跳到下一个
    if (idx < calendar.length && calendar[idx] === target) idx += 1;
    if (idx >= calendar.length) {
      throw new RangeError(
        `nextTradingDay: ${target} 之后没有可用交易日 (日历最大日期 ${calendar[calendar.length - 1] ?? 'N/A'})`
      );
    }
    return calendar[idx];
  }

  /**
   * 返回 A 股上一个交易日 (`'YYYY-MM-DD'`)。
   *
   * - 如果 `date` 本身是交易日,返回它**之前**的上一个交易日
   * - 如果 `date` 是节假日,返回小于它的最后一个交易日
   * - 如果在已知日历范围之外,抛 `RangeError`
   *
   * @param date 不传则取"现在 `Asia/Shanghai` 的当日"
   */
  async prevTradingDay(date?: string | Date): Promise<string> {
    const target = normalizeDate(date, MARKET_TZ.CN);
    const calendar = await this.quoteService.getTradingCalendar();
    const idx = lowerBound(calendar, target);
    // idx 指向第一个 >= target 的元素;前一个就是 < target 的最后一个
    const prevIdx = idx - 1;
    if (prevIdx < 0) {
      throw new RangeError(
        `prevTradingDay: ${target} 之前没有可用交易日 (日历最小日期 ${calendar[0] ?? 'N/A'})`
      );
    }
    return calendar[prevIdx];
  }

  /**
   * 返回当前市场状态 (同步,不发请求)。
   *
   * - **A 股**:仅按交易时段判断,**不识别法定假日**(SDK 不会为此发请求)。
   *   如需精确判断"今天是否真的是交易日",请用 `await isTradingDay()`。
   *   返回 `'closed'` 时表示"周末或非交易时段",可能是节假日 / 凌晨 / 深夜。
   * - **港股 / 美股**:同样按"周一-周五 + 已知时段"判断,不识别假日。
   *
   * @param market `'A'`(默认) / `'HK'` / `'US'`
   * @param now    用于测试注入"当前时间";生产代码不需要传
   */
  getMarketStatus(market: SupportedMarket = 'A', now: Date = new Date()): MarketStatus {
    const session = MARKET_SESSIONS[market];
    const { minutes, weekday } = getWallTimeAndWeekday(now, session.tz);

    if (!session.tradingWeekdays.includes(weekday)) {
      return 'closed';
    }

    // 完整市场开盘窗口的最小开始 / 最大结束
    const dayStart = session.open[0][0];
    const dayEnd = session.open[session.open.length - 1][1];

    if (minutes < dayStart) return 'pre_market';
    if (minutes >= dayEnd) return 'after_hours';

    // 落在交易时段?
    for (const [s, e] of session.open) {
      if (minutes >= s && minutes < e) return 'open';
    }

    // 不在任何 open 区间但又在 [dayStart, dayEnd) 内 → 必然是午休
    if (
      session.lunchBreak &&
      minutes >= session.lunchBreak[0] &&
      minutes < session.lunchBreak[1]
    ) {
      return 'lunch_break';
    }

    // 兜底:理论上不会到这里
    return 'closed';
  }
}
