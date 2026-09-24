import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import StockSDK from '../../../../src/index';
import { RequestClient } from '../../../../src/core';
import { getIndividualStockChanges } from '../../../../src/providers/eastmoney';

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

    const result = await sdk.marketEvent.ztPool('zt', '20240115');
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

    await sdk.marketEvent.ztPool('zt', '2024-01-15');
  });

  it('returns empty array when pool is empty', async () => {
    server.use(
      http.get(`${ZT_BASE}/getTopicZTPool`, () =>
        HttpResponse.json({ data: { pool: [] } })
      )
    );

    const result = await sdk.marketEvent.ztPool('zt');
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

    await sdk.marketEvent.ztPool('zt'); // 不传 date

    expect(capturedDate).not.toBeNull();
    // 默认应使用北京时间 YYYYMMDD（8 位数字）
    expect(capturedDate).toMatch(/^\d{8}$/);
  });

  describe('F43: 默认 date 走 core/time todayInTz', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('UTC 仍是 12-31 时按北京时间取 01-01', async () => {
      // UTC 2025-12-31 20:00 = 北京 2026-01-01 04:00(只 fake Date,timer 保持真实)
      vi.useFakeTimers({ now: Date.UTC(2025, 11, 31, 20, 0), toFake: ['Date'] });
      let capturedDate: string | null = null;
      server.use(
        http.get(`${ZT_BASE}/getTopicZTPool`, ({ request }) => {
          capturedDate = new URL(request.url).searchParams.get('date');
          return HttpResponse.json({ data: { pool: [] } });
        })
      );

      await sdk.marketEvent.ztPool('zt'); // 不传 date

      expect(capturedDate).toBe('20260101');
    });
  });

  it('uses different endpoint for strong pool', async () => {
    let endpointCalled = '';
    server.use(
      http.get(`${ZT_BASE}/getTopicQSPool`, () => {
        endpointCalled = 'strong';
        return HttpResponse.json({ data: { pool: [] } });
      })
    );

    await sdk.marketEvent.ztPool('strong', '20240115');
    expect(endpointCalled).toBe('strong');
  });

  it('throws on unknown pool type', async () => {
    await expect(sdk.marketEvent.ztPool('unknown' as never)).rejects.toThrow(
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

    const result = await sdk.marketEvent.stockChanges('large_buy');
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe('09:30:55');
    expect(result[0].code).toBe('600519');
    expect(result[0].changeType).toBe('large_buy');
    expect(result[0].changeTypeLabel).toBe('大笔买入');
    expect(result[0].info).toBe('大笔买入 1000 万元');
  });

  it('throws on invalid change type', async () => {
    await expect(sdk.marketEvent.stockChanges('foo' as never)).rejects.toThrow(
      /Invalid StockChangeType/
    );
    await expect(sdk.marketEvent.stockChanges([] as never)).rejects.toThrow(
      /不能为空/
    );
  });

  it('多类型数组:type 参数逗号拼接,changeType 按响应 t 码区分,未知码容错', async () => {
    server.use(
      http.get(`${ZT_BASE}/getAllStockChanges`, ({ request }) => {
        // 防回归:必须是【裸逗号】—— 服务端不解码 %2C,编码后多类型会
        // 静默退化为只识别第一个类型码(集成测试实测发现)
        expect(request.url).toContain('type=8201,4');
        expect(request.url).not.toContain('%2C');
        const url = new URL(request.url);
        // rocket_launch=8201, limit_up_seal=4
        expect(url.searchParams.get('type')).toBe('8201,4');
        return HttpResponse.json({
          data: {
            tc: 3,
            allstock: [
              { tm: 93055, c: '600519', n: '贵州茅台', t: 4, i: 'a' },
              { tm: 93100, c: '000001', n: '平安银行', t: 8201, i: 'b' },
              { tm: 93200, c: '300001', n: '特锐德', t: 8219, i: 'c' },
            ],
          },
        });
      })
    );

    const result = await sdk.marketEvent.stockChanges([
      'rocket_launch',
      'limit_up_seal',
    ]);
    expect(result).toHaveLength(3);
    expect(result[0].changeType).toBe('limit_up_seal');
    expect(result[0].typeCode).toBe('4');
    expect(result[1].changeType).toBe('rocket_launch');
    expect(result[1].changeTypeLabel).toBe('火箭发射');
    // 22 类之外的码:changeType 'unknown',原始码保留在 typeCode
    expect(result[2].changeType).toBe('unknown');
    expect(result[2].typeCode).toBe('8219');
    expect(result[2].changeTypeLabel).toBe('');
  });

  it("'all':请求全部 22 类且按 tc 自动翻页收全", async () => {
    const pageIndexes: string[] = [];
    const makeItems = (count: number, offset: number) =>
      Array.from({ length: count }, (_, i) => ({
        tm: 93000,
        c: String(600000 + offset + i),
        n: `股票${offset + i}`,
        t: 8193,
        i: '',
      }));
    server.use(
      http.get(`${ZT_BASE}/getAllStockChanges`, ({ request }) => {
        const url = new URL(request.url);
        const typeParam = url.searchParams.get('type') ?? '';
        expect(typeParam.split(',')).toHaveLength(22);
        const page = url.searchParams.get('pageindex') ?? '0';
        pageIndexes.push(page);
        return HttpResponse.json({
          data: {
            tc: 5001,
            allstock: page === '0' ? makeItems(5000, 0) : makeItems(1, 5000),
          },
        });
      })
    );

    const result = await sdk.marketEvent.stockChanges('all');
    expect(result).toHaveLength(5001);
    expect(pageIndexes).toEqual(['0', '1']);
  });
});

describe('TopicData - getStockChanges 分页 (#65)', () => {
  interface ChangesCall {
    type: string;
    pageindex: string | null;
    pagesize: string | null;
  }

  /** 按 pageindex / pagesize 回页(tc = total),记录每次请求参数 */
  function mockChanges(total: number): ChangesCall[] {
    const calls: ChangesCall[] = [];
    server.use(
      http.get(`${ZT_BASE}/getAllStockChanges`, ({ request }) => {
        const url = new URL(request.url);
        const pageIndex = Number(url.searchParams.get('pageindex'));
        const pageSize = Number(url.searchParams.get('pagesize'));
        calls.push({
          type: url.searchParams.get('type') ?? '',
          pageindex: url.searchParams.get('pageindex'),
          pagesize: url.searchParams.get('pagesize'),
        });
        const offset = pageIndex * pageSize;
        const size = Math.max(0, Math.min(pageSize, total - offset));
        return HttpResponse.json({
          data: {
            tc: total,
            allstock: Array.from({ length: size }, (_, i) => ({
              tm: 93000,
              c: String(600000 + offset + i),
              n: `股票${offset + i}`,
              t: 8193,
              i: '',
            })),
          },
        });
      })
    );
    return calls;
  }

  it('传 page + pageSize 只请求该页:对外 page 从 1 开始,映射为上游 pageindex 从 0 开始', async () => {
    const calls = mockChanges(12000);
    const result = await new StockSDK().marketEvent.stockChanges('all', {
      page: 2,
      pageSize: 50,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].type.split(',')).toHaveLength(22);
    expect(calls[0]).toMatchObject({ pageindex: '1', pagesize: '50' });
    expect(result).toHaveLength(50);
    expect(result[0].code).toBe('600050');
    expect(result[0].changeType).toBe('large_buy');
  });

  it('只传 page 时 pageSize 默认 100;type 缺省仍为 large_buy', async () => {
    const calls = mockChanges(12000);
    const result = await new StockSDK().marketEvent.stockChanges(undefined, { page: 1 });
    expect(calls).toEqual([{ type: '8193', pageindex: '0', pagesize: '100' }]);
    expect(result).toHaveLength(100);
  });

  it('越界页返回空数组', async () => {
    const calls = mockChanges(30);
    const result = await new StockSDK().marketEvent.stockChanges('large_buy', { page: 5 });
    expect(result).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('非法分页参数(含 pageSize 超上游单页上限 5000)在请求前抛 InvalidArgumentError', async () => {
    const calls = mockChanges(100);
    const sdk = new StockSDK();
    await expect(
      sdk.marketEvent.stockChanges('all', { pageSize: 5001 })
    ).rejects.toThrow(/marketEvent\.stockChanges: pageSize 需为 1-5000 的整数/);
    await expect(
      sdk.marketEvent.stockChanges('large_buy', { page: -1 })
    ).rejects.toThrow(/marketEvent\.stockChanges: page/);
    expect(calls).toHaveLength(0);
  });
});

describe('TopicData - getIndividualStockChanges(个股按日异动)', () => {
  const sdk = new StockSDK();

  it('解析实测真实响应样本(603087 甘李药业):code/market/date 参数与全字段', async () => {
    server.use(
      http.get(`${ZT_BASE}/getStockChanges`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('code')).toBe('603087');
        expect(url.searchParams.get('market')).toBe('1'); // 6xx → 沪市
        expect(url.searchParams.get('date')).toBe('20260706');
        // 2026-07-06 实测真实响应(节选)
        return HttpResponse.json({
          rc: 0,
          rt: 101,
          data: {
            d: 20260706,
            c: '603087',
            m: 1,
            n: '甘李药业',
            data: [
              { tm: 145650, t: 16, p: 67080, i: '67.080000,0.099852', u: '9.99', v: 53 },
              {
                tm: 145605,
                t: 4,
                p: 67090,
                i: '67.090000,1260,67.09000,0.100016',
                u: '10.00',
                v: 178,
              },
              { tm: 111951, t: 8219, p: 61730, i: '61.73000,0.078253', u: '7.83', v: 22 },
            ],
          },
        });
      })
    );

    const result = await sdk.marketEvent.individualChanges('603087', {
      date: '20260706',
    });
    expect(result).toHaveLength(3);
    expect(result[0].time).toBe('14:56:50');
    expect(result[0].typeCode).toBe('16');
    expect(result[0].changeType).toBe('limit_up_open');
    expect(result[0].changeTypeLabel).toBe('打开涨停板');
    expect(result[0].price).toBe(67.08);
    expect(result[0].changePercent).toBe(9.99);
    expect(result[0].v).toBe(53);
    expect(result[1].changeType).toBe('limit_up_seal');
    expect(result[1].price).toBe(67.09);
    // 个股接口会返回 22 类之外的码 → unknown + 原始码保留
    expect(result[2].changeType).toBe('unknown');
    expect(result[2].typeCode).toBe('8219');
  });

  it('symbol 经 symbols 层归一(sz 前缀→market=0),YYYY-MM-DD 日期归一', async () => {
    server.use(
      http.get(`${ZT_BASE}/getStockChanges`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('code')).toBe('000001');
        expect(url.searchParams.get('market')).toBe('0'); // 深市
        expect(url.searchParams.get('date')).toBe('20260703');
        return HttpResponse.json({
          data: { d: 20260703, c: '000001', m: 0, n: '平安银行', data: [] },
        });
      })
    );

    const result = await sdk.marketEvent.individualChanges('sz000001', {
      date: '2026-07-03',
    });
    expect(result).toEqual([]);
  });

  it('不传 date 时默认北京时间今天(YYYYMMDD)', async () => {
    let capturedDate: string | null = null;
    server.use(
      http.get(`${ZT_BASE}/getStockChanges`, ({ request }) => {
        capturedDate = new URL(request.url).searchParams.get('date');
        return HttpResponse.json({
          data: { c: '600519', m: 1, n: '贵州茅台', data: [] },
        });
      })
    );

    await sdk.marketEvent.individualChanges('600519');
    expect(capturedDate).toMatch(/^\d{8}$/);
  });

  it('data:null(超出服务端保留窗口)返回空数组', async () => {
    server.use(
      http.get(`${ZT_BASE}/getStockChanges`, () =>
        HttpResponse.json({ rc: 0, rt: 101, data: null })
      )
    );

    const result = await sdk.marketEvent.individualChanges('600519', {
      date: '20260605',
    });
    expect(result).toEqual([]);
  });

  it('非个股符号(板块/指数)零请求即拒,不静默返回空', async () => {
    // 未挂 handler:若守卫失效发出请求,MSW onUnhandledRequest:'error' 会让用例失败
    // 板块显式 secid 形态归类为 board → 命中 assetType 守卫
    await expect(
      sdk.marketEvent.individualChanges('90.BK0475')
    ).rejects.toThrow(/仅支持 A 股个股/);
    // 特殊指数(注册表明确标记 index)→ 同样拒绝。
    // 注:sh000001 这类交易所同码歧义(上证指数 vs 平安银行)在 symbols 层
    // 归类为 stock,守卫放行、由服务端返回空 —— 守卫只拦"确定非个股"的输入
    await expect(sdk.marketEvent.individualChanges('930955')).rejects.toThrow(
      /仅支持 A 股个股/
    );
    await expect(
      sdk.marketEvent.individualChangesHistory('930955')
    ).rejects.toThrow(/仅支持 A 股个股/);
    // 裸乱码由 symbols 层拒绝(另一条报错路径,同样零请求)
    await expect(sdk.marketEvent.individualChanges('BK0475')).rejects.toThrow(
      /Invalid symbol/
    );
  });

  it('date 优先取服务端回显 data.d:非交易日请求被归一时不误标日期', async () => {
    server.use(
      http.get(`${ZT_BASE}/getStockChanges`, () =>
        HttpResponse.json({
          // 请求周日 20260705,服务端回退到周五并回显 d=20260703
          data: { d: 20260703, c: '600519', m: 1, n: '贵州茅台', data: [] },
        })
      )
    );

    const day = await getIndividualStockChanges(
      new RequestClient({ retry: { maxRetries: 0 } }),
      '600519',
      '20260705'
    );
    expect(day.date).toBe('2026-07-03');
    expect(day.available).toBe(true);
  });
});

describe('TopicData - getUnusualFluctuation(监管异动)', () => {
  const sdk = new StockSDK();
  const DC_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

  function dcPayload(rows: Record<string, unknown>[]) {
    return { success: true, code: 0, result: { data: rows, count: rows.length, pages: 1 } };
  }

  it('解析真实上游样本:规则原文/触发标记/偏离值/方向', async () => {
    let captured = '';
    server.use(
      http.get(DC_URL, ({ request }) => {
        captured = new URL(request.url).searchParams.get('filter') ?? '';
        return HttpResponse.json(
          dcPayload([
            {
              SECURITY_CODE: '601086',
              SECURITY_NAME_ABBR: '国芳集团',
              TRADE_DATE: '2026-09-11 00:00:00',
              UNUSUAL_TYPE: '连续十个交易日内日收盘价涨跌幅偏离值累计达到+100%',
              IS_HAPPEN: '0',
              IS_POSITIVE: '1',
              DEVUATION_VALUE: 97.66,
              MAX_DAYS: 10,
              CHANGE_RATE: 8.206485771013,
              CHANGE_RATE_TARGET: 9.5,
            },
            {
              SECURITY_CODE: '002102',
              SECURITY_NAME_ABBR: '*ST萃华',
              TRADE_DATE: '2026-09-11 00:00:00',
              UNUSUAL_TYPE: '连续三十个交易日内日收盘价涨跌幅偏离值累计达到-70%',
              IS_HAPPEN: '1',
              IS_POSITIVE: '0',
              DEVUATION_VALUE: -71.17,
              MAX_DAYS: 30,
              CHANGE_RATE: -9.57,
              CHANGE_RATE_TARGET: -6.42,
            },
          ])
        );
      })
    );

    const rows = await sdk.marketEvent.unusualFluctuation({ date: '20260911' });
    expect(captured).toContain("(TRADE_DATE='2026-09-11')");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      code: '601086',
      name: '国芳集团',
      date: '2026-09-11',
      timestamp: 1789056000000,
      tz: 'Asia/Shanghai',
      rule: '连续十个交易日内日收盘价涨跌幅偏离值累计达到+100%',
      triggered: false,
      deviationValue: 97.66,
      windowDays: 10,
      changePercent: 8.206485771013,
      direction: 'up',
      targetChangePercent: 9.5,
    });
    expect(rows[1].triggered).toBe(true);
    expect(rows[1].direction).toBe('down');
  });

  it('triggered 与日期区间转成 datacenter filter', async () => {
    let captured = '';
    server.use(
      http.get(DC_URL, ({ request }) => {
        captured = new URL(request.url).searchParams.get('filter') ?? '';
        return HttpResponse.json(dcPayload([]));
      })
    );

    await sdk.marketEvent.unusualFluctuation({
      startDate: '20260901',
      endDate: '2026-09-11',
      triggered: true,
    });
    expect(captured).toContain("(TRADE_DATE>='2026-09-01')");
    expect(captured).toContain("(TRADE_DATE<='2026-09-11')");
    expect(captured).toContain('(IS_HAPPEN="1")');
  });

  it('date 与 startDate/endDate 互斥', async () => {
    await expect(
      sdk.marketEvent.unusualFluctuation({ date: '20260911', startDate: '20260901' })
    ).rejects.toThrow(/不能同时指定/);
  });
});

describe('TopicData - getBoardChanges', () => {
  const sdk = new StockSDK();

  it('#73: 解析上游改名后的字段 n/u/zjl/ct,ydl 数组转为类型码→次数分布', async () => {
    server.use(
      http.get(`${ZT_BASE}/getAllBKChanges`, () =>
        HttpResponse.json({
          data: {
            allbk: [
              {
                c: 'BK0596',
                m: 90,
                n: '融资融券',
                u: '-0.42',
                zjl: -4166062.08,
                ct: 8021,
                ms: { c: '920071', m: 0, n: '金钛股份', t: 8 },
                ydl: [
                  { t: 8201, ct: 1288 },
                  { t: 8193, ct: 1147 },
                  { t: 128, ct: 922 },
                ],
              },
              {
                c: 'BK0475',
                m: 90,
                n: '银行',
                u: 0.5,
                zjl: 1000000,
                ct: 20,
                ms: { c: '601398', m: 1, n: '工商银行', t: 4 },
                ydl: [],
              },
            ],
          },
        })
      )
    );

    const result = await sdk.marketEvent.boardChanges();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: '融资融券',
      changePercent: -0.42,
      mainNetInflow: -4166062.08,
      totalChangeCount: 8021,
      topStockCode: '920071',
      topStockName: '金钛股份',
      topStockDirection: '大笔买入',
      changeTypeDistribution: { '8201': 1288, '8193': 1147, '128': 922 },
    });
    expect(result[1].name).toBe('银行');
    expect(result[1].changePercent).toBe(0.5);
    expect(result[1].topStockDirection).toBe('大笔卖出');
    expect(result[1].changeTypeDistribution).toEqual({});
  });

  it('兼容旧字段 bkn/bkz/bkj/bkc 与对象形态的 bkdf 分布', async () => {
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
                bkdf: { '8201': 30, '4': 20 },
                ms: { m: 0, c: '600519', n: '贵州茅台' },
              },
            ],
          },
        })
      )
    );

    const result = await sdk.marketEvent.boardChanges();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: '白酒',
      changePercent: 2.5,
      mainNetInflow: 5000000000,
      totalChangeCount: 50,
      topStockDirection: '大笔买入',
      changeTypeDistribution: { '8201': 30, '4': 20 },
    });
  });
});
