import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../core/test/mocks/server';
import { OVERSEAS_PROVIDERS, StockNodeSDK } from '../../src/index';

describe('阶段 A：大陆可直连港美股财报/分红与港交所披露易公告', () => {
  it('financial.* 自动识别港股 00700 与美股 AAPL，按东财数据中心长表透视归一化', async () => {
    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/v1/get', ({ request }) => {
        const report = new URL(request.url).searchParams.get('reportName');
        if (report === 'RPT_HKF10_FN_MAININDICATOR') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: '00700',
                  SECURITY_NAME_ABBR: '腾讯控股',
                  REPORT_DATE: '2026-09-30 00:00:00',
                  REPORT_TYPE: '2026年三季报',
                  BASIC_EPS: 19.697,
                  BPS: 133.25,
                  PER_NETCASH_OPERATE: 17.24,
                  OPERATE_INCOME: 608579000000,
                  OPERATE_INCOME_YOY: 9.18,
                  HOLDER_PROFIT: 177727000000,
                  HOLDER_PROFIT_YOY: 6.69,
                  ROE_AVG: 15.03,
                  GROSS_PROFIT_RATIO: 56.79,
                },
              ],
            },
          });
        }
        if (report === 'RPT_HKF10_FN_INCOME_PC') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 4,
              data: [
                { SECURITY_CODE: '00700', SECURITY_NAME_ABBR: '腾讯控股', REPORT_DATE: '2026-09-30 00:00:00', DATE_TYPE_CODE: '004', STD_ITEM_NAME: '营运收入', AMOUNT: 608579000000 },
                { SECURITY_CODE: '00700', SECURITY_NAME_ABBR: '腾讯控股', REPORT_DATE: '2026-09-30 00:00:00', DATE_TYPE_CODE: '004', STD_ITEM_NAME: '毛利', AMOUNT: 345609000000 },
                { SECURITY_CODE: '00700', SECURITY_NAME_ABBR: '腾讯控股', REPORT_DATE: '2026-09-30 00:00:00', DATE_TYPE_CODE: '004', STD_ITEM_NAME: '经营溢利', AMOUNT: 193798000000 },
                { SECURITY_CODE: '00700', SECURITY_NAME_ABBR: '腾讯控股', REPORT_DATE: '2026-09-30 00:00:00', DATE_TYPE_CODE: '004', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 177727000000 },
              ],
            },
          });
        }
        if (report === 'RPT_USF10_FN_GMAININDICATOR') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: 'AAPL',
                  SECURITY_NAME_ABBR: '苹果',
                  REPORT_DATE: '2026-09-26 00:00:00',
                  REPORT_DATA_TYPE: '2026年 年报',
                  NOTICE_DATE: '2026-11-03 00:00:00',
                  BASIC_EPS: 9.01,
                  OPERATE_INCOME: 478834000000,
                  OPERATE_INCOME_YOY: 15.06,
                  PARENT_HOLDER_NETPROFIT: 132175000000,
                  PARENT_HOLDER_NETPROFIT_YOY: 18.0,
                  ROE_AVG: 142.26,
                  GROSS_PROFIT_RATIO: 48.79,
                },
              ],
            },
          });
        }
        if (report === 'RPT_USSK_FN_CASHFLOW') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 4,
              data: [
                { SECURITY_CODE: 'AAPL', SECURITY_NAME_ABBR: '苹果', REPORT_DATE: '2026-09-26 00:00:00', DATE_TYPE_CODE: '001', REPORT_TYPE: '年报', ITEM_NAME: '经营活动产生的现金流量净额', AMOUNT: 145097000000 },
                { SECURITY_CODE: 'AAPL', SECURITY_NAME_ABBR: '苹果', REPORT_DATE: '2026-09-26 00:00:00', DATE_TYPE_CODE: '001', REPORT_TYPE: '年报', ITEM_NAME: '投资活动产生的现金流量净额', AMOUNT: -17280000000 },
                { SECURITY_CODE: 'AAPL', SECURITY_NAME_ABBR: '苹果', REPORT_DATE: '2026-09-26 00:00:00', DATE_TYPE_CODE: '001', REPORT_TYPE: '年报', ITEM_NAME: '筹资活动产生的现金流量净额', AMOUNT: -127446000000 },
                { SECURITY_CODE: 'AAPL', SECURITY_NAME_ABBR: '苹果', REPORT_DATE: '2026-09-26 00:00:00', DATE_TYPE_CODE: '001', REPORT_TYPE: '年报', ITEM_NAME: '现金及现金等价物增加(减少)额', AMOUNT: 371000000 },
              ],
            },
          });
        }
        return HttpResponse.json({ result: { pages: 1, count: 0, data: [] } });
      })
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 }, overseas: false });
    const hkInd = await sdk.financial.indicators('00700');
    expect(hkInd[0]).toMatchObject({
      code: '00700',
      name: '腾讯控股',
      eps: 19.697,
      totalRevenue: 608579000000,
      netProfit: 177727000000,
      source: 'eastmoney',
    });

    const hkInc = await sdk.financial.income('00700');
    expect(hkInc[0]).toMatchObject({
      code: '00700',
      reportDate: '2026-09-30',
      totalRevenue: 608579000000,
      operatingCost: 608579000000 - 345609000000,
      netProfit: 177727000000,
      source: 'eastmoney',
    });

    const usInd = await sdk.financial.indicators('AAPL');
    expect(usInd[0]).toMatchObject({
      code: 'AAPL',
      eps: 9.01,
      totalRevenue: 478834000000,
      source: 'eastmoney',
    });

    const usCf = await sdk.financial.cashflow('AAPL');
    expect(usCf[0]).toMatchObject({
      code: 'AAPL',
      operatingCashFlow: 145097000000,
      investingCashFlow: -17280000000,
      financingCashFlow: -127446000000,
      netCashIncrease: 371000000,
      source: 'eastmoney',
    });
  });

  it('reference.dividendDetail 支持港股/美股东财分红表，news.announcements 港股自动路由至港交所披露易', async () => {
    let prefixHits = 0;
    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/v1/get', ({ request }) => {
        const report = new URL(request.url).searchParams.get('reportName');
        if (report === 'RPT_HKF10_INFO_DIVIDEND') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: '00700',
                  SECURITY_NAME_ABBR: '腾讯控股',
                  NOTICE_DATE: '2026-05-13 00:00:00',
                  ASSIGN_PERIOD: '2025末期',
                  EX_DIVIDEND_DATE: '2026-05-15 00:00:00',
                  RECORD_DATE: '2026-05-20 00:00:00',
                  DIVIDEND_DATE: '2026-06-01',
                  PLAN_EXPLAIN: '每股派港币5.3元',
                  ASSIGN_PROGRESS: '实施分配',
                },
              ],
            },
          });
        }
        if (report === 'RPT_USF10_INFO_DIVIDEND') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: 'AAPL',
                  SECURITY_NAME_ABBR: '苹果',
                  NOTICE_DATE: '2026-11-02 00:00:00',
                  ASSIGN_TYPE: 'Cash',
                  PLAN_EXPLAIN: '每1股派0.27美元股息',
                  EQUITY_RECORD_DATE: '2026-11-12 00:00:00',
                  BONUS_PAY_DATE: '2026-11-16 00:00:00',
                  EX_DIVIDEND_DATE: '2026-11-12 00:00:00',
                  ASSIGN_PERIOD: '2026季度分配',
                },
              ],
            },
          });
        }
        return HttpResponse.json({ result: { pages: 1, count: 0, data: [] } });
      }),
      http.get('https://www1.hkexnews.hk/search/prefix.do', () => {
        prefixHits++;
        return new HttpResponse(
          'callback({"more":"1","stockInfo":[{"stockId":7609,"code":"00700","name":"騰訊控股"}]});',
          { status: 200 }
        );
      }),
      http.get('https://www1.hkexnews.hk/search/titleSearchServlet.do', () =>
        HttpResponse.json({
          result: JSON.stringify([
            {
              NEWS_ID: '12416824',
              STOCK_CODE: '00700<br/>80700',
              STOCK_NAME: '騰訊控股<br/>騰訊控股－Ｒ',
              TITLE: '截至二零二六年九月三十日止三個月業績公佈',
              SHORT_TEXT: '公告及通告 - [季度業績]<br/>',
              FILE_TYPE: 'PDF',
              DATE_TIME: '18/11/2026 16:30',
              FILE_LINK: '/listedco/listconews/sehk/2026/1118/2026111800449_c.pdf',
            },
          ]),
        })
      )
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 }, overseas: false });

    const hkDiv = await sdk.reference.dividendDetail('00700');
    expect(hkDiv[0]).toMatchObject({
      code: '00700',
      dividendPretax: 5.3,
      exDividendDate: '2026-05-15',
      payDate: '2026-06-01',
    });

    const usDiv = await sdk.reference.dividendDetail('AAPL');
    expect(usDiv[0]).toMatchObject({
      code: 'AAPL',
      dividendPretax: 0.27,
      exDividendDate: '2026-11-12',
      payDate: '2026-11-16',
    });

    const hkAnn1 = await sdk.withMeta(() => sdk.news.announcements({ symbol: '00700', pageSize: 5 }));
    const hkAnn2 = await sdk.news.announcements({ symbol: '00700', pageSize: 5 });
    expect(hkAnn1.trace?.selectedProvider).toBe('hkexnews');
    expect(hkAnn1.data[0]).toMatchObject({
      id: '12416824',
      code: '00700',
      name: '騰訊控股',
      publishedAt: '2026-11-18 16:30:00',
      url: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/1118/2026111800449_c.pdf',
      fileType: 'PDF',
      source: 'hkexnews',
    });
    expect(hkAnn2).toHaveLength(1);
    expect(prefixHits).toBe(1); // stockId 已缓存复用
  });
});

describe('阶段 B：海外源默认开启（CNBC / Nasdaq / SEC EDGAR）与 overseas: false 一键关闭', () => {
  it('国内三源全挂时，quotes.hk / quotes.us 与 kline 自动跨区降级到 CNBC / Nasdaq', async () => {
    server.use(
      http.get('https://qt.gtimg.cn/*', () => HttpResponse.error()),
      http.get('https://hq.sinajs.cn/*', () => HttpResponse.error()),
      http.get(/^https:\/\/(.*\.)?push2(delay)?\.eastmoney\.com\//, () => HttpResponse.error()),
      http.get('https://push2his.eastmoney.com/*', () => HttpResponse.error()),
      http.get('https://*.push2his.eastmoney.com/*', () => HttpResponse.error()),
      http.get('https://web.ifzq.gtimg.cn/*', () => HttpResponse.error()),
      http.get('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol', ({ request }) => {
        const syms = new URL(request.url).searchParams.get('symbols') ?? '';
        if (syms.includes('0700.HK')) {
          return HttpResponse.json({
            FormattedQuoteResult: {
              FormattedQuote: [
                {
                  symbol: '0700.HK',
                  name: 'Tencent Holdings Limited',
                  last: '341.60',
                  previous_day_closing: '344.00',
                  open: '342.00',
                  high: '345.00',
                  low: '340.00',
                  change: '-2.40',
                  change_pct: '-0.70%',
                  volume: '29,393,105',
                  mktcapView: '3.106T',
                  currencyCode: 'HKD',
                  last_time: '2026-11-24T16:08:00+0800',
                },
              ],
            },
          });
        }
        return HttpResponse.error();
      }),
      http.get('https://api.nasdaq.com/api/quote/AAPL/info', () =>
        HttpResponse.json({
          data: {
            symbol: 'AAPL',
            companyName: 'Apple Inc. Common Stock',
            primaryData: {
              lastSalePrice: '$354.00',
              netChange: '+4.92',
              percentageChange: '+1.41%',
              lastTradeTimestamp: 'Nov 24, 2026',
              volume: '39,768,376',
            },
          },
        })
      ),
      http.get('https://ts-api.cnbc.com/harmony/app/charts/1Y.json', () =>
        HttpResponse.json({
          barData: {
            priceBars: [
              { open: '615.0', high: '627.5', low: '613.5', close: '624.5', volume: 22376801, tradeTime: '20261123000000' },
              { open: '625.0', high: '635.0', low: '620.0', close: '630.0', volume: 15000000, tradeTime: '20261124000000' },
            ],
          },
        })
      )
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });

    const hkQuote = await sdk.withMeta(() => sdk.quotes.hk(['00700']));
    expect(hkQuote.trace?.selectedProvider).toBe('cnbc');
    expect(hkQuote.data[0]).toMatchObject({
      code: '00700',
      price: 341.6,
      totalMarketCap: 31060,
      currency: 'HKD',
      source: 'cnbc',
    });

    // CNBC 报错时 quotes.us 继续降级到 Nasdaq
    const usQuote = await sdk.withMeta(() => sdk.quotes.us(['AAPL']));
    expect(usQuote.trace?.selectedProvider).toBe('nasdaq');
    expect(usQuote.data[0]).toMatchObject({
      code: 'AAPL',
      price: 354,
      change: 4.92,
      changePercent: 1.41,
      source: 'nasdaq',
    });

    const hkKline = await sdk.withMeta(() =>
      sdk.kline.hk('00700', { startDate: '20261123', endDate: '20261124' })
    );
    expect(hkKline.trace?.selectedProvider).toBe('cnbc');
    expect(hkKline.data).toHaveLength(2);
    expect(hkKline.data[1]).toMatchObject({
      date: '2026-11-24',
      close: 630,
      change: 5.5,
      currency: 'HKD',
    });
  });

  it('美股分红/三大表在东财失败时降级 Nasdaq（千美元 ×1000 统一换算），美股公告直走 SEC EDGAR', async () => {
    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/v1/get', () => HttpResponse.error()),
      http.get('https://api.nasdaq.com/api/quote/AAPL/dividends', () =>
        HttpResponse.json({
          data: {
            dividends: {
              rows: [
                {
                  exOrEffDate: '11/12/2026',
                  type: 'Cash',
                  amount: '$0.27',
                  declarationDate: '11/02/2026',
                  recordDate: '11/12/2026',
                  paymentDate: '11/16/2026',
                  currency: 'USD',
                },
              ],
            },
          },
        })
      ),
      http.get('https://api.nasdaq.com/api/company/AAPL/financials', () =>
        HttpResponse.json({
          data: {
            symbol: 'AAPL',
            incomeStatementTable: {
              headers: { value1: 'Period Ending:', value2: '9/26/2026' },
              rows: [
                { value1: 'Total Revenue', value2: '$478,834,000' },
                { value1: 'Cost of Revenue', value2: '$245,232,000' },
                { value1: 'Operating Income', value2: '$158,063,000' },
                { value1: 'Net Income', value2: '$132,175,000' },
              ],
            },
            balanceSheetTable: {
              headers: { value1: 'Period Ending:', value2: '9/26/2026' },
              rows: [
                { value1: 'Total Assets', value2: '$404,548,000' },
                { value1: 'Total Liabilities', value2: '$292,455,000' },
                { value1: 'Total Equity', value2: '$112,093,000' },
                { value1: 'Total Current Assets', value2: '$173,857,000' },
                { value1: 'Total Current Liabilities', value2: '$169,915,000' },
              ],
            },
            cashFlowTable: {
              headers: { value1: 'Period Ending:', value2: '9/26/2026' },
              rows: [
                { value1: 'Net Cash Flow-Operating', value2: '$145,097,000' },
                { value1: 'Net Cash Flows-Investing', value2: '-$17,280,000' },
                { value1: 'Net Cash Flows-Financing', value2: '-$127,446,000' },
                { value1: 'Net Cash Flow', value2: '$371,000' },
              ],
            },
          },
        })
      ),
      http.get('https://www.sec.gov/files/company_tickers.json', ({ request }) => {
        expect(request.headers.get('user-agent')).toContain('my-app');
        return HttpResponse.json({
          '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
        });
      }),
      http.get('https://data.sec.gov/submissions/CIK0000320193.json', () =>
        HttpResponse.json({
          cik: '0000320193',
          name: 'Apple Inc.',
          filings: {
            recent: {
              form: ['10-K', '4'],
              filingDate: ['2026-11-01', '2026-11-19'],
              accessionNumber: ['0000320193-26-000106', '0001140361-26-044952'],
              primaryDocument: ['aapl-20260926.htm', 'form4.xml'],
              primaryDocDescription: ['10-K Annual Report', 'FORM 4'],
            },
          },
        })
      )
    );

    const sdk = new StockNodeSDK({
      retry: { maxRetries: 0 },
      secUserAgent: 'my-app dev@example.com',
    });

    const div = await sdk.withMeta(() => sdk.reference.dividendDetail('AAPL'));
    expect(div.trace?.selectedProvider).toBe('nasdaq');
    expect(div.data[0]).toMatchObject({
      code: 'AAPL',
      dividendPretax: 0.27,
      exDividendDate: '2026-11-12',
      payDate: '2026-11-16',
    });

    const inc = await sdk.withMeta(() => sdk.financial.income('AAPL'));
    expect(inc.trace?.selectedProvider).toBe('nasdaq');
    expect(inc.data[0]).toMatchObject({
      code: 'AAPL',
      reportDate: '2026-09-26',
      totalRevenue: 478834000000,
      netProfit: 132175000000,
      source: 'nasdaq',
    });

    const bal = await sdk.financial.balance('AAPL');
    expect(bal[0]).toMatchObject({
      totalAssets: 404548000000,
      totalLiabilities: 292455000000,
      totalEquity: 112093000000,
      source: 'nasdaq',
    });

    const cf = await sdk.financial.cashflow('AAPL');
    expect(cf[0]).toMatchObject({
      operatingCashFlow: 145097000000,
      investingCashFlow: -17280000000,
      financingCashFlow: -127446000000,
      netCashIncrease: 371000000,
      source: 'nasdaq',
    });

    const secAnn = await sdk.withMeta(() =>
      sdk.news.announcements({ symbol: 'AAPL', keyword: '10-K' })
    );
    expect(secAnn.trace?.selectedProvider).toBe('sec');
    expect(secAnn.data).toHaveLength(1);
    expect(secAnn.data[0]).toMatchObject({
      code: 'AAPL',
      category: '10-K',
      publishedAt: '2026-11-01',
      url: 'https://www.sec.gov/Archives/edgar/data/320193/000032019326000106/aapl-20260926.htm',
      fileType: 'HTM',
      source: 'sec',
    });
  });

  it('overseas: false 可一键禁用 CNBC / Nasdaq / SEC，绝不发起任何海外请求', async () => {
    let overseasHits = 0;
    server.use(
      http.get('https://qt.gtimg.cn/*', () => HttpResponse.error()),
      http.get('https://hq.sinajs.cn/*', () => HttpResponse.error()),
      http.get(/^https:\/\/(.*\.)?push2(delay)?\.eastmoney\.com\//, () => HttpResponse.error()),
      http.get('https://quote.cnbc.com/*', () => {
        overseasHits++;
        return HttpResponse.json({});
      }),
      http.get('https://api.nasdaq.com/*', () => {
        overseasHits++;
        return HttpResponse.json({});
      }),
      http.get('https://www.sec.gov/*', () => {
        overseasHits++;
        return HttpResponse.json({});
      })
    );

    expect(OVERSEAS_PROVIDERS).toEqual(['cnbc', 'nasdaq', 'sec']);

    const traces: Array<{ attempts: Array<{ provider: string; status: string; skipReason?: string }> }> = [];
    const sdk = new StockNodeSDK({
      retry: { maxRetries: 0 },
      overseas: false,
      onRoute: (t) => traces.push(t),
    });

    await expect(sdk.quotes.us(['AAPL'])).rejects.toThrow();
    await expect(sdk.news.announcements({ symbol: 'AAPL' })).rejects.toThrow();
    expect(overseasHits).toBe(0);

    const usQuoteAttempts = traces[0]?.attempts ?? [];
    expect(
      usQuoteAttempts.filter((a) => a.provider === 'cnbc' || a.provider === 'nasdaq')
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'cnbc', status: 'skipped', skipReason: 'disabled' }),
        expect.objectContaining({ provider: 'nasdaq', status: 'skipped', skipReason: 'disabled' }),
      ])
    );
  });
});
