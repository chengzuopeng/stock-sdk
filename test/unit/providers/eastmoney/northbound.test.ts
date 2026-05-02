import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';

// push2.eastmoney.com 由 fallback 路由到 17/29/79/91 前缀变体
const MINUTE_URL = 'https://*.push2.eastmoney.com/api/qt/kamtbs.rtmin/get';
const DATACENTER_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

describe('Northbound - getNorthboundMinute', () => {
  const sdk = new StockSDK();

  it('parses north-bound (s2n) data with date conversion', async () => {
    server.use(
      http.get(MINUTE_URL, () =>
        HttpResponse.json({
          data: {
            s2n: [
              '09:30,1000,,2000,,3000,,,,',
              '09:31,1500,,2500,,4000,,,,',
            ],
            s2nDate: '20240115',
          },
        })
      )
    );

    const result = await sdk.getNorthboundMinute('north');
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2024-01-15');
    expect(result[0].time).toBe('09:30');
    expect(result[0].shanghaiNetInflow).toBe(1000);
    expect(result[0].shenzhenNetInflow).toBe(2000);
    expect(result[0].totalNetInflow).toBe(3000);
  });

  it('parses south-bound (n2s) data when direction=south', async () => {
    server.use(
      http.get(MINUTE_URL, () =>
        HttpResponse.json({
          data: {
            n2s: ['09:30,500,,600,,1100,,,,'],
            n2sDate: '2024-01-15',
            s2n: ['09:30,9999,,9999,,9999,,,,'],
            s2nDate: '2024-01-15',
          },
        })
      )
    );

    const result = await sdk.getNorthboundMinute('south');
    expect(result[0].shanghaiNetInflow).toBe(500);
    expect(result[0].totalNetInflow).toBe(1100);
  });

  it('returns empty array when API has no data', async () => {
    server.use(
      http.get(MINUTE_URL, () => HttpResponse.json({ data: null }))
    );
    const result = await sdk.getNorthboundMinute();
    expect(result).toEqual([]);
  });
});

describe('Northbound - getNorthboundFlowSummary', () => {
  const sdk = new StockSDK();

  it('maps datacenter response to summary objects', async () => {
    server.use(
      http.get(DATACENTER_URL, () =>
        HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                TRADE_DATE: '2024-01-15 00:00:00',
                MUTUAL_TYPE: '001',
                MUTUAL_TYPE_NAME: '沪股通',
                FUNDS_DIRECTION: '北向资金',
                INDEX_CODE: '000001',
                INDEX_NAME: '上证指数',
                status: '已收盘',
                netBuyAmt: 1000000000,
                dayNetAmtIn: 1500000000,
                dayAmtRemain: 50000000000,
                f104: 1500,
                f105: 800,
                f106: 200,
                INDEX_f3: 1.2,
              },
            ],
          },
        })
      )
    );

    const result = await sdk.getNorthboundFlowSummary();
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-15');
    expect(result[0].boardName).toBe('沪股通');
    expect(result[0].direction).toBe('北向资金');
    expect(result[0].netBuyAmount).toBe(1000000000);
    expect(result[0].upCount).toBe(1500);
    expect(result[0].downCount).toBe(800);
    expect(result[0].indexChangePercent).toBe(1.2);
  });
});

describe('Northbound - getNorthboundHoldingRank', () => {
  const sdk = new StockSDK();

  it('builds correct filter for shanghai market and 5-day period', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).toContain('(INTERVAL_TYPE="5")');
        expect(filter).toContain('(MUTUAL_TYPE="001")');
        return HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                TRADE_DATE: '2024-01-15',
                SECURITY_CODE: '600519',
                SECURITY_NAME: '贵州茅台',
                CLOSE_PRICE: 1700.5,
                CHANGE_RATE: 2.13,
                HOLD_SHARES: 12345678,
                HOLD_MARKET_CAP: 21000000000,
                HOLD_RATIO: 1.0,
                A_SHARES_RATIO: 0.98,
                ADD_SHARES: 100000,
                ADD_MARKET_CAP: 170000000,
                ADD_MARKET_CAP_PROPORTION: 0.5,
                BOARD_NAME: '白酒',
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getNorthboundHoldingRank({
      market: 'shanghai',
      period: '5day',
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('600519');
    expect(result[0].name).toBe('贵州茅台');
    expect(result[0].sector).toBe('白酒');
  });

  it('omits MUTUAL_TYPE filter when market=all', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).not.toContain('MUTUAL_TYPE');
        return HttpResponse.json({
          result: { pages: 1, count: 0, data: [] },
        });
      })
    );

    await sdk.getNorthboundHoldingRank({ market: 'all', period: '5day' });
  });
});

describe('Northbound - getNorthboundIndividual', () => {
  const sdk = new StockSDK();

  it('strips exchange prefix from symbol when building filter', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).toContain('(SECURITY_CODE="600519")');
        return HttpResponse.json({
          result: { pages: 1, count: 0, data: [] },
        });
      })
    );

    await sdk.getNorthboundIndividual('sh600519');
  });
});
