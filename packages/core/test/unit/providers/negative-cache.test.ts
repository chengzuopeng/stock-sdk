/**
 * Review 修复回归（F6/F7/F19）：上游空响应韧性
 *
 * - F6: 负缓存 —— 上游一次空 200 / {success:false} 不再把空结果写入进程级
 *   共享缓存（此前日历 12h / 代码列表 6h / 板块映射 1h 内全程返回空），
 *   改为抛 UpstreamEmptyError 且下次调用重新拉取。
 * - F7: getGlobalFuturesSpot 分页空页守卫（服务端高报 total 不再无限翻页）。
 * - F19: northbound direction 运行时守卫（垃圾值不再静默当 'north'）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestClient } from '../../../src/core';
import { UpstreamEmptyError, InvalidArgumentError } from '../../../src/core';
import { clearSharedCaches } from '../../../src/core/cache';
import { getTradingCalendar } from '../../../src/providers/tencent/tradeCalendar';
import {
  getAShareCodeList,
  getFundCodeList,
} from '../../../src/providers/tencent/batch';
import { getGlobalFuturesSpot } from '../../../src/providers/eastmoney/futuresGlobal';
import {
  getNorthboundMinute,
  getNorthboundHistory,
} from '../../../src/providers/eastmoney/northbound';

function mockClient(responses: unknown[]): RequestClient {
  let i = 0;
  return {
    get: vi.fn(async () => {
      const r = responses[Math.min(i, responses.length - 1)];
      i++;
      return r;
    }),
  } as unknown as RequestClient;
}

beforeEach(() => {
  clearSharedCaches();
});

describe('F6 交易日历：空响应抛 UpstreamEmptyError 且不落缓存', () => {
  it('空文本 → 抛错;随后正常响应 → 成功(证明未缓存空值)', async () => {
    const client = mockClient(['', '2024-01-02,2024-01-03']);
    await expect(getTradingCalendar(client)).rejects.toBeInstanceOf(
      UpstreamEmptyError
    );
    await expect(getTradingCalendar(client)).resolves.toEqual([
      '2024-01-02',
      '2024-01-03',
    ]);
    expect((client.get as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('正常结果会被缓存(第二次不再发请求)', async () => {
    const client = mockClient(['2024-01-02,2024-01-03']);
    await getTradingCalendar(client);
    await getTradingCalendar(client);
    expect((client.get as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('F6 代码列表：success:false / 空 list 抛错且不落缓存', () => {
  it('{success:false} → UpstreamEmptyError,随后正常响应成功', async () => {
    const client = mockClient([
      { success: false },
      { success: true, list: ['sh600519', 'sz000001'] },
    ]);
    await expect(getAShareCodeList(client)).rejects.toBeInstanceOf(
      UpstreamEmptyError
    );
    await expect(getAShareCodeList(client)).resolves.toEqual([
      'sh600519',
      'sz000001',
    ]);
  });

  it('空 list → UpstreamEmptyError', async () => {
    const client = mockClient([{ success: true, list: [] }]);
    await expect(getAShareCodeList(client)).rejects.toBeInstanceOf(
      UpstreamEmptyError
    );
  });

  it('基金列表空文本 → UpstreamEmptyError(且不因 null 文本抛 TypeError)', async () => {
    const client = mockClient(['', 'header,000001,000002']);
    await expect(getFundCodeList(client)).rejects.toBeInstanceOf(
      UpstreamEmptyError
    );
    await expect(getFundCodeList(client)).resolves.toEqual([
      '000001',
      '000002',
    ]);
  });
});

describe('F7 getGlobalFuturesSpot 分页空页守卫', () => {
  it('服务端高报 total 时空页即停,不再无限请求', async () => {
    const page0 = {
      total: 100, // 高报:实际只有 2 条
      list: [
        { dm: 'GC00Y', name: 'COMEX黄金', p: 1, zde: 0, zdf: 0, o: 1, h: 1, l: 1, zjsj: 1, vol: 1, wp: 1, np: 1, ccl: 1 },
        { dm: 'SI00Y', name: 'COMEX白银', p: 1, zde: 0, zdf: 0, o: 1, h: 1, l: 1, zjsj: 1, vol: 1, wp: 1, np: 1, ccl: 1 },
      ],
    };
    const emptyPage = { total: 100, list: [] };
    const client = mockClient([page0, emptyPage, emptyPage, emptyPage]);

    const result = await getGlobalFuturesSpot(client, { pageSize: 2 });
    expect(result.length).toBe(2);
    // 第 2 页(空页)后立即停止 —— 共 2 次请求,而非循环到 total/pageSize=50 次或无限
    expect((client.get as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });
});

describe('F19 northbound direction 运行时守卫', () => {
  it("getNorthboundMinute(client, 'east') → InvalidArgumentError(不发请求)", async () => {
    const client = mockClient([{}]);
    await expect(
      getNorthboundMinute(client, 'east' as never)
    ).rejects.toBeInstanceOf(InvalidArgumentError);
    expect((client.get as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it("getNorthboundHistory(client, 'EAST') → InvalidArgumentError", async () => {
    const client = mockClient([{}]);
    await expect(
      getNorthboundHistory(client, 'EAST' as never)
    ).rejects.toBeInstanceOf(InvalidArgumentError);
  });

  it("合法 'south' 正常走请求", async () => {
    const client = mockClient([{ data: { n2s: [], n2sDate: '' } }]);
    await expect(getNorthboundMinute(client, 'south')).resolves.toEqual([]);
  });
});
