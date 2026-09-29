import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';
import { InvalidArgumentError } from '../../../../src/core';

const FFLOW_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';
const REALTIME_FFLOW_URL = 'https://push2delay.eastmoney.com/api/qt/stock/get';
const CLIST_URL = 'https://*.push2.eastmoney.com/api/qt/clist/get';

describe('FundFlow - getRealtimeFundFlow', () => {
  const sdk = new StockSDK();

  it('parses Eastmoney realtime flow and preserves the legacy FundFlow units', async () => {
    server.use(
      http.get(REALTIME_FFLOW_URL, ({ request }) => {
        const secid = new URL(request.url).searchParams.get('secid');
        expect(['1.601899', '0.000938']).toContain(secid);
        const data =
          secid === '1.601899'
            ? {
                f48: 100_000_000,
                f57: '601899',
                f58: '紫金矿业',
                f86: 1715679000,
                f135: 30_000_000,
                f136: 10_000_000,
                f137: 20_000_000,
                f147: 8_000_000,
                f148: 12_000_000,
                f149: -4_000_000,
              }
            : {
                f48: 50_000_000,
                f57: '000938',
                f58: '紫光股份',
                f86: 1715679000,
                f135: 5_000_000,
                f136: 7_000_000,
                f137: -2_000_000,
                f147: 2_000_000,
                f148: 1_000_000,
                f149: 1_000_000,
              };
        return HttpResponse.json({ data });
      })
    );

    const result = await sdk.quotes.fundFlow(['601899', '000938']);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      code: '601899',
      name: '紫金矿业',
      mainInflow: 3000,
      mainOutflow: 1000,
      mainNet: 2000,
      mainNetRatio: 20,
      retailInflow: 800,
      retailOutflow: 1200,
      retailNet: -400,
      retailNetRatio: -4,
      totalFlow: 10000,
      date: '20240514',
    });
    expect(result[0].timestamp).toBe(1715679000000);
    expect(result[0].tz).toBe('Asia/Shanghai');
  });

  it('skips codes with no Eastmoney realtime payload', async () => {
    server.use(http.get(REALTIME_FFLOW_URL, () => HttpResponse.json({ data: null })));
    await expect(sdk.quotes.fundFlow(['601899'])).resolves.toEqual([]);
  });
});

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

    const result = await sdk.fundFlow.individual('sh600519');
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

    const result = await sdk.fundFlow.individual('600000');
    expect(result).toEqual([]);
  });

  it('throws on invalid period', async () => {
    await expect(
      sdk.fundFlow.individual('600000', { period: 'yearly' as never })
    ).rejects.toThrow(/Invalid period/);
  });

  // 特殊指数无个股资金流数据:统一 InvalidArgumentError,请求前 fail-fast
  it.each(['930955', 'H30533', 'HSHCI', 'GDAXI', '124.HSHCI', '100.GDAXI', '2.930955'])(
    'rejects special index %s with a uniform InvalidArgumentError before any request',
    async (code) => {
      await expect(sdk.fundFlow.individual(code)).rejects.toThrow(
        /Individual fund flow is not available for index symbols/
      );
    }
  );

  it('exchange-hosted index secid still passes the guard (endpoint serves them)', async () => {
    server.use(
      http.get(FFLOW_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('secid')).toBe('1.000001');
        return HttpResponse.json({ data: { klines: [] } });
      })
    );
    // '1.000001'(上证指数,交易所宿主 secid)不应被特殊指数守卫拦截
    await expect(sdk.fundFlow.individual('1.000001')).resolves.toEqual([]);
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

    const result = await sdk.fundFlow.market();
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

    const result = await sdk.fundFlow.rank({ indicator: 'today' });
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

    const result = await sdk.fundFlow.rank({ indicator: '5day' });
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

    const result = await sdk.fundFlow.sectorRank({
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

describe('FundFlow - rank / sectorRank 分页 (#65)', () => {
  interface ClistCall {
    pn: string | null;
    pz: string | null;
    fs: string | null;
  }

  /** 按 pn / pz 回满页(上游按主力净流入降序),记录每次请求参数 */
  function mockClist(total: number): ClistCall[] {
    const calls: ClistCall[] = [];
    server.use(
      http.get(CLIST_URL, ({ request }) => {
        const url = new URL(request.url);
        const pn = Number(url.searchParams.get('pn'));
        const pz = Number(url.searchParams.get('pz'));
        calls.push({
          pn: url.searchParams.get('pn'),
          pz: url.searchParams.get('pz'),
          fs: url.searchParams.get('fs'),
        });
        const offset = (pn - 1) * pz;
        const size = Math.max(0, Math.min(pz, total - offset));
        return HttpResponse.json({
          data: {
            total,
            diff: Array.from({ length: size }, (_, i) => ({
              f12: String(600000 + offset + i),
              f14: `股票${offset + i}`,
              f62: total - offset - i,
            })),
          },
        });
      })
    );
    return calls;
  }

  it('rank 传 page + pageSize 只请求该页,不再翻页拉全量', async () => {
    const calls = mockClist(5600);
    const result = await new StockSDK().fundFlow.rank({ page: 2, pageSize: 20 });
    expect(calls.map((c) => [c.pn, c.pz])).toEqual([['2', '20']]);
    expect(result).toHaveLength(20);
    expect(result[0].code).toBe('600020');
    expect(result[19].code).toBe('600039');
  });

  it('只传 page 时 pageSize 默认 100;只传 pageSize 时 page 默认 1', async () => {
    const calls = mockClist(5600);
    const sdk = new StockSDK();
    expect(await sdk.fundFlow.rank({ indicator: '5day', page: 3 })).toHaveLength(100);
    expect(await sdk.fundFlow.rank({ pageSize: 10 })).toHaveLength(10);
    expect(calls.map((c) => [c.pn, c.pz])).toEqual([
      ['3', '100'],
      ['1', '10'],
    ]);
  });

  it('不传分页参数时仍自动翻页返回全量(默认行为不变)', async () => {
    const calls = mockClist(150);
    const result = await new StockSDK().fundFlow.rank();
    expect(result).toHaveLength(150);
    expect(calls.map((c) => [c.pn, c.pz])).toEqual([
      ['1', '100'],
      ['2', '100'],
    ]);
  });

  it('越界页(上游空 diff 或 data:null)返回空数组', async () => {
    const calls = mockClist(150);
    const sdk = new StockSDK();
    expect(await sdk.fundFlow.rank({ page: 9 })).toEqual([]);
    expect(calls).toHaveLength(1);

    server.use(http.get(CLIST_URL, () => HttpResponse.json({ data: null })));
    expect(await sdk.fundFlow.rank({ page: 99 })).toEqual([]);
  });

  it('非法分页参数(含 pageSize 超上游单页上限 100)在请求前抛 InvalidArgumentError', async () => {
    const calls = mockClist(5600);
    const sdk = new StockSDK();
    await expect(sdk.fundFlow.rank({ pageSize: 200 })).rejects.toThrow(
      /fundFlow\.rank: pageSize 需为 1-100 的整数/
    );
    await expect(sdk.fundFlow.rank({ page: 0 })).rejects.toThrow(InvalidArgumentError);
    await expect(sdk.fundFlow.sectorRank({ page: 1.5 })).rejects.toThrow(
      /fundFlow\.sectorRank: page/
    );
    expect(calls).toHaveLength(0);
  });

  it('sectorRank 同样只请求指定页(板块维度 fs 不受影响)', async () => {
    const calls = mockClist(480);
    const result = await new StockSDK().fundFlow.sectorRank({
      sectorType: 'concept',
      page: 1,
      pageSize: 10,
    });
    expect(calls).toEqual([{ pn: '1', pz: '10', fs: 'm:90+t:3' }]);
    expect(result).toHaveLength(10);
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

    const result = await sdk.fundFlow.sectorHistory('BK0438');
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

    const result = await sdk.fundFlow.sectorHistory('90.BK0500');
    expect(result).toEqual([]);
  });
});
