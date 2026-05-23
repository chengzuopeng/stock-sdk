/**
 * 时间元信息工具
 *
 * 给行情/K线/分时等含时间字段的数据补充统一的 `timestamp` (UTC unix ms)
 * 与 `tz` (IANA 时区名)，让消费者无需自己根据各数据源的字符串格式做时区换算。
 *
 * 设计要点:
 * - 不引入第三方时区库 (SDK 零依赖),通过 `Intl.DateTimeFormat` 计算时区偏移。
 * - 兼容多种本地时间字符串格式 (yyyyMMddHHmmss / YYYY-MM-DD HH:mm:ss / YYYY-MM-DD HH:mm /
 *   YYYY-MM-DD / yyyyMMdd / HH:mm 配 baseDate)。
 * - 解析失败/输入为空时 `timestamp` 为 `NaN`,调用方可用 `Number.isNaN` 检测。
 */

/**
 * 已支持的市场时区。沿用 IANA 时区名。
 *
 * - `Asia/Shanghai`: A 股 (沪深北)
 * - `Asia/Hong_Kong`: 港股
 * - `America/New_York`: 美股 (含夏令时切换)
 */
export const MARKET_TZ = {
  CN: 'Asia/Shanghai',
  HK: 'Asia/Hong_Kong',
  US: 'America/New_York',
} as const;

export type MarketTz = (typeof MARKET_TZ)[keyof typeof MARKET_TZ];

/**
 * 时间元信息:与原始 `time`/`date` 字符串配套使用。
 */
export interface TimeMeta {
  /** UTC unix 毫秒时间戳。原始字符串无法解析时为 `NaN`。 */
  timestamp: number;
  /** 原始字符串对应的市场时区 (IANA name)。 */
  tz: MarketTz;
}

interface ParsedWallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * 把多种格式的本地壁钟时间字符串解析为 (年/月/日/时/分/秒)。
 * 不识别格式时返回 `null`。
 */
function parseWallClock(input: string): ParsedWallClock | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD[ T]HH:mm[:ss]
  const longMatch =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (longMatch) {
    return {
      year: +longMatch[1],
      month: +longMatch[2],
      day: +longMatch[3],
      hour: +longMatch[4],
      minute: +longMatch[5],
      second: longMatch[6] ? +longMatch[6] : 0,
    };
  }

  // YYYY-MM-DD
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateMatch) {
    return {
      year: +dateMatch[1],
      month: +dateMatch[2],
      day: +dateMatch[3],
      hour: 0,
      minute: 0,
      second: 0,
    };
  }

  // yyyyMMddHHmmss (14 字符无分隔符)
  if (/^\d{14}$/.test(trimmed)) {
    return {
      year: +trimmed.slice(0, 4),
      month: +trimmed.slice(4, 6),
      day: +trimmed.slice(6, 8),
      hour: +trimmed.slice(8, 10),
      minute: +trimmed.slice(10, 12),
      second: +trimmed.slice(12, 14),
    };
  }

  // yyyyMMdd (8 字符)
  if (/^\d{8}$/.test(trimmed)) {
    return {
      year: +trimmed.slice(0, 4),
      month: +trimmed.slice(4, 6),
      day: +trimmed.slice(6, 8),
      hour: 0,
      minute: 0,
      second: 0,
    };
  }

  return null;
}

/**
 * 给定一个市场时区,把"该时区的壁钟时间"换算成 UTC unix ms。
 * 使用 `Intl.DateTimeFormat` 二次查询确定时区偏移,可正确处理夏令时。
 */
function wallTimeToUTC(wall: ParsedWallClock, tz: string): number {
  // 第一次:把壁钟时间当作 UTC 得到一个候选时间戳。
  const utcGuess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );

  // 看这个 UTC 时间在目标时区显示的壁钟时间。差值即为时区偏移。
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcGuess));
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  // Intl 在某些区域会输出 "24" 表示 0 点,统一归一化。
  let displayedHour = parseInt(partMap.hour ?? '0', 10);
  if (displayedHour === 24) displayedHour = 0;

  const displayedUtc = Date.UTC(
    parseInt(partMap.year ?? '0', 10),
    parseInt(partMap.month ?? '1', 10) - 1,
    parseInt(partMap.day ?? '1', 10),
    displayedHour,
    parseInt(partMap.minute ?? '0', 10),
    parseInt(partMap.second ?? '0', 10)
  );

  // utcGuess - displayedUtc = 该时区相对 UTC 的偏移。
  // 真实 UTC = utcGuess + offset
  const offset = utcGuess - displayedUtc;
  return utcGuess + offset;
}

/**
 * 把 `'HH:mm'` 或 `'HH:mm:ss'` 配合一个基础日期组合成完整本地壁钟时间。
 *
 * 用于"当日分时"等场景:接口返回的时间只有 `HH:mm`,日期需要从外层 `date` 字段拿。
 *
 * 支持的 baseDate 格式：
 *  - `YYYY-MM-DD`（带横线）
 *  - `YYYYMMDD`  （腾讯分时接口的原始格式）
 */
function combineDateAndTime(
  baseDate: string,
  hhmm: string
): ParsedWallClock | null {
  const trimmedDate = (baseDate || '').trim();
  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDate) ??
    /^(\d{4})(\d{2})(\d{2})$/.exec(trimmedDate);
  if (!dateMatch) return null;
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec((hhmm || '').trim());
  if (!timeMatch) return null;
  return {
    year: +dateMatch[1],
    month: +dateMatch[2],
    day: +dateMatch[3],
    hour: +timeMatch[1],
    minute: +timeMatch[2],
    second: timeMatch[3] ? +timeMatch[3] : 0,
  };
}

/**
 * 解析"市场本地时间字符串"为 UTC unix ms。失败返回 `NaN`。
 *
 * 支持的格式:
 * - `'YYYY-MM-DD HH:mm:ss'` / `'YYYY-MM-DDTHH:mm:ss'`
 * - `'YYYY-MM-DD HH:mm'`
 * - `'YYYY-MM-DD'` (按当日 00:00 计)
 * - `'yyyyMMddHHmmss'` (腾讯接口 14 位无分隔)
 * - `'yyyyMMdd'` (8 位日期)
 *
 * @param local 市场本地时间字符串
 * @param tz    市场时区 (使用 `MARKET_TZ`)
 */
export function parseMarketTime(local: string, tz: MarketTz): number {
  const wall = parseWallClock(local);
  if (!wall) return NaN;
  return wallTimeToUTC(wall, tz);
}

/**
 * 构造 `TimeMeta`。原始字符串无法解析时 `timestamp` 为 `NaN`。
 *
 * @param local 市场本地时间字符串
 * @param tz    市场时区
 */
export function buildTimeMeta(local: string, tz: MarketTz): TimeMeta {
  return { timestamp: parseMarketTime(local, tz), tz };
}

/**
 * 将"基础日期 (YYYY-MM-DD) + HH:mm 时间片"组合后构造 `TimeMeta`。
 *
 * 用于"当日分时"等只返回 `HH:mm` 的接口。
 *
 * @param baseDate 形如 `'2024-05-12'` 的日期字符串
 * @param hhmm     形如 `'09:30'` 或 `'09:30:00'` 的时间片
 * @param tz       市场时区
 */
export function buildTimeMetaFromDateAndTime(
  baseDate: string,
  hhmm: string,
  tz: MarketTz
): TimeMeta {
  const wall = combineDateAndTime(baseDate, hhmm);
  if (!wall) return { timestamp: NaN, tz };
  return { timestamp: wallTimeToUTC(wall, tz), tz };
}
