/**
 * stock-node-sdk 真实上游集成测试（需 RUN_INTEGRATION=1 触发）。
 * 严格遵循「数据源准入与上游实测」铁律，逐源实测验证解析正确性。
 */
import { describe, expect, it } from 'vitest';
import { StockNodeSDK } from '../../src/sdk';
import { NodeHttpClient } from '../../src/transport/nodeHttpClient';

const sdk = new StockNodeSDK({ timeout: 15_000, retry: { maxRetries: 1, baseDelay: 300 } });

describe('stock-node-sdk 真实上游多源实测', () => {
  it('quotes.cn 三源实测（tencent / sina / eastmoney）均返回规范 FullQuote', async () => {
    for (const source of ['tencent', 'sina', 'eastmoney'] as const) {
      const { data, trace } = await sdk.withMeta(() =>
        sdk.quotes.cn(['600519'], { source })
      );
      expect(trace?.selectedProvider).toBe(source);
      expect(data.length).toBe(1);
      expect(data[0].code).toBe('600519');
      expect(data[0].price).toBeGreaterThan(0);
      expect(data[0].source).toBe(source);
    }
  });

  it('quotes.hk 与 quotes.us 多源实测', async () => {
    const hkSina = await sdk.quotes.hk(['00700'], { source: 'sina' });
    expect(hkSina[0].code).toBe('00700');
    expect(hkSina[0].price).toBeGreaterThan(0);

    const hkEm = await sdk.quotes.hk(['00700'], { source: 'eastmoney' });
    expect(hkEm[0].code).toBe('00700');
    expect(hkEm[0].price).toBeGreaterThan(0);

    const usSina = await sdk.quotes.us(['AAPL'], { source: 'sina' });
    expect(usSina[0].code).toBe('AAPL');
    expect(usSina[0].price).toBeGreaterThan(0);
  });

  it('kline.hk 与 kline.us 腾讯备源实测', async () => {
    const hk = await sdk.kline.hk(
      '00700',
      { startDate: '20260501', endDate: '20260531' },
      { source: 'tencent' }
    );
    expect(hk.length).toBeGreaterThan(0);
    expect(hk[0].currency).toBe('HKD');

    const us = await sdk.kline.us(
      'AAPL',
      { startDate: '20260501', endDate: '20260531' },
      { source: 'tencent' }
    );
    expect(us.length).toBeGreaterThan(0);
    expect(us[0].currency).toBe('USD');
  });

  it('腾讯 A 股前复权在跨除权的重叠区间内一致', async () => {
    const route = { source: 'tencent' } as const;
    const early = await sdk.kline.cn('600519', {
      startDate: '2023-12-01', endDate: '2023-12-29', adjust: 'qfq',
    }, route);
    const across = await sdk.kline.cn('600519', {
      startDate: '2023-12-01', endDate: '2024-12-31', adjust: 'qfq',
    }, route);
    expect(early.length).toBeGreaterThan(10);
    expect(across.length).toBeGreaterThan(early.length);
    expect(across.filter((bar) => bar.date <= '2023-12-29').map(({ date, close }) => ({ date, close })))
      .toEqual(early.map(({ date, close }) => ({ date, close })));
  });

  it('news.flash 双源实测（eastmoney & sina）与 news.announcements 双源实测（eastmoney & cninfo）', async () => {
    const emFlash = await sdk.news.flash({ pageSize: 3 }, { source: 'eastmoney' });
    expect(emFlash.length).toBeGreaterThan(0);
    expect(emFlash[0].source).toBe('eastmoney');

    const sinaFlash = await sdk.news.flash({ pageSize: 3 }, { source: 'sina' });
    expect(sinaFlash.length).toBeGreaterThan(0);
    expect(sinaFlash[0].source).toBe('sina');

    const emAnn = await sdk.news.announcements(
      { symbol: '600519', pageSize: 3 },
      { source: 'eastmoney' }
    );
    expect(emAnn.length).toBeGreaterThan(0);
    expect(emAnn[0].code).toBe('600519');

    const cninfoAnn = await sdk.news.announcements({ pageSize: 3 }, { source: 'cninfo' });
    expect(cninfoAnn.length).toBeGreaterThan(0);
    expect(cninfoAnn[0].source).toBe('cninfo');
  });

  it('financial / corporate / bond 真实上游实测', async () => {
    const [ind, income, balance, cashflow, forecast, express, holders, count, bonds] =
      await Promise.all([
        sdk.financial.indicators('600519', { pageSize: 2 }),
        sdk.financial.income('600519', { pageSize: 2 }),
        sdk.financial.balance('600519', { pageSize: 2 }),
        sdk.financial.cashflow('600519', { pageSize: 2 }),
        sdk.financial.forecast({ pageSize: 2 }),
        sdk.financial.express({ pageSize: 2 }),
        sdk.corporate.topHolders('600519', { pageSize: 3 }),
        sdk.corporate.holderCount('600519', { pageSize: 2 }),
        sdk.bond.convertibleList({ pageSize: 2 }),
      ]);

    expect(ind.length).toBeGreaterThan(0);
    expect(ind[0].eps).not.toBeNull();
    expect(income.length).toBeGreaterThan(0);
    expect(income[0].totalRevenue).not.toBeNull();
    expect(balance.length).toBeGreaterThan(0);
    expect(balance[0].totalAssets).not.toBeNull();
    expect(cashflow.length).toBeGreaterThan(0);
    expect(cashflow[0].operatingCashFlow).not.toBeNull();
    expect(forecast.length).toBeGreaterThan(0);
    expect(express.length).toBeGreaterThan(0);
    expect(holders.length).toBeGreaterThan(0);
    expect(count.length).toBeGreaterThan(0);
    expect(bonds.length).toBeGreaterThan(0);
  });

  it('batch.cn 东财 clist 备源（北交所）与 reference.dividendDetail 东财/新浪双源真实上游实测', async () => {
    const { data: bjQuotes, trace: bjTrace } = await sdk.withMeta(() =>
      sdk.batch.cn({ market: 'bj', batchSize: 100 }, { source: 'eastmoney' })
    );
    expect(bjTrace?.selectedProvider).toBe('eastmoney');
    expect(bjQuotes.length).toBeGreaterThan(50);
    expect(bjQuotes[0].source).toBe('eastmoney');

    const emDiv = await sdk.reference.dividendDetail('600519', { source: 'eastmoney' });
    expect(emDiv.length).toBeGreaterThan(0);
    expect(emDiv[0].code).toBe('600519');

    const sinaDiv = await sdk.reference.dividendDetail('600519', { source: 'sina' });
    expect(sinaDiv.length).toBeGreaterThan(0);
    expect(sinaDiv[0].code).toBe('600519');
    expect(sinaDiv.some((r) => (r.dividendPretax ?? 0) > 0 && r.exDividendDate !== null)).toBe(true);
  });

  it('阶段 A 真实上游实测：东财港美股财报/分红 + 港交所披露易公告（大陆可直连）', async () => {
    const [hkInd, hkInc, hkBal, hkCf, usInd, usInc, usBal, usCf, hkDiv, usDiv, hkAnn] =
      await Promise.all([
        sdk.financial.indicators('00700', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.income('00700', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.balance('00700', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.cashflow('00700', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.indicators('AAPL', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.income('AAPL', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.balance('AAPL', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.financial.cashflow('AAPL', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.reference.dividendDetail('00700', { source: 'eastmoney' }),
        sdk.reference.dividendDetail('AAPL', { source: 'eastmoney' }),
        sdk.news.announcements({ symbol: '00700', pageSize: 3 }, { source: 'hkexnews' }),
      ]);

    expect(hkInd[0].totalRevenue).toBeGreaterThan(0);
    expect(hkInc[0].netProfit).toBeGreaterThan(0);
    expect(hkBal[0].totalAssets).toBeGreaterThan(0);
    expect(hkCf[0].operatingCashFlow).toBeGreaterThan(0);

    expect(usInd[0].totalRevenue).toBeGreaterThan(0);
    expect(usInc[0].totalRevenue).toBeGreaterThan(0);
    expect(usBal[0].totalAssets).toBeGreaterThan(0);
    expect(usCf[0].operatingCashFlow).toBeGreaterThan(0);

    expect(hkDiv.length).toBeGreaterThan(0);
    expect(hkDiv[0].code).toBe('00700');
    expect(usDiv.length).toBeGreaterThan(0);
    expect(usDiv[0].code).toBe('AAPL');

    expect(hkAnn.length).toBeGreaterThan(0);
    expect(hkAnn[0].source).toBe('hkexnews');
    expect(hkAnn[0].url).toContain('hkexnews.hk');
  });

  it('阶段 B 真实上游实测：海外源 CNBC / Nasdaq / SEC EDGAR（并校验与东财单位一致）', async () => {
    const [hkCnbc, usCnbc, usNasdaq, hkKlineCnbc, usKlineNasdaq, usDivNasdaq, usIncNasdaq, usIncEm, secAnn] =
      await Promise.all([
        sdk.quotes.hk(['00700'], { source: 'cnbc' }),
        sdk.quotes.us(['AAPL'], { source: 'cnbc' }),
        sdk.quotes.us(['AAPL'], { source: 'nasdaq' }),
        sdk.kline.hk('00700', { startDate: '20261101', endDate: '20261124' }, { source: 'cnbc' }),
        sdk.kline.us('AAPL', { startDate: '20261101', endDate: '20261124' }, { source: 'nasdaq' }),
        sdk.reference.dividendDetail('AAPL', { source: 'nasdaq' }),
        sdk.financial.income('AAPL', { pageSize: 2 }, { source: 'nasdaq' }),
        sdk.financial.income('AAPL', { pageSize: 2 }, { source: 'eastmoney' }),
        sdk.news.announcements({ symbol: 'AAPL', pageSize: 3 }, { source: 'sec' }),
      ]);

    expect(hkCnbc[0]).toMatchObject({ code: '00700', source: 'cnbc', currency: 'HKD' });
    expect(hkCnbc[0].price).toBeGreaterThan(0);

    expect(usCnbc[0]).toMatchObject({ code: 'AAPL', source: 'cnbc' });
    expect(usCnbc[0].price).toBeGreaterThan(0);

    expect(usNasdaq[0]).toMatchObject({ code: 'AAPL', source: 'nasdaq' });
    expect(usNasdaq[0].price).toBeGreaterThan(0);

    expect(hkKlineCnbc.length).toBeGreaterThan(0);
    expect(usKlineNasdaq.length).toBeGreaterThan(0);

    expect(usDivNasdaq.length).toBeGreaterThan(0);
    expect(usDivNasdaq[0].dividendPretax).toBeGreaterThan(0);

    // 验证 Nasdaq 千美元×1000 换算后与东财美股年报营收量级一致
    expect(usIncNasdaq[0].totalRevenue).toBeGreaterThan(1e11);
    expect(usIncEm[0].totalRevenue).toBeGreaterThan(1e11);

    expect(secAnn.length).toBeGreaterThan(0);
    expect(secAnn[0].source).toBe('sec');
    expect(secAnn[0].url).toContain('sec.gov/Archives/edgar');
  });

  it('Nasdaq 长区间跨页返回完整且无重复的美股日线', async () => {
    const rows = await sdk.kline.us('AAPL', {
      startDate: '2019-01-01', endDate: '2021-12-31', adjust: 'qfq',
    }, { source: 'nasdaq' });
    if (rows.length === 0) {
      const client = new NodeHttpClient({ timeout: 5_000, retry: { maxRetries: 0 } });
      try {
        const windows = [
          ['2019-01-01', '2021-12-31', '500'],
          ['2019-01-01', '2019-02-01', '5'],
          ['2023-01-01', '2025-12-31', '500'],
          ['2024-11-01', '2026-11-24', '500'],
          ['2026-11-02', '2026-11-24', '5'],
        ];
        const samples = await Promise.allSettled(windows.map(async ([fromdate, todate, limit]) => {
          const params = new URLSearchParams({ assetclass: 'stocks', fromdate, todate, limit });
          const payload = await client.get<{
            status?: unknown;
            data?: {
              totalRecords?: number;
              tradesTable?: { rows?: Array<{ date: string }> };
            };
          }>(`https://api.nasdaq.com/api/quote/AAPL/historical?${params}`, {
            responseType: 'json', provider: 'nasdaq', hostFallback: false,
          });
          const bars = payload.data?.tradesTable?.rows;
          return {
            fromdate, todate, limit, status: payload.status,
            totalRecords: payload.data?.totalRecords, returned: bars?.length,
            first: bars?.[0]?.date, last: bars?.at(-1)?.date,
          };
        }));
        console.info('Nasdaq historical windows', JSON.stringify(samples));
      } finally {
        await client.close();
      }
    }
    expect(rows.length).toBeGreaterThan(500);
    expect(rows[0].date).toBe('2019-01-02');
    expect(rows.at(-1)?.date).toBe('2021-12-31');
    expect(new Set(rows.map((bar) => bar.date)).size).toBe(rows.length);
  });

  it('CNBC 的历史图表覆盖不足时返回上游错误', async () => {
    await expect(sdk.kline.us('AAPL', {
      startDate: '2015-01-01', endDate: '2026-11-24', adjust: 'qfq',
    }, { source: 'cnbc' })).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      provider: 'cnbc',
      message: expect.stringContaining('does not cover the requested start date'),
    });
  });
});
