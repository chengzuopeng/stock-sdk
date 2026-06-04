import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestClient } from '../../../../src/core';
import { getAShareCodeList } from '../../../../src/providers/tencent';

// 关掉 retry，避免错误响应触发 backoff
const client = new RequestClient({ retry: { maxRetries: 0 } });

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
