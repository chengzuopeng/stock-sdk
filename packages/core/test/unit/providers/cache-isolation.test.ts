/**
 * R7-11 实例级缓存隔离回归：
 * 此前代码表/交易日历/板块映射是仅按名字键控的模块级全局缓存 ——
 * 实例 A（mock/代理 fetchImpl）先取数，实例 B 在 6-12h TTL 内拿到的
 * 都是 A 的数据，且首个调用者的 client 独占取数。
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestClient } from '../../../src/core';
import { getTradingCalendar } from '../../../src/providers/tencent/tradeCalendar';
import { getUSCodeList } from '../../../src/providers/tencent/batch';

function fakeTextClient(text: string) {
  const get = vi.fn(async () => text);
  return { client: { get } as unknown as RequestClient, get };
}

function fakeJsonClient(list: string[]) {
  const get = vi.fn(async () => ({ success: true, list }));
  return { client: { get } as unknown as RequestClient, get };
}

describe('交易日历跨实例隔离', () => {
  it('两个 client 各自取数互不可见；同 client 第二次命中缓存', async () => {
    const a = fakeTextClient('2024-01-02,2024-01-03');
    const b = fakeTextClient('2024-05-06,2024-05-07');

    expect(await getTradingCalendar(a.client)).toEqual(['2024-01-02', '2024-01-03']);
    // 修复前：b 会直接命中 a 的全局缓存，拿到 a 的 mock 数据且不发请求
    expect(await getTradingCalendar(b.client)).toEqual(['2024-05-06', '2024-05-07']);
    expect(b.get).toHaveBeenCalledTimes(1);

    await getTradingCalendar(a.client);
    expect(a.get).toHaveBeenCalledTimes(1); // 同实例命中缓存
  });
});

describe('美股代码表跨实例隔离', () => {
  it('mock 实例的代码表不会串给另一实例', async () => {
    const a = fakeJsonClient(['105.MOCK']);
    const b = fakeJsonClient(['106.REAL']);

    expect(await getUSCodeList(a.client)).toEqual(['105.MOCK']);
    expect(await getUSCodeList(b.client)).toEqual(['106.REAL']);
  });
});
