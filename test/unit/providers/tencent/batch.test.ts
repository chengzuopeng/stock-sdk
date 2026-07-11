import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestClient, clearClientScopedCaches } from '../../../../src/core';
import { getAShareCodeList, getUSCodeList } from '../../../../src/providers/tencent';

// 关掉 retry，避免错误响应触发 backoff
const client = new RequestClient({ retry: { maxRetries: 0 } });
// R7-11: 模块级共享 client 的用例间缓存隔离
beforeEach(() => clearClientScopedCaches(client));


describe('getAShareCodeList market filter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stub(list: string[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify({ list }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  it("market:'bj' matches Beijing exchange codes (4/8/920 开头), not only 92", async () => {
    stub([
      'sh600000',
      'sz000001',
      'sz300750',
      'bj830799', // 8 开头
      'bj870204', // 8 开头
      'bj430047', // 4 开头
      'bj920819', // 920 新代码段
      'sh900901', // 上海 B 股：9 开头但并非北交所，应被排除
    ]);
    const bj = await getAShareCodeList(client, { market: 'bj' });
    expect([...bj].sort()).toEqual(
      ['bj430047', 'bj830799', 'bj870204', 'bj920819'].sort()
    );
  });

  it("market:'sh'/'sz' filters stay unaffected", async () => {
    stub(['sh600000', 'sz000001', 'sz300750', 'bj830799']);
    expect(await getAShareCodeList(client, { market: 'sh' })).toEqual([
      'sh600000',
    ]);
    expect([...(await getAShareCodeList(client, { market: 'sz' }))].sort()).toEqual(
      ['sz000001', 'sz300750'].sort()
    );
  });
});

describe('getUSCodeList market filter (F41: 前缀映射复用 symbols 层)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stub(list: string[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify({ list }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  const US_LIST = ['105.AAPL', '105.MSFT', '106.BABA', '107.IMO', '1050.FAKE'];

  it('filters NASDAQ/NYSE/AMEX by 105./106./107. prefix', async () => {
    stub(US_LIST);
    expect(await getUSCodeList(client, { market: 'NASDAQ' })).toEqual([
      '105.AAPL',
      '105.MSFT',
    ]);
    expect(await getUSCodeList(client, { market: 'NYSE' })).toEqual([
      '106.BABA',
    ]);
    expect(await getUSCodeList(client, { market: 'AMEX' })).toEqual([
      '107.IMO',
    ]);
  });

  it("prefix match includes the dot ('1050.FAKE' 不被 105 误吞)", async () => {
    stub(US_LIST);
    const nasdaq = await getUSCodeList(client, { market: 'NASDAQ' });
    expect(nasdaq).not.toContain('1050.FAKE');
  });

  it('simple:true strips the market prefix after filtering', async () => {
    stub(US_LIST);
    expect(
      await getUSCodeList(client, { market: 'NASDAQ', simple: true })
    ).toEqual(['AAPL', 'MSFT']);
  });
});
