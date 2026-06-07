import { describe, it, expect } from 'vitest';
import {
  MARKET_TZ,
  parseMarketTime,
  buildTimeMeta,
  buildTimeMetaFromDateAndTime,
  formatInTz as formatInTzMinuteOnly,
} from '../../../src/core/time';

/**
 * 验证 UTC 时间戳能反向格式化回预期的"市场本地壁钟时间",
 * 用来确认时区换算正确。
 */
function formatInTz(ts: number, tz: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(ts));
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = p.value;
  // en-CA 偶尔会把 24 输出为 00,这里按小时归一化
  let hour = m.hour ?? '00';
  if (hour === '24') hour = '00';
  return `${m.year}-${m.month}-${m.day} ${hour}:${m.minute}:${m.second}`;
}

describe('core/time', () => {
  describe('parseMarketTime', () => {
    it('parses YYYY-MM-DD HH:mm:ss as Asia/Shanghai', () => {
      const ts = parseMarketTime('2024-05-12 09:30:00', MARKET_TZ.CN);
      expect(formatInTz(ts, MARKET_TZ.CN)).toBe('2024-05-12 09:30:00');
      // CN 固定 UTC+8 → 09:30 CN = 01:30 UTC
      expect(new Date(ts).toISOString()).toBe('2024-05-12T01:30:00.000Z');
    });

    it('parses YYYY-MM-DD HH:mm as Asia/Shanghai', () => {
      const ts = parseMarketTime('2024-05-12 09:30', MARKET_TZ.CN);
      expect(formatInTz(ts, MARKET_TZ.CN)).toBe('2024-05-12 09:30:00');
    });

    it('parses YYYY-MM-DD as Asia/Shanghai 00:00', () => {
      const ts = parseMarketTime('2024-05-12', MARKET_TZ.CN);
      expect(formatInTz(ts, MARKET_TZ.CN)).toBe('2024-05-12 00:00:00');
    });

    it('parses yyyyMMddHHmmss (Tencent quote format) as Asia/Shanghai', () => {
      const ts = parseMarketTime('20240512093015', MARKET_TZ.CN);
      expect(formatInTz(ts, MARKET_TZ.CN)).toBe('2024-05-12 09:30:15');
    });

    it('parses yyyyMMdd as Asia/Shanghai 00:00', () => {
      const ts = parseMarketTime('20240512', MARKET_TZ.CN);
      expect(formatInTz(ts, MARKET_TZ.CN)).toBe('2024-05-12 00:00:00');
    });

    it('parses Hong Kong wall time (UTC+8 always)', () => {
      const ts = parseMarketTime('2024-05-12 09:30:00', MARKET_TZ.HK);
      expect(new Date(ts).toISOString()).toBe('2024-05-12T01:30:00.000Z');
    });

    it('parses US wall time during EDT (DST, UTC-4)', () => {
      // 2024-07-15 是夏令时期间,EDT = UTC-4
      const ts = parseMarketTime('2024-07-15 09:30:00', MARKET_TZ.US);
      expect(new Date(ts).toISOString()).toBe('2024-07-15T13:30:00.000Z');
      expect(formatInTz(ts, MARKET_TZ.US)).toBe('2024-07-15 09:30:00');
    });

    it('parses US wall time during EST (no DST, UTC-5)', () => {
      // 2024-01-15 不是夏令时,EST = UTC-5
      const ts = parseMarketTime('2024-01-15 09:30:00', MARKET_TZ.US);
      expect(new Date(ts).toISOString()).toBe('2024-01-15T14:30:00.000Z');
      expect(formatInTz(ts, MARKET_TZ.US)).toBe('2024-01-15 09:30:00');
    });

    it('returns NaN for empty string', () => {
      expect(parseMarketTime('', MARKET_TZ.CN)).toBeNaN();
    });

    it('returns NaN for unrecognized format', () => {
      expect(parseMarketTime('not a date', MARKET_TZ.CN)).toBeNaN();
      expect(parseMarketTime('2024/05/12', MARKET_TZ.CN)).toBeNaN();
    });
  });

  describe('buildTimeMeta', () => {
    it('returns timestamp + tz together', () => {
      const meta = buildTimeMeta('20240512093015', MARKET_TZ.CN);
      expect(meta.tz).toBe('Asia/Shanghai');
      expect(new Date(meta.timestamp).toISOString()).toBe(
        '2024-05-12T01:30:15.000Z'
      );
    });

    it('keeps tz even when timestamp is null', () => {
      const meta = buildTimeMeta('', MARKET_TZ.HK);
      expect(meta.tz).toBe('Asia/Hong_Kong');
      expect(meta.timestamp).toBeNull();
    });
  });

  describe('buildTimeMetaFromDateAndTime', () => {
    it('combines YYYY-MM-DD with HH:mm', () => {
      const meta = buildTimeMetaFromDateAndTime(
        '2024-05-12',
        '09:30',
        MARKET_TZ.CN
      );
      expect(new Date(meta.timestamp).toISOString()).toBe(
        '2024-05-12T01:30:00.000Z'
      );
    });

    it('combines YYYY-MM-DD with HH:mm:ss', () => {
      const meta = buildTimeMetaFromDateAndTime(
        '2024-05-12',
        '09:30:45',
        MARKET_TZ.CN
      );
      expect(new Date(meta.timestamp).toISOString()).toBe(
        '2024-05-12T01:30:45.000Z'
      );
    });

    it('returns null when date or time invalid', () => {
      expect(
        buildTimeMetaFromDateAndTime('', '09:30', MARKET_TZ.CN).timestamp
      ).toBeNull();
      expect(
        buildTimeMetaFromDateAndTime('2024-05-12', 'bad', MARKET_TZ.CN).timestamp
      ).toBeNull();
    });
  });

  describe('formatInTz', () => {
    // 注意：本文件顶部已有同名 local helper `formatInTz`（输出带秒），
    // 这里用 alias `formatInTzMinuteOnly` 引用 src 的 export 版本（仅到分钟）。
    it('formats epoch in Asia/Shanghai (round-trip)', () => {
      const epoch = parseMarketTime('2024-05-12 09:30', MARKET_TZ.CN);
      expect(formatInTzMinuteOnly(epoch, MARKET_TZ.CN)).toBe('2024-05-12 09:30');
    });

    it('round-trips through HK (HKT == CST, no offset)', () => {
      const epoch = parseMarketTime('2024-05-12 09:30', MARKET_TZ.HK);
      expect(formatInTzMinuteOnly(epoch, MARKET_TZ.HK)).toBe('2024-05-12 09:30');
    });

    it('converts Beijing-time epoch to NYC during DST (UTC-4)', () => {
      // 2026-05-26 21:30 CST  ==  2026-05-26 09:30 EDT
      const epoch = parseMarketTime('2026-05-26 21:30', MARKET_TZ.CN);
      expect(formatInTzMinuteOnly(epoch, MARKET_TZ.US)).toBe('2026-05-26 09:30');
    });

    it('converts Beijing-time epoch to NYC during standard time (UTC-5)', () => {
      // 2026-01-15 22:30 CST  ==  2026-01-15 09:30 EST
      const epoch = parseMarketTime('2026-01-15 22:30', MARKET_TZ.CN);
      expect(formatInTzMinuteOnly(epoch, MARKET_TZ.US)).toBe('2026-01-15 09:30');
    });

    it('handles cross-day boundaries (NYC ahead-of-UTC, behind-of-CST)', () => {
      // 2026-05-27 04:00 CST  ==  2026-05-26 16:00 EDT  (跨日)
      const epoch = parseMarketTime('2026-05-27 04:00', MARKET_TZ.CN);
      expect(formatInTzMinuteOnly(epoch, MARKET_TZ.US)).toBe('2026-05-26 16:00');
    });

    it('returns empty string for NaN epoch', () => {
      expect(formatInTzMinuteOnly(NaN, MARKET_TZ.US)).toBe('');
    });

    it('zero-pads single-digit month/day/hour/minute', () => {
      // 2024-01-05 03:07 in Shanghai
      const epoch = parseMarketTime('2024-01-05 03:07', MARKET_TZ.CN);
      expect(formatInTzMinuteOnly(epoch, MARKET_TZ.CN)).toBe('2024-01-05 03:07');
    });
  });
});
