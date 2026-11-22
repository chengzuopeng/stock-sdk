import { describe, expect, it, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { server } from '../../../core/test/mocks/server';
import { FileCacheStore, StockNodeSDK } from '../../src/index';
import { parseSinaDividendHtml } from '../../src/adapters';

const SINA_HQ_CN =
  'var hq_str_sh600519="贵州茅台,1425.000,1439.000,1460.000,1463.260,1420.000,1458.880,1460.000,4292405,6214192454.000,500,1458.880,100,1458.510,100,1458.500,100,1458.470,100,1458.110,10770,1460.000,100,1460.110,100,1460.260,100,1460.280,100,1460.500,2026-11-24,15:34:59,00,D|600|876000.00";';

const SINA_HQ_HK =
  'var hq_str_hk00700="TENCENT,腾讯控股,352.000,344.000,353.000,340.000,340.600,-3.400,-0.988,340.60001,341.00000,9339864223,27099305,0.000,0.000,631.641,333.000,2026/11/24,15:59";';

const SINA_HQ_US =
  'var hq_str_gb_aapl="苹果,349.0800,1.90,2026-11-24 17:18:23,6.5200,347.8700,352.6000,345.4422,360.8300,242.3500,58588677,43820934,5072920971720,9.01,38.740000,0.00,0.00,0.00,0.00,14532259000,63,350.6700,0.46,1.59,Nov 24 04:18AM EST,Nov 23 04:00PM EST,342.5600,56826,1,2026,20450654974.7653,351.6500,349.0800,19909774.5150,349.5700,349.0800,0,0";';

function toUtf8Bytes(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('StockNodeSDK 多源自动容错与统一 Schema 归一化', () => {
  let cacheDir = '';

  afterEach(async () => {
    if (cacheDir) {
      await rm(cacheDir, { recursive: true, force: true });
      cacheDir = '';
    }
  });

  it('quotes.cn：腾讯失败 → 自动切新浪；腾讯与新浪均失败 → 自动切东财 ulist，且支持 withMeta 溯源', async () => {
    // 场景 1：腾讯失败，自动切新浪
    server.use(
      http.get('https://qt.gtimg.cn/*', () => HttpResponse.error()),
      http.get('https://hq.sinajs.cn/*', ({ request }) => {
        expect(request.headers.get('referer')).toBe('https://finance.sina.com.cn/');
        // 用纯 ASCII 名称规避测试构造 GBK 字节编码复杂度，保留真实 33 字段结构
        const ascii = SINA_HQ_CN.replace('贵州茅台', 'Moutai');
        return new HttpResponse(toUtf8Bytes(ascii), { status: 200 });
      })
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const { data, trace } = await sdk.withMeta(() => sdk.quotes.cn(['600519']));

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      code: '600519',
      name: 'Moutai',
      price: 1460,
      prevClose: 1439,
      open: 1425,
      volume: 42924,
      amount: 621419.25,
      change: 21,
      changePercent: 1.46,
      source: 'sina',
    });
    expect(data[0].bid).toHaveLength(5);
    expect(data[0].ask).toHaveLength(5);
    expect(trace?.selectedProvider).toBe('sina');
    expect(trace?.degraded).toBe(true);

    // 场景 2：腾讯 + 新浪均失败，自动降级到东财 ulist
    server.use(
      http.get('https://qt.gtimg.cn/*', () => HttpResponse.error()),
      http.get('https://hq.sinajs.cn/*', () => HttpResponse.error()),
      http.get(/^https:\/\/(.*\.)?push2(delay)?\.eastmoney\.com\/api\/qt\/ulist\.np\/get/, () =>
        HttpResponse.json({
          rc: 0,
          data: {
            diff: [
              {
                f2: 1460,
                f3: 1.46,
                f4: 21,
                f5: 42924,
                f6: 6214192454,
                f7: 3.01,
                f8: 0.34,
                f9: 21.23,
                f10: 0.93,
                f12: '600519',
                f13: 1,
                f14: '贵州茅台',
                f15: 1463.26,
                f16: 1420,
                f17: 1425,
                f18: 1439,
                f20: 1825119137460,
                f21: 1825119137460,
                f23: 6.73,
                f38: 1250081601,
                f39: 1250081601,
                f124: 1795507910,
              },
            ],
          },
        })
      )
    );

    const sdk2 = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const emRes = await sdk2.withMeta(() => sdk2.quotes.cn(['600519']));
    expect(emRes.data[0]).toMatchObject({
      code: '600519',
      name: '贵州茅台',
      price: 1460,
      pe: 21.23,
      pb: 6.73,
      totalMarketCap: 18251.19,
      source: 'eastmoney',
    });
    expect(emRes.trace?.selectedProvider).toBe('eastmoney');
  });

  it('quotes.hk 与 quotes.us 支持多源容错切换至新浪与东财', async () => {
    server.use(
      http.get('https://qt.gtimg.cn/*', () => HttpResponse.error()),
      http.get(/^https:\/\/(.*\.)?push2(delay)?\.eastmoney\.com\/api\/qt\/ulist\.np\/get/, () =>
        HttpResponse.error()
      ),
      http.get('https://hq.sinajs.cn/*', ({ request }) => {
        if (request.url.includes('hk00700')) {
          return new HttpResponse(toUtf8Bytes(SINA_HQ_HK.replace('腾讯控股', 'Tencent')), {
            status: 200,
          });
        }
        return new HttpResponse(toUtf8Bytes(SINA_HQ_US.replace('苹果', 'Apple')), {
          status: 200,
        });
      })
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const hk = await sdk.quotes.hk(['00700']);
    expect(hk[0]).toMatchObject({
      code: '00700',
      price: 340.6,
      currency: 'HKD',
      source: 'sina',
    });

    const us = await sdk.quotes.us(['AAPL']);
    expect(us[0]).toMatchObject({
      code: 'AAPL',
      price: 349.08,
      pe: 38.74,
      high52w: 360.83,
      low52w: 242.35,
      source: 'sina',
    });
  });

  it('kline.cn 严格能力过滤：qfq 绝不静默降级到不支持复权的新浪，不复权则可降级', async () => {
    let sinaCalls = 0;
    server.use(
      http.get('https://push2his.eastmoney.com/api/qt/stock/kline/get', () =>
        HttpResponse.json({ data: null })
      ),
      http.get('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get', () =>
        HttpResponse.json({ code: 1, msg: 'unavailable' })
      ),
      http.get(
        'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData',
        () => {
          sinaCalls++;
          return HttpResponse.json([
            { day: '2026-05-13', open: '100', high: '110', low: '95', close: '105', volume: '10000' },
          ]);
        }
      )
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    // qfq 请求不会落入不复权新浪源
    await expect(
      sdk.kline.cn('600519', { adjust: 'qfq', startDate: '20260513', endDate: '20260513' })
    ).rejects.toMatchObject({ code: 'UPSTREAM_EMPTY' });
    expect(sinaCalls).toBe(0);

    // 不复权请求则顺利走新浪
    const raw = await sdk.kline.cn('600519', {
      adjust: '',
      startDate: '20260513',
      endDate: '20260513',
    });
    expect(sinaCalls).toBe(1);
    expect(raw[0]).toMatchObject({ date: '2026-05-13', close: 105, volume: 100 });
  });

  it('kline.hk 与 kline.us 在东财失败时自动切腾讯港美股 K 线备源', async () => {
    server.use(
      http.get('https://*.push2his.eastmoney.com/api/qt/stock/kline/get', () =>
        HttpResponse.json({ data: null })
      ),
      http.get('https://push2his.eastmoney.com/api/qt/stock/kline/get', () =>
        HttpResponse.json({ data: null })
      ),
      http.get('https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get', () =>
        HttpResponse.json({
          code: 0,
          data: {
            hk00700: {
              qfqday: [
                ['2026-05-26', '438', '439', '441', '432', '32795639', {}, '0.36', '1434113.419'],
                ['2026-05-27', '435.8', '434.4', '442.6', '433.6', '24863984', {}, '0.27', '1080000'],
              ],
              qt: { hk00700: ['100', '腾讯控股'] },
            },
          },
        })
      ),
      http.get('https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get', () =>
        HttpResponse.json({
          code: 0,
          data: {
            'usAAPL.OQ': {
              qfqday: [['2026-05-26', '309.03', '307.81', '311.29', '307.15', '48000493']],
              qt: { 'usAAPL.OQ': ['200', '苹果'] },
            },
          },
        })
      )
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const hk = await sdk.kline.hk('00700', { startDate: '20260526', endDate: '20260527' });
    expect(hk).toHaveLength(2);
    expect(hk[0]).toMatchObject({
      code: '00700',
      name: '腾讯控股',
      close: 439,
      turnoverRate: 0.36,
      currency: 'HKD',
    });

    const us = await sdk.kline.us('AAPL', { startDate: '20260526', endDate: '20260526' });
    expect(us).toHaveLength(1);
    expect(us[0]).toMatchObject({
      code: 'AAPL',
      name: '苹果',
      close: 307.81,
      currency: 'USD',
    });
  });

  it('news.flash 与 news.announcements 支持双源容错与能力路由（keyword 直走巨潮 POST）', async () => {
    server.use(
      http.get('https://np-listapi.eastmoney.com/comm/web/getFastNewsList', () =>
        HttpResponse.error()
      ),
      http.get('https://zhibo.sina.com.cn/api/zhibo/feed', () =>
        HttpResponse.json({
          result: {
            status: { code: 0 },
            data: {
              feed: {
                list: [
                  {
                    id: 5235211,
                    rich_text: '【测试快讯】正文内容',
                    create_time: '2026-11-24 17:18:19',
                    docurl: 'https://finance.sina.cn/7x24/demo.html',
                    tag: [{ name: '宏观' }],
                    ext: JSON.stringify({ stocks: [{ symbol: 'sh600519' }] }),
                  },
                ],
              },
            },
          },
        })
      ),
      http.post('http://www.cninfo.com.cn/new/hisAnnouncement/query', async ({ request }) => {
        const body = await request.text();
        expect(body).toContain('searchkey=%E5%88%86%E7%BA%A2');
        return HttpResponse.json({
          announcements: [
            {
              secCode: '600519',
              secName: '贵州茅台',
              announcementId: '1225685865',
              announcementTitle: '贵州茅台<em>分红</em>实施公告',
              announcementTime: 1795536000000,
              adjunctUrl: 'finalpage/2026-11-25/1225685865.PDF',
              adjunctType: 'PDF',
            },
          ],
        });
      })
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const flash = await sdk.withMeta(() => sdk.news.flash({ pageSize: 5 }));
    expect(flash.data[0]).toMatchObject({
      title: '测试快讯',
      tags: ['宏观'],
      relatedCodes: ['sh600519'],
      source: 'sina',
    });
    expect(flash.trace?.degraded).toBe(true);

    // 传入 keyword 时，东财公告不支持搜索，自动跳过东财直走巨潮 POST
    const anns = await sdk.withMeta(() =>
      sdk.news.announcements({ keyword: '分红', symbol: '600519' })
    );
    expect(anns.data[0]).toMatchObject({
      code: '600519',
      title: '贵州茅台分红实施公告',
      url: 'https://static.cninfo.com.cn/finalpage/2026-11-25/1225685865.PDF',
      fileType: 'PDF',
      source: 'cninfo',
    });
    expect(anns.trace?.selectedProvider).toBe('cninfo');
  });

  it('financial / corporate / bond 统一归一化并支持 FileCacheStore 磁盘缓存复用', async () => {
    let dcCalls = 0;
    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/v1/get', ({ request }) => {
        dcCalls++;
        const report = new URL(request.url).searchParams.get('reportName');
        if (report === 'RPT_LICO_FN_CPD') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: '600519',
                  SECURITY_NAME_ABBR: '贵州茅台',
                  REPORTDATE: '2026-09-30 00:00:00',
                  DATATYPE: '2026年 三季报',
                  NOTICE_DATE: '2026-10-31 00:00:00',
                  BASIC_EPS: 51.53,
                  BPS: 216.95,
                  MGJYXJJE: 67.24,
                  TOTAL_OPERATE_INCOME: 133283652508.95,
                  YSTZ: 1.82,
                  PARENT_NETPROFIT: 64467425981.95,
                  SJLTZ: -0.25,
                  WEIGHTAVG_ROE: 24.47,
                  XSMLL: 89.58,
                },
              ],
            },
          });
        }
        if (report === 'RPT_F10_EH_FREEHOLDERS') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: '600519',
                  SECURITY_NAME_ABBR: '贵州茅台',
                  END_DATE: '2026-09-30 00:00:00',
                  HOLDER_RANK: 1,
                  HOLDER_NAME: '中国贵州茅台酒厂(集团)有限责任公司',
                  HOLDER_TYPE: '其它',
                  HOLD_NUM: 681282935,
                  FREE_HOLDNUM_RATIO: 54.5,
                  HOLD_RATIO: 54.5,
                  HOLD_NUM_CHANGE: '不变',
                  HOLDER_MARKET_CAP: 857476327649.7,
                },
              ],
            },
          });
        }
        if (report === 'RPT_BOND_CB_LIST') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: '113712',
                  SECURITY_NAME_ABBR: '圣晖转债',
                  CONVERT_STOCK_CODE: '603163',
                  RATING: 'AA-',
                  ACTUAL_ISSUE_SCALE: 5.5,
                  BOND_EXPIRE: '6',
                  EXPIRE_DATE: '2032-11-23 00:00:00',
                },
              ],
            },
          });
        }
        return HttpResponse.json({ result: { pages: 1, count: 0, data: [] } });
      })
    );

    cacheDir = await mkdtemp(join(tmpdir(), 'stock-node-sdk-test-'));
    const sdk = new StockNodeSDK({
      retry: { maxRetries: 0 },
      cache: { store: new FileCacheStore({ dir: cacheDir }) },
    });

    const ind1 = await sdk.financial.indicators('600519');
    const ind2 = await sdk.financial.indicators('600519');
    expect(ind1[0]).toMatchObject({
      code: '600519',
      reportDate: '2026-09-30',
      eps: 51.53,
      roe: 24.47,
      grossMargin: 89.58,
      source: 'eastmoney',
    });
    expect(ind2).toEqual(ind1);
    expect(dcCalls).toBe(1); // 第二次直接命中磁盘缓存

    const holders = await sdk.corporate.topHolders('600519');
    expect(holders[0]).toMatchObject({
      rank: 1,
      holderName: '中国贵州茅台酒厂(集团)有限责任公司',
      freeHoldRatio: 54.5,
    });

    const bonds = await sdk.bond.convertibleList({ pageSize: 5 });
    expect(bonds[0]).toMatchObject({
      bondCode: '113712',
      bondName: '圣晖转债',
      stockCode: '603163',
      rating: 'AA-',
    });
  });

  it('支持通过 registerAdapter 扩展自定义数据源并优先命中', async () => {
    const sdk = new StockNodeSDK();
    sdk.registerAdapter({
      id: 'custom:news.flash',
      capability: 'news.flash',
      provider: 'my-gateway',
      priority: 1,
      providedFields: new Set(['id', 'title', 'content']),
      supports: () => true,
      fetch: async () => [
        {
          id: 'custom-1',
          title: '自建源快讯',
          content: '内容',
          publishedAt: '2026-11-24 18:00:00',
          timestamp: null,
          tz: 'Asia/Shanghai',
          url: null,
          tags: [],
          relatedCodes: [],
          source: 'my-gateway',
        },
      ],
    });

    const res = await sdk.withMeta(() => sdk.news.flash());
    expect(res.data[0].source).toBe('my-gateway');
    expect(res.trace?.selectedProvider).toBe('my-gateway');
    expect(sdk.getSourceHealth('news.flash')[0].provider).toBe('my-gateway');
  });

  it('batch.cn / batch.hk / batch.us 腾讯失败时自动降级东财 clist 全市场分页并支持 market 与 onProgress', async () => {
    const progressEvents: Array<[number, number]> = [];
    server.use(
      http.get('https://*.linkdiary.cn/*', () => HttpResponse.error()),
      http.get('https://qt.gtimg.cn/*', () => HttpResponse.error()),
      http.get(/^https:\/\/(.*\.)?push2(delay)?\.eastmoney\.com\/api\/qt\/clist\/get/, ({ request }) => {
        const sp = new URL(request.url).searchParams;
        const fs = sp.get('fs') ?? '';
        const pn = Number(sp.get('pn') ?? '1');

        if (fs === 'm:0+t:81+s:2048') {
          // 模拟北交所 2 页，每页 1 条
          const row =
            pn === 1
              ? {
                  f2: 12.5,
                  f3: 2.46,
                  f4: 0.3,
                  f5: 1000,
                  f6: 1250000,
                  f7: 4.1,
                  f8: 1.5,
                  f9: 18.2,
                  f10: 1.1,
                  f12: '920001',
                  f13: 0,
                  f14: '北交样例A',
                  f15: 12.8,
                  f16: 12.1,
                  f17: 12.2,
                  f18: 12.2,
                  f20: 1500000000,
                  f21: 1200000000,
                  f23: 2.1,
                  f38: 120000000,
                  f39: 96000000,
                  f124: 1795507910,
                }
              : {
                  f2: 8.4,
                  f3: -1.18,
                  f4: -0.1,
                  f5: 500,
                  f6: 420000,
                  f12: '920002',
                  f13: 0,
                  f14: '北交样例B',
                  f15: 8.6,
                  f16: 8.3,
                  f17: 8.5,
                  f18: 8.5,
                  f124: 1795507910,
                };
          return HttpResponse.json({ data: { total: 2, diff: [row] } });
        }
        if (fs.startsWith('m:128')) {
          return HttpResponse.json({
            data: {
              total: 1,
              diff: [
                {
                  f2: 340.6,
                  f3: -0.99,
                  f4: -3.4,
                  f5: 27099305,
                  f6: 9339864223,
                  f12: '00700',
                  f13: 128,
                  f14: '腾讯控股',
                  f15: 353,
                  f16: 340,
                  f17: 352,
                  f18: 344,
                  f20: 3200000000000,
                  f21: 3200000000000,
                  f124: 1795507910,
                },
              ],
            },
          });
        }
        if (fs === 'm:105') {
          return HttpResponse.json({
            data: {
              total: 1,
              diff: [
                {
                  f2: 230.5,
                  f3: 1.25,
                  f4: 2.85,
                  f5: 45000000,
                  f6: 10372500000,
                  f12: 'AAPL',
                  f13: 105,
                  f14: '苹果',
                  f15: 232,
                  f16: 228,
                  f17: 229,
                  f18: 227.65,
                  f20: 3500000000000,
                  f124: 1795507910,
                },
              ],
            },
          });
        }
        return HttpResponse.json({ data: null });
      })
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const cnRes = await sdk.withMeta(() =>
      sdk.batch.cn({
        market: 'bj',
        batchSize: 100,
        onProgress: (done, total) => progressEvents.push([done, total]),
      })
    );
    expect(cnRes.trace?.selectedProvider).toBe('eastmoney');
    expect(cnRes.trace?.degraded).toBe(true);
    expect(cnRes.data).toHaveLength(2);
    expect(cnRes.data[0]).toMatchObject({
      code: '920001',
      price: 12.5,
      amount: 125,
      totalMarketCap: 15,
      source: 'eastmoney',
    });
    expect(progressEvents).toEqual([
      [1, 2],
      [2, 2],
    ]);

    const hk = await sdk.batch.hk();
    expect(hk[0]).toMatchObject({ code: '00700', currency: 'HKD', source: 'eastmoney' });

    const us = await sdk.batch.us({ market: 'NASDAQ' });
    expect(us[0]).toMatchObject({ code: 'AAPL', market: 'US', source: 'eastmoney' });
  });

  it('reference.dividendDetail 东财失败/空集时自动降级新浪 HTML 分红表解析', async () => {
    const sampleHtmlZh = `
      <html><head><title>贵州茅台(600519)分红配股_新浪财经</title></head><body>
      <table id="sharebonus_1"><tbody>
        <tr><td>2025-06-12</td><td>0</td><td>0</td><td>276.24</td><td>实施</td><td>2025-06-19</td><td>2025-06-18</td><td>--</td></tr>
        <tr><td>2015-07-10</td><td>1</td><td>0</td><td>43.74</td><td>实施</td><td>2015-07-17</td><td>2015-07-16</td><td>2015-07-17</td></tr>
      </tbody></table></body></html>
    `;
    const parsedZh = parseSinaDividendHtml(sampleHtmlZh, '600519');
    expect(parsedZh).toHaveLength(2);
    expect(parsedZh[0]).toMatchObject({
      code: '600519',
      name: '贵州茅台',
      planNoticeDate: '2025-06-12',
      dividendPretax: 276.24,
      dividendDesc: '10派276.24元',
      assignProgress: '实施',
      exDividendDate: '2025-06-19',
      equityRecordDate: '2025-06-18',
      payDate: null,
    });
    expect(parsedZh[1]).toMatchObject({
      bonusRatio: 1,
      dividendPretax: 43.74,
      dividendDesc: '10送1股派43.74元',
      payDate: '2015-07-17',
    });

    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/v1/get', () =>
        HttpResponse.json({ result: { pages: 1, count: 0, data: [] } })
      ),
      http.get(
        'https://vip.stock.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid/600519.phtml',
        () =>
          new HttpResponse(
            toUtf8Bytes(
              sampleHtmlZh
                .replace('贵州茅台', 'Moutai')
                .replace(/实施/g, 'Done')
            ),
            { status: 200 }
          )
      )
    );

    const sdk = new StockNodeSDK({ retry: { maxRetries: 0 } });
    const { data, trace } = await sdk.withMeta(() => sdk.reference.dividendDetail('600519'));
    expect(trace?.selectedProvider).toBe('sina');
    expect(trace?.degraded).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].dividendPretax).toBe(276.24);
  });

  it('routing.forcedSource 可在实例级别全局锁定首选数据源（供 CLI --source 使用）', async () => {
    server.use(
      http.get('https://hq.sinajs.cn/*', () =>
        new HttpResponse(toUtf8Bytes(SINA_HQ_CN.replace('贵州茅台', 'Moutai')), { status: 200 })
      )
    );

    const sdk = new StockNodeSDK({
      retry: { maxRetries: 0 },
      routing: { forcedSource: 'sina' },
    });
    const { data, trace } = await sdk.withMeta(() => sdk.quotes.cn(['600519']));
    expect(trace?.selectedProvider).toBe('sina');
    expect(trace?.degraded).toBe(false);
    expect(data[0].source).toBe('sina');
  });

  it('回归护栏：withIndicators/chips.hk 打通多源路由、巨潮 UTC+8 日期与 orgId 组合查询、无分红安全返回 []、缓存命中保留 withMeta trace', async () => {
    // 1. 巨潮公告：北京时间 2026-03-31 00:00:00+08:00 (= 2026-03-30T16:00:00Z) 不得早退成 03-30，且支持 symbol+keyword
    const bjMidnightEpoch = Date.parse('2026-03-31T00:00:00+08:00');
    let capturedForm = '';
    server.use(
      http.get('http://www.cninfo.com.cn/new/data/szse_stock.json', () =>
        HttpResponse.json({
          stockList: [{ code: '600519', orgId: 'gssh0600519' }],
        })
      ),
      http.post('http://www.cninfo.com.cn/new/hisAnnouncement/query', async ({ request }) => {
        capturedForm = await request.text();
        return HttpResponse.json({
          announcements: [
            {
              secCode: '600519',
              secName: '贵州茅台',
              announcementId: '999',
              announcementTitle: '2025年年度报告',
              announcementTime: bjMidnightEpoch,
              adjunctUrl: 'finalpage/2026-03-31/999.PDF',
              adjunctType: 'PDF',
            },
          ],
        });
      }),
      // 2. 港股东财软限流 { data: null } 时，chips.hk 与 kline.withIndicators 自动走腾讯港股 K 线（含换手率）
      http.get('https://push2his.eastmoney.com/api/qt/stock/kline/get', () =>
        HttpResponse.json({ data: null })
      ),
      http.get('https://*.push2his.eastmoney.com/api/qt/stock/kline/get', () =>
        HttpResponse.json({ data: null })
      ),
      http.get('https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get', () =>
        HttpResponse.json({
          code: 0,
          data: {
            hk00700: {
              qfqday: [
                ['2026-05-20', '400', '405', '408', '398', '20000000', {}, '0.25', '810000'],
                ['2026-05-21', '405', '410', '412', '404', '22000000', {}, '0.28', '902000'],
                ['2026-05-22', '410', '415', '418', '409', '25000000', {}, '0.31', '1037500'],
              ],
              qt: { hk00700: ['100', '腾讯控股'] },
            },
          },
        })
      ),
      // 3. 无分红美股 TSLA：东财空数组 + Nasdaq 无分红，应安全返回 [] 且不污染东财健康度
      http.get('https://datacenter-web.eastmoney.com/api/data/v1/get', ({ request }) => {
        const report = new URL(request.url).searchParams.get('reportName');
        if (report === 'RPT_USF10_INFO_DIVIDEND') {
          return HttpResponse.json({ result: null });
        }
        if (report === 'RPT_LICO_FN_CPD') {
          return HttpResponse.json({
            result: {
              pages: 1,
              count: 1,
              data: [
                {
                  SECURITY_CODE: '600519',
                  SECURITY_NAME_ABBR: '贵州茅台',
                  REPORTDATE: '2026-09-30 00:00:00',
                  DATATYPE: '2026年 三季报',
                  BASIC_EPS: 51.53,
                },
              ],
            },
          });
        }
        return HttpResponse.json({ result: { pages: 1, count: 0, data: [] } });
      }),
      http.get('https://api.nasdaq.com/api/quote/TSLA/dividends', () =>
        HttpResponse.json({ data: { dividends: { rows: null } } })
      )
    );

    cacheDir = await mkdtemp(join(tmpdir(), 'stock-node-reg-'));
    const sdk = new StockNodeSDK({
      retry: { maxRetries: 0 },
      cache: { store: new FileCacheStore({ dir: cacheDir }) },
    });

    const ann = await sdk.news.announcements({ symbol: '600519', keyword: '年度报告' });
    expect(ann[0].publishedAt).toBe('2026-03-31');
    expect(decodeURIComponent(capturedForm)).toContain('stock=600519,gssh0600519');
    expect(decodeURIComponent(capturedForm)).toContain('searchkey=年度报告');

    const hkWithInd = await sdk.withMeta(() =>
      sdk.kline.withIndicators('00700', {
        startDate: '2026-05-20',
        endDate: '2026-05-22',
        indicators: { ma: [2] },
      })
    );
    expect(hkWithInd.trace?.selectedProvider).toBe('tencent');
    expect(hkWithInd.data).toHaveLength(3);

    const hkChips = await sdk.withMeta(() => sdk.chips.hk('00700', { days: 2, range: 2 }));
    expect(hkChips.trace?.selectedProvider).toBe('tencent');
    expect(hkChips.data.length).toBeGreaterThan(0);
    expect(hkChips.data[0].profitRatio).not.toBeNull();

    const tslaDiv = await sdk.reference.dividendDetail('TSLA');
    expect(tslaDiv).toEqual([]);
    const divHealth = sdk.getSourceHealth('reference.dividendDetail');
    expect(divHealth.find((h) => h.provider === 'eastmoney')?.isCooling).toBeFalsy();

    // 持久化缓存二次命中时 withMeta 依然可拿到 trace
    const firstFin = await sdk.withMeta(() => sdk.financial.indicators('600519'));
    const cachedFin = await sdk.withMeta(() => sdk.financial.indicators('600519'));
    expect(firstFin.trace?.selectedProvider).toBe('eastmoney');
    expect(cachedFin.trace?.selectedProvider).toBe('eastmoney');
    expect(cachedFin.trace?.selectedAdapterId).toContain('#cache');
  });
});
