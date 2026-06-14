/**
 * F45 分钟K线工厂收编回归
 *
 * A/HK/US 三处的行为契约已由 hkUsMinuteKline.test / perf-request.test(F34)/
 * flag-wiring.test(F9)/ edge-fixes.test(F21)覆盖;本文件补两块此前没有
 * 单测锁定的行为:
 * - 板块分钟K线(fetchBoardMinuteKline):无 ut token、fqt 固定 '1'、
 *   全量 beg/end、无窗口过滤、简化行形态(无 timestamp/tz)
 * - A 股工厂化后的细节:5 分钟行保留 date 字段(spread 行为)、
 *   分时 ndays 固定 '5' 不读 options
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestClient } from '../../../../src/core';
import { fetchBoardMinuteKline } from '../../../../src/providers/eastmoney/boardCommon';
import { getMinuteKline } from '../../../../src/providers/eastmoney/aShareKline';

function captureClient(payload: object) {
  const urls: string[] = [];
  const client = {
    get: vi.fn(async (url: string) => {
      urls.push(url);
      return payload;
    }),
  } as unknown as RequestClient;
  return { client, urls };
}

const KLINE_URL = 'https://example.com/api/qt/stock/kline/get';
const TRENDS_URL = 'https://example.com/api/qt/stock/trends2/get';

describe('fetchBoardMinuteKline(F45 工厂接入)', () => {
  it('默认 period=5:走 kline 接口,fqt=1、全量 beg/end、带 smplmt/lmt、无 ut', async () => {
    const { client, urls } = captureClient({
      data: {
        klines: ['2024-12-30 14:30,1,2,3,0.5,100,1000,2,1.5,0.5,0.8'],
      },
    });
    const rows = await fetchBoardMinuteKline(
      client,
      'BK0475',
      KLINE_URL,
      TRENDS_URL
    );

    expect(urls[0]).toContain(KLINE_URL);
    expect(urls[0]).toContain('secid=90.BK0475');
    expect(urls[0]).toContain('klt=5');
    expect(urls[0]).toContain('fqt=1');
    expect(urls[0]).toContain('beg=0');
    expect(urls[0]).toContain('end=20500101');
    expect(urls[0]).toContain('smplmt=10000');
    expect(urls[0]).toContain('lmt=1000000');
    // 板块接口不带 ut token(与收编前一致)
    expect(urls[0]).not.toContain('ut=');

    expect(rows).toHaveLength(1);
    // 简化行形态:无 timestamp/tz/currency,键序与收编前一致
    expect(Object.keys(rows[0])).toEqual([
      'time',
      'open',
      'close',
      'high',
      'low',
      'changePercent',
      'change',
      'volume',
      'amount',
      'amplitude',
      'turnoverRate',
    ]);
    expect(rows[0]).toEqual({
      time: '2024-12-30 14:30',
      open: 1,
      close: 2,
      high: 3,
      low: 0.5,
      changePercent: 1.5,
      change: 0.5,
      volume: 100,
      amount: 1000,
      amplitude: 2,
      turnoverRate: 0.8,
    });
  });

  it('period=1:走 trends 接口,ndays=1、无 ut,行带 price 字段', async () => {
    const { client, urls } = captureClient({
      data: {
        trends: [
          '2024-12-30 09:30,1,2,3,0.5,100,1000,1.5',
          '2024-12-30 09:31,1.1,2.1,3.1,0.6,110,1100,1.6',
        ],
      },
    });
    const rows = await fetchBoardMinuteKline(
      client,
      'BK0475',
      KLINE_URL,
      TRENDS_URL,
      { period: '1' }
    );

    expect(urls[0]).toContain(TRENDS_URL);
    expect(urls[0]).toContain('secid=90.BK0475');
    expect(urls[0]).toContain('ndays=1');
    expect(urls[0]).toContain('iscr=0');
    expect(urls[0]).not.toContain('ut=');

    // 板块无 startDate/endDate 选项 → 全量返回,不做窗口过滤
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      time: '2024-12-30 09:30',
      open: 1,
      close: 2,
      high: 3,
      low: 0.5,
      volume: 100,
      amount: 1000,
      price: 1.5,
    });
  });

  it('空数据返回 []', async () => {
    const { client } = captureClient({ data: {} });
    expect(
      await fetchBoardMinuteKline(client, 'BK0475', KLINE_URL, TRENDS_URL)
    ).toEqual([]);
    expect(
      await fetchBoardMinuteKline(client, 'BK0475', KLINE_URL, TRENDS_URL, {
        period: '1',
      })
    ).toEqual([]);
  });
});

describe('getMinuteKline(F45 工厂化后的 A 股细节)', () => {
  it('5 分钟行保留 date 字段(spread 行为,与收编前一致)', async () => {
    const { client } = captureClient({
      data: {
        klines: ['2025-06-01 09:35,10,10.1,10.2,9.9,100,1000,2,1,1,0.5'],
      },
    });
    const rows = (await getMinuteKline(client, '600519', {
      period: '5',
    })) as Array<{ time: string; date?: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe('2025-06-01 09:35');
    expect(rows[0].date).toBe('2025-06-01 09:35');
  });

  it('分时 ndays 固定 5,不读 options 里混入的 ndays', async () => {
    const { client, urls } = captureClient({
      data: { trends: ['2025-06-01 09:31,10,10.1,10.2,9.9,100,1000,10.05'] },
    });
    await getMinuteKline(client, '600519', {
      period: '1',
      ...({ ndays: 9 } as object),
    });
    expect(urls[0]).toContain('ndays=5');
  });
});
