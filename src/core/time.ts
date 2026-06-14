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
 * - parseMarketTime 解析失败返回 `NaN`(内部中间值);对外 `TimeMeta.timestamp`
 *   一律经 toNullableEpoch 归一为 `null`,消费方判 `=== null` 即可。
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
  /** UTC unix 毫秒时间戳。原始字符串无法解析时为 `null`。 */
  timestamp: number | null;
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
/**
 * 缓存 Intl.DateTimeFormat：其构造是 V8 中最昂贵的操作之一(每次重载 ICU 区域数据),
 * 而每个 (locale, tz) 的 options 固定。按行调用的 kline/quote/timeline parser 循环里
 * 复用同一实例,避免逐行重建(3000 bar K 线原本要建 3000 个 formatter)。
 *
 * F38: 本模块只有两组固定 options(en-US 含秒解析用 / sv-SE 不含秒展示用)。
 * 此前每次取缓存都 `JSON.stringify(options)` 重建 key(5600 行批量解析约 1.3ms
 * 纯 key 开销),改为 kind 常量表 + 预拼 key 前缀('en-US|' / 'sv-SE|')+ tz 拼接。
 * 缓存命中行为与 formatter 配置不变。
 */
type FormatterKind = 'wallParts' | 'svDisplay' | 'dateOnly';
const FORMATTER_SPECS: Record<
  FormatterKind,
  { locale: string; keyPrefix: string; options: Intl.DateTimeFormatOptions }
> = {
  // displayedWallUtc 用：formatToParts 拆字段,含秒
  wallParts: {
    locale: 'en-US',
    keyPrefix: 'en-US|',
    options: {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  },
  // formatInTz 用：sv-SE 天然输出 `YYYY-MM-DD HH:mm`,不含秒
  svDisplay: {
    locale: 'sv-SE',
    keyPrefix: 'sv-SE|',
    options: {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  },
  // todayInTz 用：en-CA 天然输出 `YYYY-MM-DD`。
  // F43: 不复用 svDisplay 截前 10 位 —— 不含 hour 字段就彻底避开个别 ICU
  // 把午夜输出成 "24:00"(归属前一日)时日期部分跟着偏一天的边角。
  dateOnly: {
    locale: 'en-CA',
    keyPrefix: 'en-CA|',
    options: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  },
};
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
function getCachedFormatter(kind: FormatterKind, tz: string): Intl.DateTimeFormat {
  const spec = FORMATTER_SPECS[kind];
  const key = spec.keyPrefix + tz;
  let dtf = FORMATTER_CACHE.get(key);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat(spec.locale, { timeZone: tz, ...spec.options });
    FORMATTER_CACHE.set(key, dtf);
  }
  return dtf;
}

/** 求 UTC 时刻 `tsUtc` 在目标时区显示的壁钟时间（编码为 UTC ms，便于做差求偏移） */
function displayedWallUtc(tsUtc: number, tz: string): number {
  const dtf = getCachedFormatter('wallParts', tz);
  const parts = dtf.formatToParts(new Date(tsUtc));
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  // Intl 在某些区域会输出 "24" 表示 0 点,统一归一化。
  let displayedHour = parseInt(partMap.hour ?? '0', 10);
  if (displayedHour === 24) displayedHour = 0;

  return Date.UTC(
    parseInt(partMap.year ?? '0', 10),
    parseInt(partMap.month ?? '1', 10) - 1,
    parseInt(partMap.day ?? '1', 10),
    displayedHour,
    parseInt(partMap.minute ?? '0', 10),
    parseInt(partMap.second ?? '0', 10)
  );
}

/**
 * (tz, 年) 固定偏移缓存(Review P3-12)。
 * DST two-pass 修复让每次换算做两次 Intl.formatToParts(采样+验证),
 * 而 Asia/Shanghai / Asia/Hong_Kong 是固定时差时区,验证永远命中纯属白付
 * (实测 5800 行批量解析 Intl 开销 14.2ms→28.4ms 翻倍)。
 * 每 (tz, 年) 首次使用时按 1/4/7/10 月四点采样:全年偏移一致 → 缓存该偏移,
 * 后续同年行【零 Intl 调用】直接做差(比修复前的单遍还快);
 * 不一致(DST 年,如 America/New_York、Asia/Shanghai 1986-1991)→ 缓存 null,
 * 逐行走 two-pass。
 */
const FIXED_OFFSET_CACHE = new Map<string, number | null>();

function offsetAt(tsUtc: number, tz: string): number {
  return displayedWallUtc(tsUtc, tz) - tsUtc;
}

function fixedOffsetForYear(tz: string, year: number): number | null {
  const key = `${tz}|${year}`;
  let cached = FIXED_OFFSET_CACHE.get(key);
  if (cached === undefined) {
    const samples = [0, 3, 6, 9].map((month) =>
      offsetAt(Date.UTC(year, month, 1, 12), tz)
    );
    cached = samples.every((o) => o === samples[0]) ? samples[0] : null;
    FIXED_OFFSET_CACHE.set(key, cached);
  }
  return cached;
}

function wallTimeToUTC(wall: ParsedWallClock, tz: string): number {
  // 快路径:全年固定偏移的 (tz, 年) 直接做差。
  // 跨年边界(1 月 1-2 日 / 12 月 30-31 日)的真实 instant 可能落在相邻年,
  // 偏移应取相邻年的 —— 这几天保守走 two-pass(每年仅 4 天,代价可忽略)。
  const nearYearBoundary =
    (wall.month === 1 && wall.day <= 2) || (wall.month === 12 && wall.day >= 30);
  if (!nearYearBoundary) {
    const fixed = fixedOffsetForYear(tz, wall.year);
    if (fixed !== null) {
      return (
        Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second) -
        fixed
      );
    }
  }

  // 目标:找到 UTC 时刻 T,使其在 tz 显示的壁钟 == wall。
  // 记 displayed(T) 为 T 在 tz 的壁钟(UTC ms 编码),偏移 off(T) = displayed(T) - T,
  // 则解满足 T = target - off(T),用定点迭代求解。
  const target = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );

  // 第一遍:在 target 时刻采样偏移。target 与真实 T 落在 DST 切换同侧时一次即中。
  const first = 2 * target - displayedWallUtc(target, tz);
  if (displayedWallUtc(first, tz) === target) {
    return first;
  }

  // 第二遍:首遍偏移取错了切换侧(美东春令日 03:00–07:00 / 冬令日 01:00–06:00 的
  // 壁钟窗口,单遍会整体偏 1 小时),在 first 时刻重新采样偏移再算一次。
  const second = target - displayedWallUtc(first, tz) + first;
  if (displayedWallUtc(second, tz) === target) {
    return second;
  }

  // 两遍都不命中:wall 是春令跳变中不存在的壁钟时间(如美东 02:30),
  // 取首遍结果 —— 按「顺延到跳变后」语义返回(02:30 缺失 → 等同 03:30 EDT 时刻)。
  return first;
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
 * 把 parseMarketTime 的 `NaN` 结果归一化为 `null`（v2：对外契约禁止 NaN）。
 * 所有直接调用 parseMarketTime 落 `timestamp` 字段的 parser 必须经由本函数
 * （或 buildTimeMeta*），否则 NaN 会流进类型标注为 `number | null` 的字段。
 */
export function toNullableEpoch(ts: number): number | null {
  return Number.isNaN(ts) ? null : ts;
}

/**
 * 构造 `TimeMeta`。原始字符串无法解析时 `timestamp` 为 `null`。
 *
 * @param local 市场本地时间字符串
 * @param tz    市场时区
 */
export function buildTimeMeta(local: string, tz: MarketTz): TimeMeta {
  return { timestamp: toNullableEpoch(parseMarketTime(local, tz)), tz };
}

/**
 * 'YYYY-MM-DD' 加 n 个自然日（UTC 日历加法，正确处理跨月/跨年进位，
 * 不受运行环境本地时区/DST 影响）。
 * 全库唯一一份日历日加法（P3-13 收编:此前 indicatorService 与
 * eastmoney/utils 各持一份同义实现）。
 */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
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
  if (!wall) return { timestamp: null, tz };
  return { timestamp: toNullableEpoch(wallTimeToUTC(wall, tz)), tz };
}

/**
 * 把 UTC 毫秒时间戳格式化为指定时区的 `YYYY-MM-DD HH:mm` 本地壁钟字符串。
 *
 * 与 {@link parseMarketTime} 互逆：`formatInTz(parseMarketTime(s, tz), tz) === s`
 * （只要 `s` 是 `YYYY-MM-DD HH:mm` 格式）。
 *
 * 用途：当上游接口返回的时间字符串使用 A 处时区表示，但业务需要在 B 处时区显示时
 * （典型：东方财富的美股分时返回北京时间字符串，但用户需要美东时间），先用
 * `parseMarketTime(s, MARKET_TZ.CN)` 拿到正确 epoch，再用本函数转成目标时区字符串。
 *
 * 使用 `Intl.DateTimeFormat` 处理夏令时；epoch 为 `NaN` 时返回空串。
 */
export function formatInTz(epoch: number | null, tz: MarketTz): string {
  if (epoch == null || !Number.isFinite(epoch)) return '';
  // 用 sv-SE locale 直接 format —— sv-SE 天然以 `YYYY-MM-DD HH:mm:ss` 形式输出，
  // 比 formatToParts + 手动拼接更稳健（避免某些 Node ICU 实现里 minute 字段
  // 携带额外冒号后缀的怪异行为）。
  const formatted = getCachedFormatter('svDisplay', tz).format(new Date(epoch));
  // sv-SE 输出可能是 "2024-05-12 09:30" 或 "2024-05-12 09:30:00"，截到分钟即可。
  // 同时把可能出现的 "24:" 归一化为 "00:"
  const match = formatted.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return formatted;
  const hour = match[2] === '24' ? '00' : match[2];
  return `${match[1]} ${hour}:${match[3]}`;
}

/**
 * 取某一 UTC 时刻在指定市场时区下的"当日日期"字符串（`YYYY-MM-DD`）。
 *
 * F43: 收编此前散落各处的"北京时间今天"手写实现 —— 手动 `+8h` UTC 算术
 * (topicData)、本地时区 `getFullYear()`(fund,跨年 ±1 真 bug)、每次调用
 * 重建 `Intl.DateTimeFormat`(tradingCalendarService) —— 统一走本模块的
 * FORMATTER_CACHE,夏令时(美东)由 Intl 正确处理。
 *
 * @param tz    市场时区(使用 `MARKET_TZ`)
 * @param epoch UTC unix 毫秒时间戳,默认取 `Date.now()`(当前时刻)
 *
 * @example
 * todayInTz(MARKET_TZ.CN);                       // 北京时间今天,如 '2026-06-11'
 * todayInTz(MARKET_TZ.US, 1764547200000);        // 指定时刻的美东日期
 * todayInTz(MARKET_TZ.CN).replace(/-/g, '');     // 需要 'YYYYMMDD' 时由调用方去横线
 */
export function todayInTz(tz: MarketTz, epoch: number = Date.now()): string {
  return getCachedFormatter('dateOnly', tz).format(new Date(epoch));
}
