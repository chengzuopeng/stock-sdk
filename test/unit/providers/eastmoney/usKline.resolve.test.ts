/**
 * R7-4 美股裸 ticker → secid 解析回归：
 * 此前 symbol 原样直传 secid，CLI/指标服务/MCP 自动路由的 'AAPL' 拼出
 * 非法 secid → 上游 data:null → 全线静默"无数据"。
 * 解析顺序：secid 直通 → 代码表（'105.AAPL' 形态，一次摊销）→ 105/106/107
 * 探测兜底 → 负缓存（1h，挡重试风暴）。命中缓存 7 天，转板/退市靠 TTL 覆盖；
 * 空结果不触发自愈（空结果是常态而非 secid 失效信号）；并发解析 single-flight 去重。
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestClient } from '../../../../src/core';
import { NotFoundError, clearClientScopedCaches } from '../../../../src/core';
import { getUSHistoryKline } from '../../../../src/providers/eastmoney/usKline';

interface FakeRoute {
  /** us 代码表响应的 list 字段；设为 'THROW' 让代码表请求失败（模拟软限流/网络） */
  codeList: string[] | 'THROW';
  /** secid → 该 secid 的 kline 行（探测与正式请求同一路由） */
  klines: Record<string, string[]>;
  /** 每个 get 的人为延迟（ms），用于并发 single-flight 测试 */
  delayMs?: number;
}

/** fake client：按 URL 区分代码表请求与 kline 请求，记录全部调用。 */
function fakeClient(route: FakeRoute) {
  const calls: string[] = [];
  const get = vi.fn(async (url: string) => {
    calls.push(url);
    if (route.delayMs) {
      await new Promise((r) => setTimeout(r, route.delayMs));
    }
    if (url.includes('/api/qt/stock/kline')) {
      const secid = new URL(url).searchParams.get('secid') ?? '';
      return { data: { klines: route.klines[secid] ?? [], code: secid.split('.')[1], name: '' } };
    }
    // 美股代码表（tencent fetchJsonCodeList 路径）
    if (route.codeList === 'THROW') {
      throw new Error('code list upstream error');
    }
    return { success: true, list: route.codeList };
  });
  return { client: { get } as unknown as RequestClient, get, calls };
}

/** 探测请求（lmt=1）与正式请求（lmt=1000000）区分。 */
const probeUrls = (calls: string[]) =>
  calls.filter((u) => u.includes('/api/qt/stock/kline') && new URL(u).searchParams.get('lmt') === '1');

const klineUrls = (calls: string[]) => calls.filter((u) => u.includes('/api/qt/stock/kline'));
const secidOf = (url: string) => new URL(url).searchParams.get('secid');

describe('resolveUsSecid（经 getUSHistoryKline 端到端）', () => {
  it("显式 secid 直通：'105.AAPL' 不发代码表/探测请求", async () => {
    const { client, calls } = fakeClient({ codeList: [], klines: {} });
    const result = await getUSHistoryKline(client, '105.AAPL');
    expect(result).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(secidOf(calls[0])).toBe('105.AAPL');
  });

  it('裸 ticker 经代码表解析：BABA → 106.BABA（NYSE 免串行探测）', async () => {
    const { client, calls } = fakeClient({
      codeList: ['105.AAPL', '106.BABA'],
      klines: {},
    });
    await getUSHistoryKline(client, 'BABA');
    const klines = klineUrls(calls);
    expect(klines).toHaveLength(1);
    expect(secidOf(klines[0])).toBe('106.BABA');
    // 探测参数与正式请求同构由 buildEmKlineParams 保证：正式请求带 ut/fields
    expect(klines[0]).toContain('fields2=');
    expect(klines[0]).toContain('ut=');
  });

  it("'usBABA' 前缀形态同样可解析（依赖 R7-1 规范形剥离）", async () => {
    const { client, calls } = fakeClient({ codeList: ['106.BABA'], klines: {} });
    await getUSHistoryKline(client, 'usBABA');
    expect(secidOf(klineUrls(calls)[0])).toBe('106.BABA');
  });

  it('代码表未收录的新股走 105→106→107 探测（lmt=1 最小请求）', async () => {
    const { client, calls } = fakeClient({
      codeList: ['105.AAPL'],
      klines: { '106.NEWIPO': ['2024-01-02,1,1,1,1,1,1,1,1,1,1'] },
    });
    await getUSHistoryKline(client, 'NEWIPO');
    const klines = klineUrls(calls);
    // 2 次探测（105 空 → 106 命中）+ 1 次正式请求
    expect(klines.map(secidOf)).toEqual(['105.NEWIPO', '106.NEWIPO', '106.NEWIPO']);
    expect(new URL(klines[0]).searchParams.get('lmt')).toBe('1');
    // 探测命中后缓存：第二次调用零探测
    const before = calls.length;
    await getUSHistoryKline(client, 'NEWIPO');
    expect(klineUrls(calls.slice(before)).map(secidOf)).toEqual(['106.NEWIPO']);
  });

  it('无效 ticker：全 miss 抛 NotFoundError，负缓存挡住重试风暴', async () => {
    const { client, calls } = fakeClient({ codeList: ['105.AAPL'], klines: {} });
    await expect(getUSHistoryKline(client, 'BOGUS')).rejects.toThrow(NotFoundError);
    const probes = klineUrls(calls);
    expect(probes.map(secidOf)).toEqual(['105.BOGUS', '106.BOGUS', '107.BOGUS']);

    const before = calls.length;
    await expect(getUSHistoryKline(client, 'BOGUS')).rejects.toThrow(NotFoundError);
    expect(calls.length).toBe(before); // 负缓存命中：零新增请求
  });

  it('空结果不触发自愈：缓存命中的 ticker 空查询不再重新探测（周末/盘前常态）', async () => {
    const { client, calls } = fakeClient({ codeList: ['105.AAPL'], klines: {} });
    await getUSHistoryKline(client, 'AAPL'); // 首次：代码表解析 + 正式请求（空）
    const before = calls.length;
    await getUSHistoryKline(client, 'AAPL'); // 缓存命中 → 空 → 直接返回，不删缓存不重探测
    const after = calls.slice(before);
    // 仅一次正式请求（lmt=1000000），零探测（lmt=1）
    expect(klineUrls(after).map(secidOf)).toEqual(['105.AAPL']);
    expect(probeUrls(after)).toHaveLength(0);
  });

  it('代码表失败 + 探测全空：抛 NotFoundError 但【不】负缓存（软限流不误判为不存在）', async () => {
    const { client, calls } = fakeClient({ codeList: 'THROW', klines: {} });
    await expect(getUSHistoryKline(client, 'AAPL')).rejects.toThrow(NotFoundError);
    const before = calls.length;
    // 代码表未成功查询过 → 不负缓存 → 第二次仍完整重试（探测再发一轮）
    await expect(getUSHistoryKline(client, 'AAPL')).rejects.toThrow(NotFoundError);
    expect(probeUrls(calls.slice(before)).length).toBeGreaterThan(0);
  });

  it('并发解析 single-flight：同一 ticker 的并发冷解析只探测一轮', async () => {
    const { client, calls } = fakeClient({
      codeList: ['105.AAPL'],
      klines: { '106.NEWIPO': ['2024-01-02,1,1,1,1,1,1,1,1,1,1'] },
      delayMs: 5,
    });
    await Promise.all([
      getUSHistoryKline(client, 'NEWIPO'),
      getUSHistoryKline(client, 'NEWIPO'),
      getUSHistoryKline(client, 'NEWIPO'),
    ]);
    // 无 single-flight 则 3×[105,106] = 6 次探测；去重后仅一轮 [105,106]
    expect(probeUrls(calls).map(secidOf)).toEqual(['105.NEWIPO', '106.NEWIPO']);
  });

  it('per-client 缓存隔离：clearClientScopedCaches 后重新解析', async () => {
    const { client, calls } = fakeClient({ codeList: ['105.AAPL'], klines: {} });
    await getUSHistoryKline(client, 'AAPL');
    clearClientScopedCaches(client);
    const before = calls.length;
    await getUSHistoryKline(client, 'AAPL'); // 缓存已清 → 重新走代码表
    expect(calls.slice(before).some((u) => !u.includes('/api/qt/stock/kline'))).toBe(true);
  });
});
