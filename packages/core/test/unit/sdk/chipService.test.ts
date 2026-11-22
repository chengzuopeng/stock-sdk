/**
 * ChipService 编排测试:取数窗口估算 / 不足额 refetch / IPO 短路 /
 * 三市场路由 / 参数校验 / 选项透传。计算正确性由 chip.test.ts 的黄金对拍钉住,
 * 这里只验证 service 编排行为。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StockSDK } from '../../../src/sdk';
import { addDays, todayInTz, MARKET_TZ } from '../../../src/core/time';

/** 生成 count 根自然日连续的 kline CSV 行(east money kline/get 格式) */
function makeCsvRows(count: number, endDate?: string): string[] {
  const end = endDate ?? todayInTz(MARKET_TZ.CN);
  const rows: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const price = (20 + (i % 7) * 0.5).toFixed(2);
    // date,open,close,high,low,volume,amount,amplitude,changePercent,change,turnoverRate
    rows.push(
      `${date},${price},${price},${(Number(price) + 1).toFixed(2)},${(Number(price) - 1).toFixed(2)},10000,200000.00,5.00,0.50,0.10,3.5000`
    );
  }
  return rows;
}

describe('ChipService', () => {
  const sdk = new StockSDK({ retry: { maxRetries: 0 } });
  let urls: string[] = [];

  afterEach(() => {
    vi.unstubAllGlobals();
    urls = [];
  });

  /** 按调用次序返回不同 kline 行的 fetch stub */
  function stubKlines(...responses: string[][]) {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input));
        const klines = responses[Math.min(call, responses.length - 1)];
        call++;
        return new Response(JSON.stringify({ data: { klines } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  it('默认 days=90:单次取数(估算起点),返回尾部 90 行', async () => {
    const rows = makeCsvRows(320); // 足够覆盖 days90 + range120
    stubKlines(rows);
    const res = await sdk.chips.cn('600519');
    expect(urls).toHaveLength(1);
    // 估算起点按 (90+120)*1.5 自然日回推,而不是全量 19700101
    expect(urls[0]).toContain('secid=1.600519');
    expect(urls[0]).not.toContain('beg=19700101');
    expect(res).toHaveLength(90);
    // 尾行日期与输入尾行一致
    expect(res[res.length - 1].date).toBe(rows[rows.length - 1].split(',')[0]);
    expect(res[0].avgCost).not.toBeNull();
  });

  it('days 生效:days=5 返回 5 行', async () => {
    stubKlines(makeCsvRows(320));
    const res = await sdk.chips.cn('600519', { days: 5 });
    expect(res).toHaveLength(5);
  });

  it('range=0(全量累计口径)直接全量取数(beg=19700101)', async () => {
    stubKlines(makeCsvRows(60));
    const res = await sdk.chips.cn('600519', { days: 10, range: 0 });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('beg=19700101');
    expect(res).toHaveLength(10);
  });

  it('返回不足额且首根贴着估算起点 → 全量 refetch', async () => {
    // 首次返回 50 根、首根日期在遥远过去(≤ 估算起点+30 天)→ 触发第二次全量取数
    const shortOld = makeCsvRows(50, '2001-06-30');
    const full = makeCsvRows(320);
    stubKlines(shortOld, full);
    const res = await sdk.chips.cn('600519');
    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain('beg=19700101');
    expect(res).toHaveLength(90);
  });

  it('次新股短路(F35 同款):首根明显晚于估算起点 → 不做无谓 refetch', async () => {
    // 首根日期就在最近 40 天内(上市晚),上游不会有更早数据
    const ipoRows = makeCsvRows(30);
    stubKlines(ipoRows);
    const res = await sdk.chips.cn('600519');
    expect(urls).toHaveLength(1);
    // 数据不足 needed 也照算(窗口自动从首根累计),输出 min(days, 可用行)
    expect(res).toHaveLength(30);
  });

  it('空 K 线返回空数组', async () => {
    stubKlines([]);
    // 空返回会触发一次 refetch(mayHaveEarlierData 对空数组为 true),仍为空
    const res = await sdk.chips.cn('600519');
    expect(res).toEqual([]);
  });

  it('港股路由:secid=116.xxxxx', async () => {
    stubKlines(makeCsvRows(320));
    await sdk.chips.hk('00700', { days: 3 });
    expect(urls[0]).toContain('secid=116.00700');
  });

  it('美股路由:secid 直传 {market}.{ticker}', async () => {
    stubKlines(makeCsvRows(320));
    await sdk.chips.us('105.AAPL', { days: 3 });
    expect(urls[0]).toContain('secid=105.AAPL');
  });

  it('adjust 透传到 kline 请求(fqt),默认 qfq=1', async () => {
    stubKlines(makeCsvRows(320));
    await sdk.chips.cn('600519', { days: 3 });
    expect(urls[0]).toContain('fqt=1');
    urls = [];
    stubKlines(makeCsvRows(320));
    await sdk.chips.cn('600519', { days: 3, adjust: '' });
    expect(urls[0]).toContain('fqt=0');
  });

  it("includeHistogram: 'last' 透传:仅尾行附带直方图", async () => {
    stubKlines(makeCsvRows(320));
    const res = await sdk.chips.cn('600519', { days: 5, includeHistogram: 'last' });
    expect(res[4].histogram).toBeDefined();
    expect(res[0].histogram).toBeUndefined();
  });

  it('decimals 透传:比例类字段按指定位数舍入', async () => {
    stubKlines(makeCsvRows(320));
    const res = await sdk.chips.cn('600519', { days: 3, decimals: 1 });
    for (const r of res) {
      if (r.profitRatio !== null) {
        expect(r.profitRatio).toBe(Number(r.profitRatio.toFixed(1)));
      }
    }
  });

  it('参数校验:days / range 非法时零上游请求即拒', async () => {
    stubKlines(makeCsvRows(10));
    await expect(sdk.chips.cn('600519', { days: 0 })).rejects.toThrow(/days/);
    await expect(sdk.chips.cn('600519', { days: 1.5 })).rejects.toThrow(/days/);
    await expect(sdk.chips.cn('600519', { range: -1 })).rejects.toThrow(/range/);
    await expect(
      sdk.chips.cn('600519', { range: 2.5 })
    ).rejects.toThrow(/range/);
    expect(urls).toHaveLength(0);
  });
});
