import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import {
  extractVariety,
  getFuturesMarketCode,
} from '../../../../src/providers/eastmoney/futuresKline';
import StockSDK from '../../../../src/index';

describe('Futures - symbol parsing', () => {
  describe('extractVariety', () => {
    it('should extract lowercase variety from specific contract', () => {
      expect(extractVariety('rb2605')).toBe('rb');
    });

    it('should extract uppercase variety from main contract', () => {
      expect(extractVariety('RBM')).toBe('RBM');
    });

    it('should extract multi-char variety', () => {
      expect(extractVariety('jm2605')).toBe('jm');
    });

    it('should extract CFFEX variety', () => {
      expect(extractVariety('IF2604')).toBe('IF');
    });

    it('should extract single-char variety', () => {
      expect(extractVariety('T2609')).toBe('T');
    });

    it('should extract CZCE variety', () => {
      expect(extractVariety('TA509')).toBe('TA');
    });

    it('should throw on pure numeric input', () => {
      expect(() => extractVariety('12345')).toThrow(/Invalid futures symbol/);
    });

    it('should throw on empty string', () => {
      expect(() => extractVariety('')).toThrow(/Invalid futures symbol/);
    });
  });

  describe('getFuturesMarketCode', () => {
    it('should return 113 for SHFE varieties', () => {
      expect(getFuturesMarketCode('rb')).toBe(113);
      expect(getFuturesMarketCode('cu')).toBe(113);
      expect(getFuturesMarketCode('au')).toBe(113);
    });

    it('should return 114 for DCE varieties', () => {
      expect(getFuturesMarketCode('j')).toBe(114);
      expect(getFuturesMarketCode('jm')).toBe(114);
      expect(getFuturesMarketCode('m')).toBe(114);
    });

    it('should return 115 for CZCE varieties', () => {
      expect(getFuturesMarketCode('TA')).toBe(115);
      expect(getFuturesMarketCode('CF')).toBe(115);
      expect(getFuturesMarketCode('SR')).toBe(115);
    });

    it('should return 142 for INE varieties', () => {
      expect(getFuturesMarketCode('sc')).toBe(142);
      expect(getFuturesMarketCode('nr')).toBe(142);
    });

    it('should return 220 for CFFEX varieties', () => {
      expect(getFuturesMarketCode('IF')).toBe(220);
      expect(getFuturesMarketCode('IC')).toBe(220);
      expect(getFuturesMarketCode('T')).toBe(220);
    });

    it('should return 225 for GFEX varieties', () => {
      expect(getFuturesMarketCode('si')).toBe(225);
      expect(getFuturesMarketCode('lc')).toBe(225);
    });

    it('should throw on unknown variety', () => {
      expect(() => getFuturesMarketCode('ZZZZ')).toThrow(
        /Unknown futures variety/
      );
    });
  });
});

describe('Futures - K-line API (MSW mock)', () => {
  const sdk = new StockSDK();

  it('should parse domestic futures kline with openInterest', async () => {
    const mockKlines = [
      '2026-02-26,3076,3063,3083,3050,692924,21251274752,1.08,0.20,6,0.00,0,583120,0',
      '2026-02-27,3063,3067,3070,3047,595003,18201423360,0.75,0.03,1,0.00,0,575890,0',
    ];

    server.use(
      http.get(
        'https://push2his.eastmoney.com/api/qt/stock/kline/get',
        ({ request }) => {
          const url = new URL(request.url);
          const secid = url.searchParams.get('secid');
          if (secid === '113.RBM') {
            return HttpResponse.json({
              data: {
                code: 'RBM',
                name: '螺纹钢主连',
                klines: mockKlines,
              },
            });
          }
          return HttpResponse.json({ data: null });
        }
      )
    );

    const result = await sdk.getFuturesKline('RBM');
    expect(result).toHaveLength(2);

    const first = result[0];
    expect(first.code).toBe('RBM');
    expect(first.name).toBe('螺纹钢主连');
    expect(first.date).toBe('2026-02-26');
    expect(first.open).toBe(3076);
    expect(first.close).toBe(3063);
    expect(first.high).toBe(3083);
    expect(first.low).toBe(3050);
    expect(first.volume).toBe(692924);
    expect(first.amount).toBe(21251274752);
    expect(first.amplitude).toBe(1.08);
    expect(first.changePercent).toBe(0.2);
    expect(first.change).toBe(6);
    expect(first.turnoverRate).toBe(0);
    expect(first.openInterest).toBe(583120);
  });

  it('should return empty array when API returns no data', async () => {
    server.use(
      http.get(
        'https://push2his.eastmoney.com/api/qt/stock/kline/get',
        () => {
          return HttpResponse.json({ data: null });
        }
      )
    );

    const result = await sdk.getFuturesKline('rb9999');
    expect(result).toEqual([]);
  });

  it('should throw on invalid symbol', async () => {
    await expect(sdk.getFuturesKline('12345')).rejects.toThrow(
      /Invalid futures symbol/
    );
  });

  it('should throw on invalid period', async () => {
    await expect(
      sdk.getFuturesKline('RBM', { period: 'yearly' as never })
    ).rejects.toThrow(/period/i);
  });
});

describe('Futures - Global spot API (MSW mock)', () => {
  const sdk = new StockSDK();

  it('should parse global futures spot data', async () => {
    server.use(
      http.get('https://futsseapi.eastmoney.com/list/*', () => {
        return HttpResponse.json({
          list: [
            {
              dm: 'HG00Y',
              name: 'COMEX铜',
              p: 4.5,
              zde: 0.05,
              zdf: 1.12,
              o: 4.45,
              h: 4.55,
              l: 4.4,
              zjsj: 4.45,
              vol: 1000,
              wp: 50,
              np: 30,
              ccl: 200,
              sc: 101,
              zsjd: 2,
            },
          ],
          total: 1,
        });
      })
    );

    const result = await sdk.getGlobalFuturesSpot();
    expect(result).toHaveLength(1);

    const item = result[0];
    expect(item.code).toBe('HG00Y');
    expect(item.name).toBe('COMEX铜');
    expect(item.price).toBe(4.5);
    expect(item.change).toBe(0.05);
    expect(item.changePercent).toBe(1.12);
    expect(item.open).toBe(4.45);
    expect(item.high).toBe(4.55);
    expect(item.low).toBe(4.4);
    expect(item.prevSettle).toBe(4.45);
    expect(item.volume).toBe(1000);
    expect(item.buyVolume).toBe(50);
    expect(item.sellVolume).toBe(30);
    expect(item.openInterest).toBe(200);
  });
});

describe('Futures - Inventory API (MSW mock)', () => {
  const sdk = new StockSDK();

  it('should return inventory symbols', async () => {
    server.use(
      http.get(
        'https://datacenter-web.eastmoney.com/api/data/v1/get',
        ({ request }) => {
          const url = new URL(request.url);
          const reportName = url.searchParams.get('reportName');
          if (reportName === 'RPT_FUTU_POSITIONCODE') {
            return HttpResponse.json({
              result: {
                data: [
                  {
                    TRADE_CODE: 'rb',
                    TRADE_TYPE: '螺纹钢',
                    TRADE_MARKET_CODE: 'SHFE',
                  },
                ],
              },
            });
          }
          return HttpResponse.json({ result: null });
        }
      )
    );

    const result = await sdk.getFuturesInventorySymbols();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('rb');
    expect(result[0].name).toBe('螺纹钢');
    expect(result[0].marketCode).toBe('SHFE');
  });

  it('should return inventory data', async () => {
    server.use(
      http.get(
        'https://datacenter-web.eastmoney.com/api/data/v1/get',
        ({ request }) => {
          const url = new URL(request.url);
          const reportName = url.searchParams.get('reportName');
          if (reportName === 'RPT_FUTU_STOCKDATA') {
            return HttpResponse.json({
              result: {
                pages: 1,
                data: [
                  {
                    SECURITY_CODE: 'rb',
                    TRADE_DATE: '2026-02-27 00:00:00',
                    ON_WARRANT_NUM: 23456,
                    ADDCHANGE: -100,
                  },
                ],
              },
            });
          }
          return HttpResponse.json({ result: null });
        }
      )
    );

    const result = await sdk.getFuturesInventory('rb');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('rb');
    expect(result[0].date).toBe('2026-02-27');
    expect(result[0].inventory).toBe(23456);
    expect(result[0].change).toBe(-100);
  });

  it('should return COMEX inventory data', async () => {
    server.use(
      http.get(
        'https://datacenter-web.eastmoney.com/api/data/v1/get',
        ({ request }) => {
          const url = new URL(request.url);
          const reportName = url.searchParams.get('reportName');
          if (reportName === 'RPT_FUTUOPT_GOLDSIL') {
            return HttpResponse.json({
              result: {
                pages: 1,
                data: [
                  {
                    REPORT_DATE: '2026-02-27 00:00:00',
                    STORAGE_TON: 850.5,
                    STORAGE_OUNCE: 27340000,
                  },
                ],
              },
            });
          }
          return HttpResponse.json({ result: null });
        }
      )
    );

    const result = await sdk.getComexInventory('gold');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-02-27');
    expect(result[0].name).toBe('黄金');
    expect(result[0].storageTon).toBe(850.5);
    expect(result[0].storageOunce).toBe(27340000);
  });

  it('should throw on invalid COMEX symbol', async () => {
    await expect(
      sdk.getComexInventory('copper' as never)
    ).rejects.toThrow(/Invalid COMEX symbol/);
  });
});
