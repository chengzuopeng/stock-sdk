import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractJsonFromJsonp } from '../../../../src/core/jsonp';

describe('Sina Option - Parsing', () => {
  describe('Index Option T-Quote parsing', () => {
    it('should parse call (up) rows with 9 fields', () => {
      const raw = `/*<script></script>*/\ncb({"result":{"status":{"code":0},"data":{"up":[["10","3250.0","3255.0","3260.0","20","500","5.0","3200","io2504C3200"]],"down":[["15","100.0","105.0","110.0","25","300","-3.0","io2504P3200"]]}}})`;
      const data = extractJsonFromJsonp(raw) as {
        result: { data: { up: string[][]; down: string[][] } };
      };

      expect(data.result.data.up).toHaveLength(1);
      const callRow = data.result.data.up[0];
      expect(callRow[0]).toBe('10');
      expect(callRow[7]).toBe('3200');
      expect(callRow[8]).toBe('io2504C3200');

      expect(data.result.data.down).toHaveLength(1);
      const putRow = data.result.data.down[0];
      expect(putRow[7]).toBe('io2504P3200');
    });

    it('should handle empty data', () => {
      const raw = `/**/\ncb({"result":{"status":{"code":0},"data":{"up":[],"down":[]}}})`;
      const data = extractJsonFromJsonp(raw) as {
        result: { data: { up: string[][]; down: string[][] } };
      };
      expect(data.result.data.up).toEqual([]);
      expect(data.result.data.down).toEqual([]);
    });
  });

  describe('Option Kline parsing', () => {
    it('should parse kline items', () => {
      const raw = `/**/\ncb([{"o":"305.2000","h":"305.2000","l":"293.4000","c":"293.4000","v":"6","d":"2025-01-20"},{"o":"286.0000","h":"289.0000","l":"286.0000","c":"286.0000","v":"10","d":"2025-01-21"}])`;
      const data = extractJsonFromJsonp(raw) as { d: string; o: string; c: string }[];
      expect(data).toHaveLength(2);
      expect(data[0].d).toBe('2025-01-20');
      expect(data[0].o).toBe('305.2000');
      expect(data[1].c).toBe('286.0000');
    });

    it('should handle null response for non-existent contract', () => {
      const raw = `/**/\ncb(null)`;
      const data = extractJsonFromJsonp(raw);
      expect(data).toBeNull();
    });
  });

  describe('ETF Option Month parsing', () => {
    it('should parse month list response', () => {
      const raw = `/**/\ncb({"result":{"status":{"code":0},"data":{"cateList":["50ETF","300ETF"],"contractMonth":["2026-03","2026-03","2026-04","2026-06"],"stockId":"510050","cateId":"510050C2603A02700"}}})`;
      const data = extractJsonFromJsonp(raw) as {
        result: { data: { contractMonth: string[]; stockId: string } };
      };
      const months = data.result.data.contractMonth;
      expect(months.slice(1)).toEqual(['2026-03', '2026-04', '2026-06']);
      expect(data.result.data.stockId).toBe('510050');
    });
  });

  describe('ETF Option Expire Day parsing', () => {
    it('should parse expire day response', () => {
      const raw = `/**/\ncb({"result":{"status":{"code":0},"data":{"expireDay":"2026-03-25","remainderDays":12,"stockId":"510050","other":{"name":"华夏上证50ETF"}}}})`;
      const data = extractJsonFromJsonp(raw) as {
        result: { data: { expireDay: string; remainderDays: number } };
      };
      expect(data.result.data.expireDay).toBe('2026-03-25');
      expect(data.result.data.remainderDays).toBe(12);
    });
  });

  describe('ETF Option Minute parsing', () => {
    it('should parse minute items with date propagation', () => {
      const raw = `/**/\ncb({"result":{"status":{"code":0},"data":[{"i":"09:30:00","p":"0.0610","v":"38","t":"2220","a":"0.0613","d":"2026-03-13"},{"i":"09:31:00","p":"0.1011","v":"32","t":"3682","a":"0.0812"}]}})`;
      const data = extractJsonFromJsonp(raw) as {
        result: { data: { i: string; d?: string }[] };
      };
      expect(data.result.data).toHaveLength(2);
      expect(data.result.data[0].d).toBe('2026-03-13');
      expect(data.result.data[1].d).toBeUndefined();
    });
  });

  describe('ETF Option 5-Day Minute parsing', () => {
    it('should parse nested day arrays', () => {
      const raw = `/**/\ncb({"result":{"status":{"code":0},"data":[[{"i":"09:30:00","p":"0.4","v":"11","t":"1292","a":"0.4133","d":"2026-03-09"}],[{"i":"09:30:00","p":"0.38","v":"5","t":"1300","a":"0.38","d":"2026-03-10"}]]}})`;
      const data = extractJsonFromJsonp(raw) as {
        result: { data: { i: string; d?: string }[][] };
      };
      expect(data.result.data).toHaveLength(2);
      expect(data.result.data[0][0].d).toBe('2026-03-09');
      expect(data.result.data[1][0].d).toBe('2026-03-10');
    });
  });
});

describe('Sina Option - Constants', () => {
  it('COMMODITY_OPTION_MAP should have expected entries', async () => {
    const { COMMODITY_OPTION_MAP } = await import('../../../../src/core/constants');
    expect(COMMODITY_OPTION_MAP['au']).toEqual({ product: 'au_o', exchange: 'shfe' });
    expect(COMMODITY_OPTION_MAP['SR']).toEqual({ product: 'SR_o', exchange: 'czce' });
    expect(COMMODITY_OPTION_MAP['m']).toEqual({ product: 'm_o', exchange: 'dce' });
    expect(COMMODITY_OPTION_MAP['sc']).toEqual({ product: 'sc_o', exchange: 'ine' });
  });

  it('CFFEX_OPTION_PRODUCT_MAP should have 3 products', async () => {
    const { CFFEX_OPTION_PRODUCT_MAP } = await import('../../../../src/core/constants');
    expect(Object.keys(CFFEX_OPTION_PRODUCT_MAP)).toHaveLength(3);
    expect(CFFEX_OPTION_PRODUCT_MAP['io']).toBe('沪深300');
  });
});
