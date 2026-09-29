import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import StockSDK from '../../../../src/index';
import { server } from '../../../mocks/server';

const EASTMONEY_KLINE_URL =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const TENCENT_KLINE_URL =
  'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get';
const TENCENT_MINUTE_KLINE_URL =
  'https://ifzq.gtimg.cn/appstock/app/kline/mkline';
const SINA_KLINE_URL =
  'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData';

function tencentPayload(rows: unknown[][]): Record<string, unknown> {
  return {
    code: 0,
    msg: '',
    data: {
      sh600519: {
        hfqday: rows,
        qfqday: rows,
        day: rows,
      },
    },
  };
}

describe('A-share K-line provider fallback', () => {
  it('falls back to Tencent after one Eastmoney network failure', async () => {
    let eastmoneyCalls = 0;
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => {
        eastmoneyCalls++;
        return HttpResponse.error();
      }),
      http.get(TENCENT_KLINE_URL, ({ request }) => {
        const param = new URL(request.url).searchParams.get('param') ?? '';
        if (param.endsWith(',hfq')) {
          expect(param).toContain('sh600519,day,2024-05-03,2024-05-14,640,hfq');
        } else {
          expect(param).toContain('sh600519,day,');
          expect(param.endsWith(',')).toBe(true);
        }
        return HttpResponse.json(
          tencentPayload([
            ['2024-05-10', '10', '11', '12', '9', '100'],
            ['2024-05-13', '11', '12', '13', '10', '110'],
            ['2024-05-14', '12', '11', '12.5', '10.5', '120'],
          ])
        );
      })
    );

    const result = await new StockSDK().kline.cn('600519', {
      startDate: '20240513',
      endDate: '20240514',
    });

    expect(eastmoneyCalls).toBe(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-05-13',
      code: '600519',
      open: 11,
      close: 12,
      volume: 110,
      amount: null,
      change: 1,
      changePercent: 9.09,
      amplitude: 27.27,
      turnoverRate: null,
    });
    expect(result[0].tz).toBe('Asia/Shanghai');
  });

  it('qfq 取 hfq 序列并按末根不复权价缩放,不使用会出负价的 qfqday', async () => {
    const requested: string[] = [];
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.error()),
      http.get(TENCENT_KLINE_URL, ({ request }) => {
        const param = new URL(request.url).searchParams.get('param') ?? '';
        const adjust = param.split(',')[5] ?? '';
        requested.push(adjust);
        if (adjust === 'hfq') {
          return HttpResponse.json({
            code: 0,
            data: {
              sh600519: {
                hfqday: [
                  ['2024-05-13', '200', '400', '400', '200', '110'],
                  ['2024-05-14', '400', '800', '800', '400', '120'],
                ],
                qfqday: [
                  ['2024-05-13', '-50', '-40', '-40', '-50', '110'],
                  ['2024-05-14', '-40', '10', '10', '-40', '120'],
                ],
              },
            },
          });
        }
        return HttpResponse.json({
          code: 0,
          data: { sh600519: { day: [['2024-05-14', '5', '10', '10', '5', '120']] } },
        });
      })
    );

    const result = await new StockSDK().kline.cn('600519', {
      startDate: '20240513',
      endDate: '20240514',
      adjust: 'qfq',
    });

    expect(requested).toEqual(['hfq', '']);
    expect(result.map((row) => row.close)).toEqual([5, 10]);
    expect(result.every((row) => (row.close ?? 0) > 0)).toBe(true);
    expect(result[1].changePercent).toBe(100);
  });

  it('treats Eastmoney data:null as soft limiting and uses Tencent', async () => {
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.json({ data: null })),
      http.get(TENCENT_KLINE_URL, () =>
        HttpResponse.json(
          tencentPayload([
            ['2024-05-10', '10', '11', '12', '9', '100'],
            ['2024-05-13', '11', '12', '13', '10', '110'],
          ])
        )
      )
    );

    const result = await new StockSDK().kline.cn('600519', {
      startDate: '20240513',
      endDate: '20240513',
    });
    expect(result.map((row) => row.date)).toEqual(['2024-05-13']);
  });

  it('keeps Eastmoney data when the primary source succeeds', async () => {
    const tencentHandler = vi.fn();
    server.use(
      http.get(EASTMONEY_KLINE_URL, () =>
        HttpResponse.json({
          data: {
            klines: ['2024-05-13,11,12,13,10,110,1200,25,9.09,1,2'],
          },
        })
      ),
      http.get(TENCENT_KLINE_URL, () => {
        tencentHandler();
        return HttpResponse.json(tencentPayload([]));
      })
    );

    const result = await new StockSDK().kline.cn('600519', {
      startDate: '20240513',
      endDate: '20240513',
    });
    expect(result[0].amount).toBe(1200);
    expect(tencentHandler).not.toHaveBeenCalled();
  });

  it('keeps indicator K-lines available when the A-share source falls back', async () => {
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.error()),
      http.get(TENCENT_KLINE_URL, () =>
        HttpResponse.json(
          tencentPayload([
            ['2024-05-10', '10', '11', '12', '9', '100'],
            ['2024-05-13', '11', '12', '13', '10', '110'],
            ['2024-05-14', '12', '13', '14', '11', '120'],
          ])
        )
      )
    );

    const result = await new StockSDK().kline.withIndicators('600519', {
      market: 'A',
      indicators: { ma: { periods: [2] } },
    });

    expect(result).toHaveLength(3);
    expect(result[1]).toMatchObject({
      date: '2024-05-13',
      close: 12,
      ma: { ma2: 11.5 },
    });
  });

  it('falls back to Tencent for 5-minute K-lines after one Eastmoney failure', async () => {
    let eastmoneyCalls = 0;
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => {
        eastmoneyCalls++;
        return HttpResponse.error();
      }),
      http.get(TENCENT_MINUTE_KLINE_URL, ({ request }) => {
        const param = new URL(request.url).searchParams.get('param');
        expect(param).toBe('sh600519,m5,202405141500,640');
        return HttpResponse.json({
          code: 0,
          data: {
            sh600519: {
              m5: [
                ['202405140925', '10', '11', '12', '9', '100', {}, '0'],
                ['202405140930', '11', '12', '13', '10', '110', {}, '0'],
                ['202405140935', '12', '11', '12.5', '10.5', '120', {}, '0'],
              ],
            },
          },
        });
      })
    );

    const result = await new StockSDK().kline.cnMinute('600519', {
      period: '5',
      startDate: '2024-05-14 09:30',
      endDate: '2024-05-14 15:00',
    });

    expect(eastmoneyCalls).toBe(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      time: '2024-05-14 09:30',
      open: 11,
      close: 12,
      volume: 110,
      amount: null,
      change: 1,
      changePercent: 9.09,
      amplitude: 27.27,
      turnoverRate: null,
    });
  });

  it('uses Tencent minute fallback when Eastmoney returns data:null', async () => {
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.json({ data: null })),
      http.get(TENCENT_MINUTE_KLINE_URL, () =>
        HttpResponse.json({
          code: 0,
          data: {
            sh600519: {
              m15: [
                ['202405141000', '10', '11', '12', '9', '100', {}, '0'],
              ],
            },
          },
        })
      )
    );

    const result = await new StockSDK().kline.cnMinute('600519', {
      period: '15',
    });
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe('2024-05-14 10:00');
  });

  it('falls back to Sina history when Eastmoney and Tencent are unavailable', async () => {
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.json({ data: null })),
      http.get(TENCENT_KLINE_URL, () =>
        HttpResponse.json({ code: 1, msg: 'temporarily unavailable' })
      ),
      http.get(SINA_KLINE_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('symbol')).toBe('sh600519');
        expect(url.searchParams.get('scale')).toBe('240');
        return HttpResponse.json([
          { day: '2024-05-10', open: '10', high: '12', low: '9', close: '11', volume: '10000' },
          { day: '2024-05-13', open: '11', high: '13', low: '10', close: '12', volume: '11000' },
        ]);
      })
    );

    const result = await new StockSDK().kline.cn('600519', {
      startDate: '20240513',
      endDate: '20240513',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      date: '2024-05-13',
      code: '600519',
      open: 11,
      close: 12,
      volume: 110,
      amount: null,
      change: 1,
      changePercent: 9.09,
      amplitude: 27.27,
      turnoverRate: null,
    });
  });

  it('falls back to Sina minute K-lines when Eastmoney and Tencent are unavailable', async () => {
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.json({ data: null })),
      http.get(TENCENT_MINUTE_KLINE_URL, () =>
        HttpResponse.json({ code: 1, msg: 'temporarily unavailable' })
      ),
      http.get(SINA_KLINE_URL, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('scale')).toBe('5');
        return HttpResponse.json([
          { day: '2024-05-14 09:25:00', open: '10', high: '12', low: '9', close: '11', volume: '10000' },
          { day: '2024-05-14 09:30:00', open: '11', high: '13', low: '10', close: '12', volume: '11000' },
        ]);
      })
    );

    const result = await new StockSDK().kline.cnMinute('600519', {
      period: '5',
      startDate: '2024-05-14 09:30',
      endDate: '2024-05-14 15:00',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      time: '2024-05-14 09:30',
      volume: 110,
      amount: null,
      change: 1,
      changePercent: 9.09,
      turnoverRate: null,
    });
  });

  it('does not mask invalid minute K-line arguments with fallback data', async () => {
    const eastmoneyHandler = vi.fn();
    const tencentHandler = vi.fn();
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => {
        eastmoneyHandler();
        return HttpResponse.json({ data: null });
      }),
      http.get(TENCENT_MINUTE_KLINE_URL, () => {
        tencentHandler();
        return HttpResponse.json({ code: 0, data: {} });
      })
    );

    await expect(
      new StockSDK().kline.cnMinute('600519', {
        period: '5',
        adjust: 'bad' as 'qfq',
      })
    ).rejects.toThrow(/adjust/i);

    expect(eastmoneyHandler).not.toHaveBeenCalled();
    expect(tencentHandler).not.toHaveBeenCalled();
  });
});

describe('A-share K-line with klineFallback: false', () => {
  /** 备用源一律记账，断言关闭开关后它们一次都没被请求。 */
  function trackBackupSources() {
    const backup = vi.fn();
    server.use(
      http.get(TENCENT_KLINE_URL, () => {
        backup('tencent');
        return HttpResponse.json(tencentPayload([]));
      }),
      http.get(TENCENT_MINUTE_KLINE_URL, () => {
        backup('tencent-minute');
        return HttpResponse.json({ code: 0, data: {} });
      }),
      http.get(SINA_KLINE_URL, () => {
        backup('sina');
        return HttpResponse.json([]);
      })
    );
    return backup;
  }

  it('throws UPSTREAM_EMPTY on Eastmoney data:null without trying backups', async () => {
    const backup = trackBackupSources();
    let eastmoneyCalls = 0;
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => {
        eastmoneyCalls++;
        return HttpResponse.json({ data: null });
      })
    );

    await expect(
      new StockSDK({ klineFallback: false }).kline.cn('600519', {
        startDate: '20240513',
        endDate: '20240514',
      })
    ).rejects.toMatchObject({ code: 'UPSTREAM_EMPTY', provider: 'eastmoney' });

    expect(eastmoneyCalls).toBe(1);
    expect(backup).not.toHaveBeenCalled();
  });

  it('retries Eastmoney per the retry policy on the primary host only', async () => {
    const backup = trackBackupSources();
    const hosts: string[] = [];
    server.use(
      // 通配所有 push2his 子域：若请求层切了备用 host，这里会记下来
      http.get('*/api/qt/stock/kline/get', ({ request }) => {
        hosts.push(new URL(request.url).host);
        return HttpResponse.error();
      })
    );

    await expect(
      new StockSDK({
        klineFallback: false,
        retry: { maxRetries: 1, baseDelay: 1 },
      }).kline.cn('600519')
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    expect(hosts).toEqual(['push2his.eastmoney.com', 'push2his.eastmoney.com']);
    expect(backup).not.toHaveBeenCalled();
  });

  it('returns Eastmoney data once a retry succeeds', async () => {
    const backup = trackBackupSources();
    let eastmoneyCalls = 0;
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => {
        eastmoneyCalls++;
        if (eastmoneyCalls === 1) return HttpResponse.error();
        return HttpResponse.json({
          data: {
            klines: ['2024-05-13,11,12,13,10,110,1200,25,9.09,1,2'],
          },
        });
      })
    );

    const result = await new StockSDK({
      klineFallback: false,
      providerPolicies: { eastmoney: { retry: { maxRetries: 2, baseDelay: 1 } } },
    }).kline.cn('600519', { startDate: '20240513', endDate: '20240513' });

    expect(eastmoneyCalls).toBe(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ date: '2024-05-13', amount: 1200 });
    expect(backup).not.toHaveBeenCalled();
  });

  it('does not fall back for 5-minute K-lines either', async () => {
    const backup = trackBackupSources();
    server.use(
      http.get(EASTMONEY_KLINE_URL, () => HttpResponse.json({ data: null }))
    );

    await expect(
      new StockSDK({ klineFallback: false }).kline.cnMinute('600519', {
        period: '5',
      })
    ).rejects.toMatchObject({ code: 'UPSTREAM_EMPTY' });

    expect(backup).not.toHaveBeenCalled();
  });

  it('applies to methods built on A-share K-lines', async () => {
    const backup = trackBackupSources();
    server.use(http.get(EASTMONEY_KLINE_URL, () => HttpResponse.error()));
    const sdk = new StockSDK({
      klineFallback: false,
      retry: { maxRetries: 0 },
    });

    await expect(
      sdk.kline.withIndicators('600519', {
        market: 'A',
        indicators: { ma: { periods: [2] } },
      })
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(sdk.chips.cn('600519')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });

    expect(backup).not.toHaveBeenCalled();
  });
});
