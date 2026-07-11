/**
 * R7-2/R7-3 行情入口代码归一回归：
 * 8 个 codes 入口（fund 除外，基金码是独立命名空间）统一经
 * tryToTencentSymbols 容错归一 —— 裸代码可用、带前缀不再双拼、
 * 无法映射的代码逐码跳过而非整批抛错。
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestClient } from '../../../../src/core';
import { tryToTencentSymbols } from '../../../../src/symbols';
import { getFullQuotes, getSimpleQuotes } from '../../../../src/providers/tencent/quote';
import { getHKQuotes } from '../../../../src/providers/tencent/hkQuote';
import { getUSQuotes } from '../../../../src/providers/tencent/usQuote';
import { getFundFlow, getPanelLargeOrder } from '../../../../src/providers/tencent/fundFlow';

/** 造一行能通过各入口长度过滤的响应（fields 全 '1'，纯 ASCII）。 */
function row(key: string, fieldCount: number): { key: string; fields: string[] } {
  return { key, fields: Array(fieldCount).fill('1') };
}

/** fake client：记录 getTencentQuote 收到的查询串并返回预置行。 */
function fakeClient(rows: Array<{ key: string; fields: string[] }>) {
  const getTencentQuote = vi.fn(async () => rows);
  return { client: { getTencentQuote } as unknown as RequestClient, getTencentQuote };
}

describe('tryToTencentSymbols', () => {
  it('CN：裸码/带前缀/大写前缀归一为 sh/sz/bj 形', () => {
    const { keys, invalid } = tryToTencentSymbols(['600036', 'sh600519', 'SZ000858'], 'CN');
    expect(keys).toEqual(['sh600036', 'sh600519', 'sz000858']);
    expect(invalid).toEqual([]);
  });

  it('逐码容错：特殊指数码（腾讯无映射）跳过，不影响其它代码', () => {
    const { keys, invalid } = tryToTencentSymbols(['600519', '930955'], 'CN');
    expect(keys).toEqual(['sh600519']);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].code).toBe('930955');
  });

  it('HK：带不带 hk 前缀均可，自动补零', () => {
    expect(tryToTencentSymbols(['00700', 'hk09988', '700'], 'HK').keys).toEqual([
      'hk00700',
      'hk09988',
      'hk00700',
    ]);
  });

  it('US：带不带 us 前缀均可', () => {
    expect(tryToTencentSymbols(['BABA', 'usAAPL'], 'US').keys).toEqual(['usBABA', 'usAAPL']);
  });
});

describe('quotes 入口归一（R7-2）', () => {
  it('getFullQuotes：裸代码归一后请求且能匹配返回行（此前必空）', async () => {
    const { client, getTencentQuote } = fakeClient([row('sh600036', 80), row('sh600519', 80)]);
    const result = await getFullQuotes(client, ['600036', 'sh600519']);
    expect(getTencentQuote).toHaveBeenCalledWith('sh600036,sh600519');
    expect(result).toHaveLength(2);
  });

  it('getFullQuotes：无法映射的代码跳过，其余正常返回（不整批抛错）', async () => {
    const { client, getTencentQuote } = fakeClient([row('sh600519', 80)]);
    const result = await getFullQuotes(client, ['600519', '930955']);
    expect(getTencentQuote).toHaveBeenCalledWith('sh600519');
    expect(result).toHaveLength(1);
  });

  it('getFullQuotes：全部无法映射时直接返回 []，不发请求', async () => {
    const { client, getTencentQuote } = fakeClient([]);
    const result = await getFullQuotes(client, ['930955']);
    expect(getTencentQuote).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('getSimpleQuotes：s_ 前缀叠加在归一后的 key 上', async () => {
    const { client, getTencentQuote } = fakeClient([row('s_sh600036', 12)]);
    const result = await getSimpleQuotes(client, ['600036']);
    expect(getTencentQuote).toHaveBeenCalledWith('s_sh600036');
    expect(result).toHaveLength(1);
  });
});

describe('hk/us 入口归一（R7-3）', () => {
  it('getHKQuotes：带前缀输入不再双拼成 hkhk00700', async () => {
    const { client, getTencentQuote } = fakeClient([row('hk00700', 50), row('hk09988', 50)]);
    const result = await getHKQuotes(client, ['hk00700', '09988']);
    expect(getTencentQuote).toHaveBeenCalledWith('hk00700,hk09988');
    expect(result).toHaveLength(2);
  });

  it('getUSQuotes：usBABA 不再双拼成 ususBABA', async () => {
    const { client, getTencentQuote } = fakeClient([row('usBABA', 55), row('usAAPL', 55)]);
    const result = await getUSQuotes(client, ['usBABA', 'AAPL']);
    expect(getTencentQuote).toHaveBeenCalledWith('usBABA,usAAPL');
    expect(result).toHaveLength(2);
  });
});

describe('fundFlow / largeOrder 入口归一（R7-2）', () => {
  it('getFundFlow：ff_ 前缀叠加在归一后的 key 上（裸码此前拼出 ff_600036 必空）', async () => {
    const { client, getTencentQuote } = fakeClient([row('ff_sh600036', 14)]);
    const result = await getFundFlow(client, ['600036']);
    expect(getTencentQuote).toHaveBeenCalledWith('ff_sh600036');
    expect(result).toHaveLength(1);
  });

  it('getPanelLargeOrder：s_pk 前缀叠加在归一后的 key 上', async () => {
    const { client, getTencentQuote } = fakeClient([row('s_pksz000858', 4)]);
    const result = await getPanelLargeOrder(client, ['000858']);
    expect(getTencentQuote).toHaveBeenCalledWith('s_pksz000858');
    expect(result).toHaveLength(1);
  });
});

describe('R7-9 入口级：截断行丢弃、合法短行保留（回归钉住）', () => {
  it('getFullQuotes：缺关键字段的截断行（37 字段）被丢弃', async () => {
    const { client } = fakeClient([row('sh600519', 37)]); // < FULL_QUOTE_MIN_FIELDS(38)
    expect(await getFullQuotes(client, ['sh600519'])).toEqual([]);
  });

  it('getFullQuotes：关键字段齐全的合法短行（38 字段，指数无尾部可空列）被保留', async () => {
    const { client } = fakeClient([row('sh000001', 38)]);
    const result = await getFullQuotes(client, ['sh000001']);
    expect(result).toHaveLength(1);
    expect(result[0].totalShares).toBeNull(); // 尾部可空字段缺失 → null，不伪造
  });

  it('getHKQuotes：37 字段截断行丢弃，50 字段完整行保留', async () => {
    const { client: c1 } = fakeClient([row('hk00700', 37)]);
    expect(await getHKQuotes(c1, ['hk00700'])).toEqual([]);
    const { client: c2 } = fakeClient([row('hk00700', 50)]);
    expect(await getHKQuotes(c2, ['hk00700'])).toHaveLength(1);
  });
});

describe('R7-9 一致性：7 个腾讯行情入口全部走 filterTencentRows（防新站点手写）', () => {
  const SITES = [
    'src/providers/tencent/quote.ts',
    'src/providers/tencent/hkQuote.ts',
    'src/providers/tencent/usQuote.ts',
    'src/providers/tencent/fundQuote.ts',
    'src/providers/tencent/fundFlow.ts',
  ];

  it.each(SITES)('%s 调用 filterTencentRows 且无裸 .fields.length 手写过滤', async (relPath) => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const root = fileURLToPath(new URL('../../../../', import.meta.url));
    const src = readFileSync(root + relPath, 'utf8');
    expect(src).toContain('filterTencentRows');
    // 手写过滤的特征：直接对 d.fields.length 做数字比较
    expect(/\.fields\.length\s*[><]/.test(src), '不应保留手写长度过滤').toBe(false);
  });
});
