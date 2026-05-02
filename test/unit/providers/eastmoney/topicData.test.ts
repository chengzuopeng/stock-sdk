import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';

const ZT_BASE = 'https://push2ex.eastmoney.com';

describe('TopicData - getZTPool', () => {
  const sdk = new StockSDK();

  it('parses zt pool with price scale and time padding', async () => {
    server.use(
      http.get(`${ZT_BASE}/getTopicZTPool`, ({ request }) => {
        const url = new URL(request.url);
        // 接口要求 YYYYMMDD
        expect(url.searchParams.get('date')).toBe('20240115');
        return HttpResponse.json({
          data: {
            pool: [
              {
                c: '600519',
                n: '贵州茅台',
                p: 1700500,           // 1700.5 元 × 1000
                zdp: 10.0,
                amount: 5000000000,
                ltsz: 2100000000000,
                tshare: 2200000000000,
                hs: 0.5,
                lbc: 1,
                fbt: 93055,            // 09:30:55
                lbt: 93055,
                fund: 200000000,
                zbc: 0,
                hybk: '白酒',
                zttj: { days: 3, ct: 5 },
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getZTPool('zt', '20240115');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('600519');
    expect(result[0].name).toBe('贵州茅台');
    expect(result[0].price).toBe(1700.5);
    expect(result[0].changePercent).toBe(10.0);
    expect(result[0].continuousBoardCount).toBe(1);
    expect(result[0].firstBoardTime).toBe('09:30:55');
    expect(result[0].lastBoardTime).toBe('09:30:55');
    expect(result[0].industry).toBe('白酒');
    expect(result[0].ztStatistics).toBe('3/5');
  });

  it('normalizes YYYY-MM-DD date input to YYYYMMDD', async () => {
    server.use(
      http.get(`${ZT_BASE}/getTopicZTPool`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('date')).toBe('20240115');
        return HttpResponse.json({ data: { pool: [] } });
      })
    );

    await sdk.getZTPool('zt', '2024-01-15');
  });

  it('returns empty array when pool is empty', async () => {
    server.use(
      http.get(`${ZT_BASE}/getTopicZTPool`, () =>
        HttpResponse.json({ data: { pool: [] } })
      )
    );

    const result = await sdk.getZTPool('zt');
    expect(result).toEqual([]);
  });

  it('always sends a date param even when caller omits it (push2ex requires date)', async () => {
    let capturedDate: string | null = null;
    server.use(
      http.get(`${ZT_BASE}/getTopicZTPool`, ({ request }) => {
        const url = new URL(request.url);
        capturedDate = url.searchParams.get('date');
        return HttpResponse.json({ data: { pool: [] } });
      })
    );

    await sdk.getZTPool('zt'); // 不传 date

    expect(capturedDate).not.toBeNull();
    // 默认应使用北京时间 YYYYMMDD（8 位数字）
    expect(capturedDate).toMatch(/^\d{8}$/);
  });

  it('uses different endpoint for strong pool', async () => {
    let endpointCalled = '';
    server.use(
      http.get(`${ZT_BASE}/getTopicQSPool`, () => {
        endpointCalled = 'strong';
        return HttpResponse.json({ data: { pool: [] } });
      })
    );

    await sdk.getZTPool('strong', '20240115');
    expect(endpointCalled).toBe('strong');
  });

  it('throws on unknown pool type', async () => {
    await expect(sdk.getZTPool('unknown' as never)).rejects.toThrow(
      /Invalid ZTPool/
    );
  });
});

describe('TopicData - getStockChanges', () => {
  const sdk = new StockSDK();

  it('maps StockChangeType to server code and parses time/info', async () => {
    server.use(
      http.get(`${ZT_BASE}/getAllStockChanges`, ({ request }) => {
        const url = new URL(request.url);
        // 'large_buy' -> '8193'
        expect(url.searchParams.get('type')).toBe('8193');
        return HttpResponse.json({
          data: {
            allstock: [
              {
                tm: 93055,
                c: '600519',
                n: '贵州茅台',
                t: 8193,
                i: '大笔买入 1000 万元',
              },
            ],
          },
        });
      })
    );

    const result = await sdk.getStockChanges('large_buy');
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe('09:30:55');
    expect(result[0].code).toBe('600519');
    expect(result[0].changeType).toBe('large_buy');
    expect(result[0].changeTypeLabel).toBe('大笔买入');
    expect(result[0].info).toBe('大笔买入 1000 万元');
  });

  it('throws on invalid change type', async () => {
    await expect(sdk.getStockChanges('foo' as never)).rejects.toThrow(
      /Invalid StockChangeType/
    );
  });
});

describe('TopicData - getBoardChanges', () => {
  const sdk = new StockSDK();

  it('parses board changes with top stock and direction', async () => {
    server.use(
      http.get(`${ZT_BASE}/getAllBKChanges`, () =>
        HttpResponse.json({
          data: {
            allbk: [
              {
                bkn: '白酒',
                bkz: 2.5,
                bkj: 5000000000,
                bkc: 50,
                ms: { m: 0, c: '600519', n: '贵州茅台' },
              },
              {
                bkn: '银行',
                bkz: -0.5,
                bkj: -1000000000,
                bkc: 20,
                ms: { m: 1, c: '601398', n: '工商银行' },
              },
            ],
          },
        })
      )
    );

    const result = await sdk.getBoardChanges();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('白酒');
    expect(result[0].topStockDirection).toBe('大笔买入');
    expect(result[1].topStockDirection).toBe('大笔卖出');
  });
});
