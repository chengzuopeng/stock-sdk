import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';

const DATACENTER_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

describe('BlockTrade - getBlockTradeMarketStat', () => {
  const sdk = new StockSDK();

  it('parses market summary response', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('reportName')).toBe('PRT_BLOCKTRADE_MARKET_STA');
        return HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                TRADE_DATE: '2024-01-15 00:00:00',
                CLOSE_PRICE: 3000,
                CHANGE_RATE: 1.2,
                TURNOVER: 5000000000,
                PREMIUM_TURNOVER: 1000000000,
                PREMIUM_RATIO: 20,
                DISCOUNT_TURNOVER: 4000000000,
                DISCOUNT_RATIO: 80,
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getBlockTradeMarketStat();
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-15');
    expect(result[0].shClose).toBe(3000);
    expect(result[0].totalAmount).toBe(5000000000);
    expect(result[0].premiumRatio).toBe(20);
  });
});

describe('BlockTrade - getBlockTradeDetail', () => {
  const sdk = new StockSDK();

  it('builds date filter from options', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).toContain("(TRADE_DATE>='2024-01-01')");
        expect(filter).toContain("(TRADE_DATE<='2024-01-31')");
        return HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                SECURITY_CODE: '600519',
                SECURITY_NAME_ABBR: '贵州茅台',
                TRADE_DATE: '2024-01-15',
                CLOSE_PRICE: 1700.5,
                CHANGE_RATE: 2.0,
                DEAL_PRICE: 1650,
                DEAL_VOLUME: 100000,
                DEAL_AMT: 165000000,
                PREMIUM_RATIO: -2.97,
                BUYER_DEPT: '某机构 A',
                SELLER_DEPT: '某机构 B',
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getBlockTradeDetail({
      startDate: '20240101',
      endDate: '20240131',
    });
    expect(result).toHaveLength(1);
    expect(result[0].dealPrice).toBe(1650);
    expect(result[0].premiumRate).toBe(-2.97);
    expect(result[0].buyBranch).toBe('某机构 A');
    expect(result[0].sellBranch).toBe('某机构 B');
  });
});
