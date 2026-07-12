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

  it('非空短页后继续补抓（恢复串行版 length<total 不变式，波次版曾漏尾部行）', async () => {
    let calls = 0;
    // total=250 准确；p1=100、p2=80(短页)、p3=50 → 波次按 ceil 只翻到 p3 得 230，
    // 缺 20 行 → 串行补抓 p4=20 → 补齐 250
    const pages: Record<number, number> = { 1: 100, 2: 80, 3: 50, 4: 20 };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        calls++;
        const pn = Number(new URL(String(input)).searchParams.get('pn'));
        const n = pages[pn] ?? 0;
        const diff = Array.from({ length: n }, (_, i) => ({ f12: `p${pn}_${i}` }));
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

    expect(result).toHaveLength(250);
    expect(calls).toBe(4); // 补齐即停，不多翻
  }, 3000);

  it('补抓阶段遇空页即停（total 高报 + 短页并存也不死循环）', async () => {
    let calls = 0;
    // total=300 高报；p1=100、p2=80、p3=50 → 波次 230 < 300 → 补抓 p4 为空 → 止步
    const pages: Record<number, number> = { 1: 100, 2: 80, 3: 50 };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        calls++;
        const pn = Number(new URL(String(input)).searchParams.get('pn'));
        const n = pages[pn] ?? 0;
        const diff = Array.from({ length: n }, (_, i) => ({ f12: `p${pn}_${i}` }));
        return new Response(JSON.stringify({ data: { total: 300, diff } }), {
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

    expect(result).toHaveLength(230);
    expect(calls).toBe(4);
  }, 3000);
});
