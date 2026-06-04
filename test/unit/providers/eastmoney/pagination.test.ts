import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestClient } from '../../../../src/core';
import { fetchPaginatedData } from '../../../../src/providers/eastmoney/utils';

describe('fetchPaginatedData pagination guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops paginating when a page returns an empty diff (over-reported total)', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls++;
        // total 被高报为 250；前两页各 100 条，第 3 页越界返回空数组（非 null）。
        // 修复前 Array.isArray([]) 为真不会 break，allData(200) < total(250) 恒成立 → 死循环。
        const diff =
          calls <= 2
            ? Array.from({ length: 100 }, (_, i) => ({ f12: `c${calls}_${i}` }))
            : [];
        return new Response(JSON.stringify({ data: { total: 250, diff } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );

    const client = new RequestClient({ retry: { maxRetries: 0 } });
    const result = await fetchPaginatedData<string>(
      client,
      'https://example.com/clist',
      {},
      'f12',
      100,
      (item) => item.f12 as string
    );

    expect(result).toHaveLength(200);
    expect(calls).toBe(3); // 第 3 页为空即跳出，不会无限翻页
  }, 3000); // 显式超时：若回归成死循环，3s 内失败而非长时间挂起
});
