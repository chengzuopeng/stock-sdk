import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';

const FFLOW_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';
// push2.eastmoney.com 不在 fallback 池中，请求会被路由到 17/29/79/91 前缀，
// 这里使用通配符匹配所有 push2.eastmoney.com 衍生 host
const CLIST_URL = 'https://*.push2.eastmoney.com/api/qt/clist/get';

describe('FundFlow - getIndividualFundFlow', () => {
  const sdk = new StockSDK();

  it('parses klines into structured fund flow', async () => {
    server.use(
      http.get(FFLOW_URL, ({ request }) => {
        const url = new URL(request.url);
        const secid = url.searchParams.get('secid');
        expect(secid).toBe('1.600519');
        return HttpResponse.json({
          data: {
            klines: [
              '2024-01-15,1234567,200000,300000,400000,500000,1.5,0.1,0.2,0.3,0.5,1700.5,2.13,0,0',
              '2024-01-16,2345678,250000,350000,450000,550000,1.7,0.15,0.25,0.35,0.55,1736.7,2.13,0,0',
            ],
          },
        });
      })
    );

    const result = await sdk.getIndividualFundFlow('sh600519');
    expect(result).toHaveLength(2);

    const first = result[0];
    expect(first.date).toBe('2024-01-15');
    expect(first.mainNetInflow).toBe(1234567);
    expect(first.smallNetInflow).toBe(200000);
    expect(first.mediumNetInflow).toBe(300000);
    expect(first.largeNetInflow).toBe(400000);
    expect(first.superLargeNetInflow).toBe(500000);
    expect(first.mainNetInflowPercent).toBe(1.5);
    expect(first.close).toBe(1700.5);
    expect(first.changePercent).toBe(2.13);
  });

  it('returns empty array when API returns no klines', async () => {
    server.use(
      http.get(FFLOW_URL, () => HttpResponse.json({ data: { klines: [] } }))
    );

    const result = await sdk.getIndividualFundFlow('600000');
    expect(result).toEqual([]);
  });

  it('throws on invalid period', async () => {
    await expect(
      sdk.getIndividualFundFlow('600000', { period: 'yearly' as never })
    ).rejects.toThrow(/Invalid period/);
  });
});

describe('FundFlow - getMarketFundFlow', () => {
  const sdk = new StockSDK();

  it('parses dual-index market klines', async () => {
    server.use(
      http.get(FFLOW_URL, () =>
        HttpResponse.json({
          data: {
            klines: [
              '2024-01-15,1000000000,200000,300000,400000,500000,1.5,0.1,0.2,0.3,0.5,3000.5,1.5,1800.2,1.8',
            ],
          },
        })
      )
    );

    const result = await sdk.getMarketFundFlow();
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-15');
    expect(result[0].shClose).toBe(3000.5);
    expect(result[0].shChangePercent).toBe(1.5);
    expect(result[0].szClose).toBe(1800.2);
    expect(result[0].szChangePercent).toBe(1.8);
    expect(result[0].mainNetInflow).toBe(1000000000);
  });
});

describe('FundFlow - getFundFlowRank', () => {
  const sdk = new StockSDK();

  it('parses today rank items', async () => {
    server.use(
      http.get(CLIST_URL, () =>
        HttpResponse.json({
          data: {
            total: 1,
            diff: [
              {
                f12: '600519',
                f14: '贵州茅台',
                f2: 1700.5,
                f3: 2.13,
                f62: 1234567,
                f184: 1.5,
                f66: 500000,
                f69: 0.5,
                f72: 400000,
                f75: 0.4,
                f78: 300000,
                f81: 0.3,
                f84: 200000,
                f87: 0.2,
              },
            ],
          },
        })
      )
    );

    const result = await sdk.getFundFlowRank({ indicator: 'today' });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('600519');
    expect(result[0].name).toBe('贵州茅台');
    expect(result[0].price).toBe(1700.5);
    expect(result[0].changePercent).toBe(2.13);
    expect(result[0].mainNetInflow).toBe(1234567);
    expect(result[0].mainNetInflowPercent).toBe(1.5);
    expect(result[0].superLargeNetInflow).toBe(500000);
  });

  it('parses 5-day indicator with different field set', async () => {
    server.use(
      http.get(CLIST_URL, () =>
        HttpResponse.json({
          data: {
            total: 1,
            diff: [
              {
                f12: '000001',
                f14: '平安银行',
                f2: 12.34,
                f109: 5.6,    // 5日涨跌幅
                f164: 7777,   // 5日主力净额
                f165: 1.0,
                f166: 3000,
                f167: 0.5,
                f168: 2000,
                f169: 0.4,
                f170: 1500,
                f171: 0.3,
                f172: 1000,
                f173: 0.2,
              },
            ],
          },
        })
      )
    );

    const result = await sdk.getFundFlowRank({ indicator: '5day' });
    expect(result[0].changePercent).toBe(5.6);
    expect(result[0].mainNetInflow).toBe(7777);
  });
});

describe('FundFlow - getSectorFundFlowRank', () => {
  const sdk = new StockSDK();

  it('returns sector items with top stock info', async () => {
    server.use(
      http.get(CLIST_URL, ({ request }) => {
        const url = new URL(request.url);
        // 行业板块 fs 默认参数
        expect(url.searchParams.get('fs')).toBe('m:90+t:2');
        return HttpResponse.json({
          data: {
            total: 1,
            diff: [
              {
                f12: 'BK0438',
                f14: '银行',
                f3: 1.2,
                f62: 5000000,
                f184: 0.8,
                f66: 2000000,
                f72: 1500000,
                f78: 1000000,
                f84: 500000,
                f204: '601398',
                f205: '工商银行',
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getSectorFundFlowRank({
      indicator: 'today',
      sectorType: 'industry',
    });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BK0438');
    expect(result[0].name).toBe('银行');
    expect(result[0].topStockCode).toBe('601398');
    expect(result[0].topStockName).toBe('工商银行');
  });
});

describe('FundFlow - getSectorFundFlowHistory', () => {
  const sdk = new StockSDK();

  it('uses 90.<symbol> secid format for sectors', async () => {
    server.use(
      http.get(FFLOW_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('secid')).toBe('90.BK0438');
        return HttpResponse.json({
          data: {
            klines: [
              '2024-01-15,1000,100,200,300,400,1.0,0.1,0.2,0.3,0.4,3000,1.0,0,0',
            ],
          },
        });
      })
    );

    const result = await sdk.getSectorFundFlowHistory('BK0438');
    expect(result).toHaveLength(1);
    expect(result[0].mainNetInflow).toBe(1000);
  });

  it('accepts already-prefixed secid', async () => {
    server.use(
      http.get(FFLOW_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('secid')).toBe('90.BK0500');
        return HttpResponse.json({ data: { klines: [] } });
      })
    );

    const result = await sdk.getSectorFundFlowHistory('90.BK0500');
    expect(result).toEqual([]);
  });
});
