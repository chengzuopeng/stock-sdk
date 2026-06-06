import { describe, it, expect, vi } from 'vitest';
import { TradingCalendarService } from '../../../src/sdk/tradingCalendarService';
import type { QuoteService } from '../../../src/sdk/quoteService';
import { InvalidArgumentError } from '../../../src/core';

/**
 * 用一个最小 fake QuoteService 来驱动 TradingCalendarService 的测试,
 * 避免真实发请求。
 */
function makeFakeQuote(calendar: string[]): QuoteService {
  return {
    getTradingCalendar: vi.fn().mockResolvedValue(calendar),
  } as unknown as QuoteService;
}

describe('TradingCalendarService', () => {
  // 模拟 2024 年国庆假期前后的交易日
  const calendar = [
    '2024-09-26',
    '2024-09-27',
    '2024-09-30',
    // 10-01 ~ 10-07 是国庆假期
    '2024-10-08',
    '2024-10-09',
    '2024-10-10',
    '2024-10-11',
    '2024-10-14',
  ];

  describe('isTradingDay', () => {
    it('returns true for a known trading day', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.isTradingDay('2024-09-30')).toBe(true);
      expect(await svc.isTradingDay('2024-10-08')).toBe(true);
    });

    it('returns false for a holiday', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.isTradingDay('2024-10-01')).toBe(false);
      expect(await svc.isTradingDay('2024-10-05')).toBe(false);
    });

    it('returns false for a weekend', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.isTradingDay('2024-10-12')).toBe(false); // Sat
      expect(await svc.isTradingDay('2024-10-13')).toBe(false); // Sun
    });

    it('accepts YYYYMMDD format', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.isTradingDay('20240930')).toBe(true);
      expect(await svc.isTradingDay('20241001')).toBe(false);
    });

    it('accepts Date object', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      // 2024-09-30 09:00 UTC = 2024-09-30 17:00 CN  → CN 当日 = 2024-09-30
      const d = new Date('2024-09-30T09:00:00Z');
      expect(await svc.isTradingDay(d)).toBe(true);
    });

    it('throws for unparseable string', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      await expect(svc.isTradingDay('not a date')).rejects.toThrow(/Unsupported date input/);
    });
  });

  describe('nextTradingDay', () => {
    it('jumps to the next trading day when target is a trading day', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.nextTradingDay('2024-09-30')).toBe('2024-10-08');
    });

    it('returns the first trading day after a holiday', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.nextTradingDay('2024-10-03')).toBe('2024-10-08');
    });

    it('throws InvalidArgumentError when target exceeds calendar range', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      await expect(svc.nextTradingDay('2024-12-31')).rejects.toThrow(
        InvalidArgumentError
      );
    });
  });

  describe('prevTradingDay', () => {
    it('jumps to the previous trading day when target is a trading day', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.prevTradingDay('2024-10-08')).toBe('2024-09-30');
    });

    it('returns the last trading day before a holiday', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      expect(await svc.prevTradingDay('2024-10-05')).toBe('2024-09-30');
    });

    it('throws InvalidArgumentError when target is earlier than calendar start', async () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      await expect(svc.prevTradingDay('2020-01-01')).rejects.toThrow(
        InvalidArgumentError
      );
    });
  });

  describe('getMarketStatus - A share (Asia/Shanghai)', () => {
    const svc = new TradingCalendarService(makeFakeQuote(calendar));

    // 用 UTC 构造一个明确对应 Asia/Shanghai 壁钟时间的 Date
    // CN = UTC + 8h
    const cnAt = (h: number, m: number, weekday: 'Mon' | 'Sat' = 'Mon') => {
      // 2024-05-13 是周一,2024-05-18 是周六
      const dateStr = weekday === 'Mon' ? '2024-05-13' : '2024-05-18';
      const utcHour = h - 8;
      // 处理跨日
      const dayOffset = utcHour < 0 ? -1 : 0;
      const realUtcHour = (utcHour + 24) % 24;
      const day = parseInt(dateStr.slice(8, 10), 10) + dayOffset;
      const dayStr = String(day).padStart(2, '0');
      return new Date(
        `${dateStr.slice(0, 8)}${dayStr}T${String(realUtcHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`
      );
    };

    it('returns "pre_market" before 09:30', () => {
      expect(svc.getMarketStatus('A', cnAt(9, 0))).toBe('pre_market');
      expect(svc.getMarketStatus('A', cnAt(9, 29))).toBe('pre_market');
    });

    it('returns "open" during 09:30-11:30', () => {
      expect(svc.getMarketStatus('A', cnAt(9, 30))).toBe('open');
      expect(svc.getMarketStatus('A', cnAt(10, 0))).toBe('open');
      expect(svc.getMarketStatus('A', cnAt(11, 29))).toBe('open');
    });

    it('returns "lunch_break" during 11:30-13:00', () => {
      expect(svc.getMarketStatus('A', cnAt(11, 30))).toBe('lunch_break');
      expect(svc.getMarketStatus('A', cnAt(12, 0))).toBe('lunch_break');
      expect(svc.getMarketStatus('A', cnAt(12, 59))).toBe('lunch_break');
    });

    it('returns "open" during 13:00-15:00', () => {
      expect(svc.getMarketStatus('A', cnAt(13, 0))).toBe('open');
      expect(svc.getMarketStatus('A', cnAt(14, 30))).toBe('open');
      expect(svc.getMarketStatus('A', cnAt(14, 59))).toBe('open');
    });

    it('returns "after_hours" after 15:00', () => {
      expect(svc.getMarketStatus('A', cnAt(15, 0))).toBe('after_hours');
      expect(svc.getMarketStatus('A', cnAt(20, 0))).toBe('after_hours');
    });

    it('returns "closed" on weekends', () => {
      expect(svc.getMarketStatus('A', cnAt(10, 0, 'Sat'))).toBe('closed');
    });
  });

  describe('getMarketStatus - HK (Asia/Hong_Kong)', () => {
    const svc = new TradingCalendarService(makeFakeQuote(calendar));

    // HK 也是 UTC+8
    const hkAt = (h: number, m: number) => {
      const utcHour = h - 8;
      const dayOffset = utcHour < 0 ? -1 : 0;
      const realUtcHour = (utcHour + 24) % 24;
      const day = 13 + dayOffset; // 2024-05-13 周一
      const dayStr = String(day).padStart(2, '0');
      return new Date(
        `2024-05-${dayStr}T${String(realUtcHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`
      );
    };

    it('treats 09:30-12:00 as open', () => {
      expect(svc.getMarketStatus('HK', hkAt(10, 0))).toBe('open');
    });

    it('treats 12:00-13:00 as lunch_break', () => {
      expect(svc.getMarketStatus('HK', hkAt(12, 30))).toBe('lunch_break');
    });

    it('treats 13:00-16:00 as open', () => {
      expect(svc.getMarketStatus('HK', hkAt(15, 0))).toBe('open');
    });

    it('treats > 16:00 as after_hours', () => {
      expect(svc.getMarketStatus('HK', hkAt(16, 30))).toBe('after_hours');
    });
  });

  describe('getMarketStatus - US (America/New_York)', () => {
    const svc = new TradingCalendarService(makeFakeQuote(calendar));

    it('returns "open" at 10:00 EDT (DST)', () => {
      // 2024-07-15 (Mon) 10:00 EDT = 14:00 UTC
      const d = new Date('2024-07-15T14:00:00Z');
      expect(svc.getMarketStatus('US', d)).toBe('open');
    });

    it('returns "open" at 10:00 EST (no DST)', () => {
      // 2024-01-15 (Mon) 10:00 EST = 15:00 UTC
      const d = new Date('2024-01-15T15:00:00Z');
      expect(svc.getMarketStatus('US', d)).toBe('open');
    });

    it('returns "pre_market" at 09:00 EDT', () => {
      // 2024-07-15 09:00 EDT = 13:00 UTC
      const d = new Date('2024-07-15T13:00:00Z');
      expect(svc.getMarketStatus('US', d)).toBe('pre_market');
    });

    it('returns "after_hours" at 17:00 EDT', () => {
      // 2024-07-15 17:00 EDT = 21:00 UTC
      const d = new Date('2024-07-15T21:00:00Z');
      expect(svc.getMarketStatus('US', d)).toBe('after_hours');
    });

    it('does not classify lunch_break for US (no break)', () => {
      // US 12:30 EDT 应该是 open,不是午休
      const d = new Date('2024-07-15T16:30:00Z'); // 12:30 EDT
      expect(svc.getMarketStatus('US', d)).toBe('open');
    });

    it('returns "closed" on weekends', () => {
      // 2024-07-13 (Sat) 12:00 EDT
      const d = new Date('2024-07-13T16:00:00Z');
      expect(svc.getMarketStatus('US', d)).toBe('closed');
    });
  });

  describe('getMarketStatus - default market', () => {
    it('defaults to A share when market is omitted', () => {
      const svc = new TradingCalendarService(makeFakeQuote(calendar));
      // 周一 10:00 CN = 02:00 UTC,A 股 open
      const d = new Date('2024-05-13T02:00:00Z');
      expect(svc.getMarketStatus()).toBeDefined();
      expect(svc.getMarketStatus(undefined, d)).toBe('open');
    });
  });
});
