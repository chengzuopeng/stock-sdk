import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';

const DATACENTER_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

describe('DragonTiger - getDragonTigerDetail', () => {
  const sdk = new StockSDK();

  it('builds date filter and parses detail rows', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).toContain("(TRADE_DATE>='2023-04-03')");
        expect(filter).toContain("(TRADE_DATE<='2023-04-17')");
        const reportName = url.searchParams.get('reportName');
        expect(reportName).toBe('RPT_DAILYBILLBOARD_DETAILSNEW');
        return HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                SECURITY_CODE: '600519',
                SECURITY_NAME_ABBR: '贵州茅台',
                TRADE_DATE: '2023-04-15 00:00:00',
                CLOSE_PRICE: 1700.5,
                CHANGE_RATE: 5.5,
                BILLBOARD_NET_AMT: 100000000,
                BILLBOARD_BUY_AMT: 500000000,
                BILLBOARD_SELL_AMT: 400000000,
                BILLBOARD_DEAL_AMT: 900000000,
                ACCUM_AMOUNT: 8000000000,
                DEAL_NET_RATIO: 1.25,
                DEAL_AMOUNT_RATIO: 11.25,
                TURNOVERRATE: 0.5,
                FREE_MARKET_CAP: 2100000000000,
                EXPLANATION: '日涨幅偏离值达 7%',
                D1_CLOSE_ADJCHRATE: 1.2,
                D2_CLOSE_ADJCHRATE: 2.1,
                D5_CLOSE_ADJCHRATE: -0.5,
                D10_CLOSE_ADJCHRATE: 3.3,
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getDragonTigerDetail({
      startDate: '20230403',
      endDate: '20230417',
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('600519');
    expect(result[0].date).toBe('2023-04-15');
    expect(result[0].close).toBe(1700.5);
    expect(result[0].netBuyAmount).toBe(100000000);
    expect(result[0].reason).toBe('日涨幅偏离值达 7%');
    expect(result[0].afterChange1d).toBe(1.2);
  });
});

describe('DragonTiger - getDragonTigerStockStats', () => {
  const sdk = new StockSDK();

  it('uses STATISTICS_CYCLE filter mapped from period', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).toBe('(STATISTICS_CYCLE="02")');
        return HttpResponse.json({
          result: { pages: 1, count: 0, data: [] },
        });
      })
    );

    await sdk.getDragonTigerStockStats('3month');
  });

  it('throws on invalid period', async () => {
    await expect(
      sdk.getDragonTigerStockStats('5year' as never)
    ).rejects.toThrow(/Invalid period/);
  });
});

describe('DragonTiger - getDragonTigerStockSeatDetail', () => {
  const sdk = new StockSDK();

  it('merges buy and sell side seats with correct side flag', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const reportName = url.searchParams.get('reportName');
        if (reportName === 'RPT_BILLBOARD_DAILYDETAILSBUY') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  RANK: 1,
                  OPERATEDEPT_NAME: '某营业部 A',
                  BUY_AMT_REAL: 100000000,
                  BUY_RATIO_TOTAL: 5.0,
                  SELL_AMT_REAL: 0,
                  SELL_RATIO_TOTAL: 0,
                  NET_AMT: 100000000,
                },
              ],
            },
          });
        }
        if (reportName === 'RPT_BILLBOARD_DAILYDETAILSSELL') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  RANK: 1,
                  OPERATEDEPT_NAME: '某营业部 B',
                  BUY_AMT_REAL: 0,
                  BUY_RATIO_TOTAL: 0,
                  SELL_AMT_REAL: 80000000,
                  SELL_RATIO_TOTAL: 4.0,
                  NET_AMT: -80000000,
                },
              ],
            },
          });
        }
        return HttpResponse.json({ result: { pages: 1, count: 0, data: [] } });
      })
    );

    const result = await sdk.getDragonTigerStockSeatDetail('600519', '2023-04-15');
    expect(result).toHaveLength(2);
    expect(result[0].side).toBe('buy');
    expect(result[0].buyAmount).toBe(100000000);
    expect(result[1].side).toBe('sell');
    expect(result[1].sellAmount).toBe(80000000);
  });
});
