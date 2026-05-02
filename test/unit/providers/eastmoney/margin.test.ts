import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';

const DATACENTER_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

describe('Margin - getMarginAccountInfo', () => {
  const sdk = new StockSDK();

  it('parses margin account daily statistics', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('reportName')).toBe('RPTA_WEB_MARGIN_DAILYTRADE');
        return HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                STATISTICS_DATE: '2024-01-15 00:00:00',
                FIN_BALANCE: 1500000000000,
                LOAN_BALANCE: 100000000000,
                FIN_BUY_AMT: 50000000000,
                LOAN_SELL_AMT: 5000000000,
                OPERATE_INVESTOR_NUM: 6000000,
                MARGIN_INVESTOR_NUM: 5500000,
                TOTAL_GUARANTEE: 9000000000000,
                AVG_GUARANTEE_RATIO: 280,
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getMarginAccountInfo();
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-15');
    expect(result[0].finBalance).toBe(1500000000000);
    expect(result[0].loanBalance).toBe(100000000000);
    expect(result[0].avgGuaranteeRatio).toBe(280);
    expect(result[0].investorCount).toBe(6000000);
  });
});

describe('Margin - getMarginTargetList', () => {
  const sdk = new StockSDK();

  it('uses TRADE_DATE filter when date provided', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') ?? '';
        expect(filter).toBe("(TRADE_DATE='2024-01-15')");
        return HttpResponse.json({
          result: { pages: 1, count: 0, data: [] },
        });
      })
    );

    await sdk.getMarginTargetList('2024-01-15');
  });

  it('omits filter when no date provided', async () => {
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('filter')).toBeNull();
        return HttpResponse.json({
          result: {
            pages: 1,
            count: 1,
            data: [
              {
                SECURITY_CODE: '600519',
                SECURITY_NAME_ABBR: '贵州茅台',
                TRADE_DATE: '2024-01-15',
                FIN_BALANCE: 5000000000,
                FIN_BUY_AMT: 100000000,
                FIN_REPAY_AMT: 80000000,
                LOAN_BALANCE: 100000,
                LOAN_SELL_VOLUME: 5000,
                LOAN_REPAY_VOLUME: 3000,
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getMarginTargetList();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('600519');
    expect(result[0].finBalance).toBe(5000000000);
  });
});
