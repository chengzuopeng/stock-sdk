import { describe, it, expect } from 'vitest';
import {
  parseFullQuote,
  parseHKQuote,
  parseUSQuote,
  parseFundQuote,
  parseFundFlow,
} from '../../../../src/providers/tencent/parsers';

/**
 * 这些用例聚焦 v1.9.1 新增的 `timestamp` + `tz` 字段。
 * 字段位置参考 `parsers.ts` 中的索引 (f[30] 是行情时间)。
 */
describe('tencent parsers - timestamp & tz enrichment', () => {
  describe('parseFullQuote', () => {
    it('attaches Asia/Shanghai timestamp from f[30]', () => {
      // 仅填充必要字段:索引 0..30 用占位,其他为空。
      const f: string[] = new Array(80).fill('');
      f[0] = '1';
      f[1] = '贵州茅台';
      f[2] = '600519';
      f[30] = '20240512143015';

      const quote = parseFullQuote(f);
      expect(quote.time).toBe('20240512143015');
      expect(quote.tz).toBe('Asia/Shanghai');
      // 14:30:15 CN = 06:30:15 UTC
      expect(new Date(quote.timestamp).toISOString()).toBe(
        '2024-05-12T06:30:15.000Z'
      );
    });

    it('keeps tz when time is empty (timestamp = null)', () => {
      const f: string[] = new Array(80).fill('');
      f[2] = '600519';
      // f[30] 留空
      const quote = parseFullQuote(f);
      expect(quote.tz).toBe('Asia/Shanghai');
      expect(quote.timestamp).toBeNull();
    });
  });

  describe('parseHKQuote', () => {
    it('attaches Asia/Hong_Kong timestamp', () => {
      const f: string[] = new Array(50).fill('');
      f[0] = '100';
      f[1] = '腾讯控股';
      f[2] = '00700';
      f[30] = '20240512143015';
      // currency 在数组末尾倒数第 3 位
      f[47] = 'HKD';

      const quote = parseHKQuote(f);
      expect(quote.tz).toBe('Asia/Hong_Kong');
      // HK 也是 UTC+8
      expect(new Date(quote.timestamp).toISOString()).toBe(
        '2024-05-12T06:30:15.000Z'
      );
    });
  });

  describe('parseUSQuote', () => {
    it('attaches America/New_York timestamp during DST (UTC-4)', () => {
      const f: string[] = new Array(50).fill('');
      f[0] = '200';
      f[1] = 'APPLE';
      f[2] = 'AAPL';
      f[30] = '20240715143015'; // 7 月 = 夏令时

      const quote = parseUSQuote(f);
      expect(quote.tz).toBe('America/New_York');
      // 14:30:15 EDT = 18:30:15 UTC (UTC-4)
      expect(new Date(quote.timestamp).toISOString()).toBe(
        '2024-07-15T18:30:15.000Z'
      );
    });

    it('attaches America/New_York timestamp during EST (UTC-5)', () => {
      const f: string[] = new Array(50).fill('');
      f[2] = 'AAPL';
      f[30] = '20240115143015'; // 1 月 = 非夏令时

      const quote = parseUSQuote(f);
      // 14:30:15 EST = 19:30:15 UTC (UTC-5)
      expect(new Date(quote.timestamp).toISOString()).toBe(
        '2024-01-15T19:30:15.000Z'
      );
    });
  });

  describe('parseFundQuote', () => {
    it('attaches Asia/Shanghai timestamp from navDate (f[8])', () => {
      const f: string[] = new Array(20).fill('');
      f[0] = '110011';
      f[1] = '易方达中小盘';
      f[5] = '3.5';
      f[8] = '2024-05-10';

      const quote = parseFundQuote(f);
      expect(quote.tz).toBe('Asia/Shanghai');
      // 净值日期 2024-05-10 → 当日 00:00 CN = 前一日 16:00 UTC
      expect(new Date(quote.timestamp).toISOString()).toBe(
        '2024-05-09T16:00:00.000Z'
      );
    });
  });

  describe('parseFundFlow', () => {
    it('attaches Asia/Shanghai timestamp from date (f[13])', () => {
      const f: string[] = new Array(20).fill('');
      f[0] = '600519';
      f[12] = '贵州茅台';
      f[13] = '2024-05-12';

      const flow = parseFundFlow(f);
      expect(flow.tz).toBe('Asia/Shanghai');
      expect(new Date(flow.timestamp).toISOString()).toBe(
        '2024-05-11T16:00:00.000Z'
      );
    });
  });
});
