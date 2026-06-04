import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestClient } from '../../../../src/core';
import {
  getHKMinuteKline,
  getUSMinuteKline,
} from '../../../../src/providers/eastmoney';

// 关掉 retry 避免 500 测试触发 backoff
const client = new RequestClient({ retry: { maxRetries: 0 } });

// 模拟 push2his kline/get 的 CSV 行：date,open,close,high,low,volume,amount,amplitude,changePercent,change,turnoverRate
const sampleKline =
  '2024-12-30 14:30,100.00,101.50,102.00,99.80,1234567,123456789.00,2.20,1.50,1.50,0.55';

// 模拟 push2his trends2/get 的 trend 行：time,open,close,high,low,volume,amount,avgPrice
const sampleTrend =
  '2024-12-30 09:30,100.00,100.10,100.50,99.90,5000,500000,100.05';

describe('getHKMinuteKline', () => {
  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  function stub(payload: object) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  it('builds secid=116.{pureSymbol} from numeric code', async () => {
    stub({ data: { klines: [sampleKline] } });
    await getHKMinuteKline(client, '00700', { period: '5' });
    expect(lastUrl).toContain('33.push2his.eastmoney.com/api/qt/stock/kline/get');
    expect(lastUrl).toContain('secid=116.00700');
    expect(lastUrl).toContain('klt=5');
  });

  it('strips hk prefix and pads short codes to 5 digits', async () => {
    stub({ data: { klines: [sampleKline] } });
    await getHKMinuteKline(client, 'hk700', { period: '15' });
    expect(lastUrl).toContain('secid=116.00700');
    expect(lastUrl).toContain('klt=15');
  });

  it("uses trends2 endpoint with default ndays=1 (single-day timeline) when period='1'", async () => {
    stub({ data: { trends: [sampleTrend] } });
    await getHKMinuteKline(client, '00700');
    expect(lastUrl).toContain('33.push2his.eastmoney.com/api/qt/stock/trends2/get');
    expect(lastUrl).toContain('ndays=1');
  });

  it('honors options.ndays for multi-day timeline', async () => {
    stub({ data: { trends: [sampleTrend] } });
    await getHKMinuteKline(client, '00700', { ndays: 5 });
    expect(lastUrl).toContain('ndays=5');
  });

  it('maps 5-min kline fields with HKD currency + tz + code', async () => {
    stub({ data: { klines: [sampleKline] } });
    const rows = await getHKMinuteKline(client, '00700', { period: '5' });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.time).toBe('2024-12-30 14:30');
    expect(r.open).toBe(100);
    expect(r.close).toBe(101.5);
    expect(r.high).toBe(102);
    expect(r.low).toBe(99.8);
    expect(r.volume).toBe(1234567);
    expect(r.changePercent).toBe(1.5);
    expect((r as { currency: string }).currency).toBe('HKD');
    expect((r as { code: string }).code).toBe('00700');
    expect(r.tz).toBe('Asia/Hong_Kong');
  });

  it('maps 1-min timeline fields with HKD + avgPrice', async () => {
    stub({ data: { trends: [sampleTrend] } });
    const rows = await getHKMinuteKline(client, '00700');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.time).toBe('2024-12-30 09:30');
    expect((r as { avgPrice: number }).avgPrice).toBe(100.05);
    expect((r as { currency: string }).currency).toBe('HKD');
    expect(r.tz).toBe('Asia/Hong_Kong');
  });

  it('returns empty array on empty payload', async () => {
    stub({ data: { trends: [] } });
    const rows = await getHKMinuteKline(client, '00700');
    expect(rows).toEqual([]);
  });

  it('filters by startDate / endDate window', async () => {
    const lines = [
      '2024-12-30 09:30,1,1,1,1,1,1,1',
      '2024-12-30 10:30,2,2,2,2,2,2,2',
      '2024-12-30 14:30,3,3,3,3,3,3,3',
    ];
    stub({ data: { trends: lines } });
    const rows = await getHKMinuteKline(client, '00700', {
      startDate: '2024-12-30 10:00',
      endDate: '2024-12-30 12:00',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe('2024-12-30 10:30');
  });

  it('includes the whole end day when endDate is date-only (trends/1-min)', async () => {
    // 用户传 'YYYY-MM-DD'（无时间）不应把当天分钟行整天过滤掉
    const lines = [
      '2024-12-30 09:30,1,1,1,1,1,1,1',
      '2024-12-30 14:30,3,3,3,3,3,3,3',
    ];
    stub({ data: { trends: lines } });
    const rows = await getHKMinuteKline(client, '00700', {
      startDate: '2024-12-30',
      endDate: '2024-12-30',
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].time).toBe('2024-12-30 14:30');
  });

  it('includes the whole end day when endDate is date-only (5-min kline)', async () => {
    stub({
      data: {
        klines: [
          '2024-12-30 09:35,1,1,1,1,1,1,1,1,1,1',
          '2024-12-30 14:30,3,3,3,3,3,3,3,3,3,3',
        ],
      },
    });
    const rows = await getHKMinuteKline(client, '00700', {
      period: '5',
      startDate: '2024-12-30',
      endDate: '2024-12-30',
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].time).toBe('2024-12-30 14:30');
  });
});

describe('getUSMinuteKline', () => {
  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  function stub(payload: object) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  it('passes pre-prefixed secid through (e.g. 105.AAPL)', async () => {
    stub({ data: { klines: [sampleKline] } });
    await getUSMinuteKline(client, '105.AAPL', { period: '5' });
    expect(lastUrl).toContain('63.push2his.eastmoney.com/api/qt/stock/kline/get');
    expect(lastUrl).toContain('secid=105.AAPL');
    expect(lastUrl).toContain('klt=5');
  });

  it("uses 63.push2his trends2 endpoint when period='1'", async () => {
    stub({ data: { trends: [sampleTrend] } });
    await getUSMinuteKline(client, '106.BABA');
    expect(lastUrl).toContain('63.push2his.eastmoney.com/api/qt/stock/trends2/get');
    expect(lastUrl).toContain('secid=106.BABA');
  });

  it('extracts code from secid.split(".") and sets USD currency + NY tz', async () => {
    stub({ data: { klines: [sampleKline] } });
    const rows = await getUSMinuteKline(client, '105.AAPL', { period: '60' });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect((r as { currency: string }).currency).toBe('USD');
    expect((r as { code: string }).code).toBe('AAPL');
    expect(r.tz).toBe('America/New_York');
  });

  it('maps trends2 fields correctly for 1-min', async () => {
    stub({ data: { trends: [sampleTrend] } });
    const rows = await getUSMinuteKline(client, '105.AAPL');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect((r as { avgPrice: number }).avgPrice).toBe(100.05);
    expect((r as { currency: string }).currency).toBe('USD');
  });

  it('returns empty array on missing data', async () => {
    stub({});
    const rows = await getUSMinuteKline(client, '105.AAPL');
    expect(rows).toEqual([]);
  });

  it('defaults ndays=1 (single-day timeline) for trends2 and honors options.ndays', async () => {
    stub({ data: { trends: [sampleTrend] } });
    await getUSMinuteKline(client, '105.AAPL');
    expect(lastUrl).toContain('ndays=1');
    vi.unstubAllGlobals();

    stub({ data: { trends: [sampleTrend] } });
    await getUSMinuteKline(client, '105.AAPL', { ndays: 5 });
    expect(lastUrl).toContain('ndays=5');
  });

  it('converts Beijing-time upstream string to NY-time (1-min trends, DST May)', async () => {
    // 上游 trends 返回的是北京时间字符串："2026-05-26 21:30" 对应 NYC 09:30 (EDT, UTC-4)
    // 修复前：把 21:30 当 NYC 解析 → timestamp 偏 12 小时；修复后：time 显示 09:30
    stub({
      data: {
        trends: [
          '2026-05-26 21:30,309.4,309.7,309.83,309.4,578929,179689536,310.38',
        ],
      },
    });
    const rows = await getUSMinuteKline(client, '105.AAPL');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.time).toBe('2026-05-26 09:30');
    expect(r.tz).toBe('America/New_York');
    // timestamp 应该对应 UTC 2026-05-26T13:30:00 (NYC 09:30 EDT = UTC 13:30)
    expect(r.timestamp).toBe(Date.UTC(2026, 4, 26, 13, 30));
    expect(r.avgPrice).toBe(310.38);
  });

  it('converts Beijing-time upstream string to NY-time (5-min kline, DST May)', async () => {
    // 5 分钟 K 线的 date 字段同样是北京时间字符串
    stub({
      data: {
        klines: [
          '2026-05-26 21:35,310.0,310.5,310.6,309.8,1234567,123456789,0.3,0.2,0.6,0.5',
        ],
      },
    });
    const rows = await getUSMinuteKline(client, '105.AAPL', { period: '5' });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.time).toBe('2026-05-26 09:35');
    expect(r.timestamp).toBe(Date.UTC(2026, 4, 26, 13, 35));
  });

  it('filters by NY-local startDate/endDate (user-facing semantics)', async () => {
    // 模拟同一天 3 个时间点（北京时间 21:30 / 22:30 / 02:00 次日）
    // → NYC: 09:30 / 10:30 / 14:00 同日（夏令时）
    stub({
      data: {
        trends: [
          '2026-05-26 21:30,1,1,1,1,1,1,1',
          '2026-05-26 22:30,2,2,2,2,2,2,2',
          '2026-05-27 02:00,3,3,3,3,3,3,3',
        ],
      },
    });
    const rows = await getUSMinuteKline(client, '105.AAPL', {
      startDate: '2026-05-26 10:00',
      endDate: '2026-05-26 12:00',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe('2026-05-26 10:30');
  });
});
