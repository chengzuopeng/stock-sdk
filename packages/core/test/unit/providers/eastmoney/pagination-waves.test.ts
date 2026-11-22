/**
 * R7-14 波次并发翻页回归：
 * - 并发窗口 ≤ concurrency；结果与串行版逐位一致（行序 + 跨页连续行号契约）
 * - 坏页/空页 → 前缀截断（与串行 break 同语义，时序数据不出现中部空洞）
 * - clist 短页 = 终止页（保留内容、其后丢弃）
 * - maxPages 截断 warn 保留；futuresGlobal 不并行化（F7 钉死用例继续生效）
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { RequestClient } from '../../../../src/core';
import { fetchDatacenter } from '../../../../src/providers/eastmoney/datacenter';
import { fetchPaginatedData } from '../../../../src/providers/eastmoney/utils';
import { getFundFlowRank } from '../../../../src/providers/eastmoney/fundFlow';

afterEach(() => {
  vi.restoreAllMocks();
});

/** 记录请求页序与最大并发的 fake client。 */
function pagedClient(handler: (page: number) => unknown) {
  let inflight = 0;
  let maxInflight = 0;
  const pages: number[] = [];
  const get = vi.fn(async (url: string) => {
    const u = new URL(url);
    const page = Number(u.searchParams.get('pageNumber') ?? u.searchParams.get('pn'));
    pages.push(page);
    inflight++;
    maxInflight = Math.max(maxInflight, inflight);
    await new Promise((r) => setTimeout(r, 2));
    inflight--;
    return handler(page);
  });
  return {
    client: { get } as unknown as RequestClient,
    pages,
    maxInflight: () => maxInflight,
  };
}

describe('fetchDatacenter 波次并发', () => {
  const dcPage = (page: number, totalPages: number, rowsPerPage: number) => ({
    result: {
      pages: totalPages,
      count: totalPages * rowsPerPage,
      data: Array.from({ length: rowsPerPage }, (_, i) => ({
        ROW: `${page}-${i}`,
      })),
    },
  });

  it('结果顺序与跨页行号契约与串行一致；并发窗口 ≤ concurrency', async () => {
    const { client, pages, maxInflight } = pagedClient((p) => dcPage(p, 7, 3));
    const result = await fetchDatacenter(
      client,
      { reportName: 'RPT_TEST', concurrency: 3 },
      (item, index) => ({ row: item.ROW as string, index })
    );

    expect(result.pages).toBe(7);
    expect(result.data).toHaveLength(21);
    // 行序：页序 × 页内序
    expect(result.data.map((r) => r.row).slice(0, 5)).toEqual([
      '1-0', '1-1', '1-2', '2-0', '2-1',
    ]);
    // mapper 第二参：跨页连续（dragonTiger rank 依赖）
    expect(result.data.map((r) => r.index)).toEqual(
      Array.from({ length: 21 }, (_, i) => i)
    );
    expect(maxInflight()).toBeLessThanOrEqual(3);
    // 下界：真并发（≥2 同时在飞），否则退化成串行也能过上界断言（review 指出）
    expect(maxInflight()).toBeGreaterThanOrEqual(2);
    expect(pages[0]).toBe(1); // 首页串行先行
  });

  it('中途坏页 → 前缀截断且不再调度后续波（无中部空洞）', async () => {
    const { client, pages } = pagedClient((p) =>
      p === 4 ? { result: null } : dcPage(p, 8, 2)
    );
    const result = await fetchDatacenter(
      client,
      { reportName: 'RPT_TEST', concurrency: 3 },
      (item, index) => ({ row: item.ROW as string, index })
    );
    // 页 1-3 保留（6 行），页 4 坏 → 其后全部丢弃
    expect(result.data).toHaveLength(6);
    expect(result.data.at(-1)!.row).toBe('3-1');
    // 页 5-8 不再请求（坏页所在波 [2,3,4] 已发出属浪费上限内）
    expect(Math.max(...pages)).toBeLessThanOrEqual(4);
  });

  it('maxPages 截断 warn 保留', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = pagedClient((p) => dcPage(p, 10, 1));
    const result = await fetchDatacenter(
      client,
      { reportName: 'RPT_TEST', maxPages: 3 },
      (item) => item
    );
    expect(result.data).toHaveLength(3);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('maxPages=3');
  });

  it('fetchAllPages=false 只取首页', async () => {
    const { client, pages } = pagedClient((p) => dcPage(p, 5, 2));
    const result = await fetchDatacenter(
      client,
      { reportName: 'RPT_TEST', fetchAllPages: false },
      (item) => item
    );
    expect(result.data).toHaveLength(2);
    expect(pages).toEqual([1]);
  });

  it('首页坏页：返回空结果（pages 兜底 1，与串行一致）', async () => {
    const { client } = pagedClient(() => ({ result: null }));
    const result = await fetchDatacenter(client, { reportName: 'RPT_TEST' }, (i) => i);
    expect(result).toEqual({ data: [], total: 0, pages: 1 });
  });
});

describe('fetchPaginatedData 波次并发', () => {
  const clistPage = (page: number, total: number, rows: number) => ({
    data: {
      total,
      diff: Array.from({ length: rows }, (_, i) => ({ ROW: `${page}-${i}` })),
    },
  });

  it('1-based 跨页行号契约保持；空页前缀截断（F7 同款保护）', async () => {
    const { client } = pagedClient((p) => (p === 3 ? clistPage(p, 999, 0) : clistPage(p, 10, 2)));
    const rows = await fetchPaginatedData(
      client,
      'https://push2.eastmoney.com/api/qt/clist/get',
      {},
      'f12',
      2,
      (item, index) => ({ row: item.ROW as string, index })
    );
    // total=10/pz=2 → 5 页；页 3 空 → 保留页 1-2
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.index)).toEqual([1, 2, 3, 4]); // 保持 1-based 连续
  });
});

describe('getFundFlowRank（fetchClistAllPages 波次并发）', () => {
  it('短页为终止页：保留内容、其后不再请求', async () => {
    // total 谎报 1000（10 页），页 3 短页（1 行）→ 页 4+ 不采信
    const { client, pages } = pagedClient((p) => ({
      data: {
        total: 1000,
        diff:
          p === 3
            ? [{ f12: '000003', f14: 'C', f2: 1, f3: 1, f62: 1, f184: 1, f66: 1, f69: 1, f72: 1, f75: 1, f78: 1, f81: 1, f84: 1, f87: 1 }]
            : Array.from({ length: 100 }, (_, i) => ({
                f12: `00${p}${i}`, f14: 'X', f2: 1, f3: 1, f62: 1, f184: 1,
                f66: 1, f69: 1, f72: 1, f75: 1, f78: 1, f81: 1, f84: 1, f87: 1,
              })),
      },
    }));
    const rows = await getFundFlowRank(client);
    expect(rows).toHaveLength(201); // 100 + 100 + 1
    // 波次 [2,3,4] 内页 4 已发出（浪费上限 = 并发-1），页 5+ 不再请求
    expect(Math.max(...pages)).toBeLessThanOrEqual(4);
  });
});

describe('fetchDatacenter concurrency 入参 coerce（review 修正）', () => {
  const dcPage = (page: number, totalPages: number, rowsPerPage: number) => ({
    result: {
      pages: totalPages,
      count: totalPages * rowsPerPage,
      data: Array.from({ length: rowsPerPage }, (_, i) => ({ ROW: `${page}-${i}` })),
    },
  });

  it.each([2.5, 0, -3, NaN])('concurrency=%s 不抛错，仍完整拉取', async (c) => {
    const { client } = pagedClient((p) => dcPage(p, 4, 2));
    const result = await fetchDatacenter(
      client,
      { reportName: 'RPT_TEST', concurrency: c as number },
      (item) => item
    );
    expect(result.data).toHaveLength(8); // 4 页 × 2 行，无中途抛错
  });
});
