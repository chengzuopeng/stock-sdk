import { describe, expect, it, vi } from 'vitest';
import {
  HttpError,
  InvalidArgumentError,
  InvalidSymbolError,
  SdkError,
  UpstreamEmptyError,
} from '../../../src/core/errors';
import {
  SourceRouter,
  type RouteTrace,
  type SourceAdapter,
} from '../../../src/router';

interface DemoInput {
  code: string;
  adjust?: '' | 'qfq' | 'hfq';
}

function makeAdapter(
  overrides: Partial<SourceAdapter<DemoInput, string>> & {
    id: string;
    provider: string;
    priority: number;
  }
): SourceAdapter<DemoInput, string> {
  return {
    capability: 'kline.cn.history',
    providedFields: new Set(['open', 'close']),
    supports: () => true,
    fetch: async () => overrides.provider,
    ...overrides,
  };
}

describe('SourceRouter 多源路由引擎', () => {
  it('按优先级选择首选源，并在上游可恢复故障时自动切到备用源', async () => {
    const traces: RouteTrace[] = [];
    const router = new SourceRouter({
      cooldownMs: 30_000,
      onRoute: (t) => traces.push(t),
    });

    const primaryFetch = vi.fn().mockRejectedValue(
      new UpstreamEmptyError('soft limit', 'eastmoney')
    );
    const backupFetch = vi.fn().mockResolvedValue('from-tencent');

    router.registerAll([
      makeAdapter({
        id: 'tencent:kline',
        provider: 'tencent',
        priority: 20,
        fetch: backupFetch,
      }),
      makeAdapter({
        id: 'eastmoney:kline',
        provider: 'eastmoney',
        priority: 10,
        fetch: primaryFetch,
      }),
    ]);

    const res = await router.execute<DemoInput, string>('kline.cn.history', {
      code: '600519',
      adjust: 'qfq',
    });

    expect(res).toBe('from-tencent');
    expect(primaryFetch).toHaveBeenCalledTimes(1);
    expect(primaryFetch.mock.calls[0][1].hasFallback).toBe(true);
    expect(backupFetch).toHaveBeenCalledTimes(1);
    expect(backupFetch.mock.calls[0][1].hasFallback).toBe(false);
    expect(traces).toHaveLength(1);
    expect(traces[0].selectedProvider).toBe('tencent');
    expect(traces[0].degraded).toBe(true);
    expect(traces[0].attempts.map((a) => `${a.provider}:${a.status}`)).toEqual([
      'eastmoney:failed',
      'tencent:success',
    ]);
  });

  it('严格能力过滤：supports(input) 返回 false 时自动跳过，杜绝静默口径漂移', async () => {
    const traces: RouteTrace[] = [];
    const router = new SourceRouter({ onRoute: (t) => traces.push(t) });
    const sinaFetch = vi.fn().mockResolvedValue('unadjusted');

    router.registerAll([
      makeAdapter({
        id: 'eastmoney:kline',
        provider: 'eastmoney',
        priority: 10,
        fetch: async () => {
          throw new UpstreamEmptyError('empty', 'eastmoney');
        },
      }),
      makeAdapter({
        id: 'sina:kline',
        provider: 'sina',
        priority: 30,
        supports: (input) => (input.adjust ?? '') === '',
        fetch: sinaFetch,
      }),
    ]);

    await expect(
      router.execute<DemoInput, string>('kline.cn.history', {
        code: '600519',
        adjust: 'qfq',
      })
    ).rejects.toMatchObject({ code: 'UPSTREAM_EMPTY', provider: 'eastmoney' });

    expect(sinaFetch).not.toHaveBeenCalled();
    expect(traces[0].attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'sina',
          status: 'skipped',
          skipReason: 'unsupported_input',
        }),
      ])
    );

    // 不复权请求则允许命中新浪
    const rawRes = await router.execute<DemoInput, string>('kline.cn.history', {
      code: '600519',
      adjust: '',
    });
    expect(rawRes).toBe('unadjusted');
    expect(sinaFetch).toHaveBeenCalledTimes(1);
  });

  it('requiredFields 检查能力声明和每条记录，并保留有效的零值', async () => {
    const router = new SourceRouter();
    const tencentFetch = vi.fn().mockResolvedValue('tencent');
    const xueqiuFetch = vi.fn().mockResolvedValue([{ turnoverRate: 0 }]);

    router.registerAll([
      makeAdapter({
        id: 'eastmoney:kline',
        provider: 'eastmoney',
        priority: 10,
        providedFields: new Set(['open', 'close', 'turnoverRate']),
        fetch: vi.fn().mockResolvedValue([{ turnoverRate: 1 }, { turnoverRate: null }]),
      }),
      makeAdapter({
        id: 'tencent:kline',
        provider: 'tencent',
        priority: 20,
        providedFields: new Set(['open', 'close']),
        fetch: tencentFetch,
      }),
      makeAdapter({
        id: 'xueqiu:kline',
        provider: 'xueqiu',
        priority: 30,
        providedFields: new Set(['open', 'close', 'turnoverRate']),
        fetch: xueqiuFetch,
      }),
    ]);

    const res = await router.execute<DemoInput, Array<{ turnoverRate: number }>>(
      'kline.cn.history',
      { code: '600519' },
      { requiredFields: ['turnoverRate'] }
    );

    expect(res).toEqual([{ turnoverRate: 0 }]);
    expect(tencentFetch).not.toHaveBeenCalled();
    expect(xueqiuFetch).toHaveBeenCalledTimes(1);
    await expect(router.execute('kline.cn.history', { code: '600519' }, {
      source: 'eastmoney',
      requiredFields: ['turnoverRate'],
    })).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      details: { rowIndex: 1, missingFields: ['turnoverRate'] },
    });
  });

  it('保留主源的 HttpError 类型、实例及状态文本', async () => {
    const failure = new HttpError(503, 'Service Unavailable');
    const router = new SourceRouter().register(makeAdapter({
      id: 'eastmoney:kline', provider: 'eastmoney', priority: 10,
      fetch: vi.fn().mockRejectedValue(failure),
    }));
    await expect(router.execute('kline.cn.history', { code: '600519' })).rejects.toBe(failure);
    expect(failure).toBeInstanceOf(HttpError);
    expect(failure).toMatchObject({
      statusText: 'Service Unavailable',
      details: { routeAttempts: [{ provider: 'eastmoney', status: 'failed' }] },
    });
  });

  it('预取消跳过所有适配器，运行中取消也不会换源', async () => {
    const primary = vi.fn(() => new Promise<string>(() => {}));
    const backup = vi.fn().mockResolvedValue('backup');
    const router = new SourceRouter().registerAll([
      makeAdapter({ id: 'em', provider: 'eastmoney', priority: 10, fetch: primary }),
      makeAdapter({ id: 'tx', provider: 'tencent', priority: 20, fetch: backup }),
    ]);
    const capability = 'kline.cn.history';
    await expect(router.execute(capability, { code: '600519' }, {
      signal: AbortSignal.abort('pre-aborted'),
    })).rejects.toMatchObject({ code: 'ABORTED' });
    expect(primary).not.toHaveBeenCalled();

    const controller = new AbortController();
    const pending = router.execute(capability, { code: '600519' }, { signal: controller.signal });
    controller.abort('aborted while fetching');
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
    expect(primary).toHaveBeenCalledTimes(1);
    expect(backup).not.toHaveBeenCalled();
    expect(router.getHealthStats()).toEqual([]);
  });

  it('源级健康冷却：连续失败达到阈值后自动沉底，后续请求直走健康备源', async () => {
    const router = new SourceRouter({ failureThreshold: 2, cooldownMs: 60_000 });
    let emCalls = 0;
    let txCalls = 0;

    router.registerAll([
      makeAdapter({
        id: 'eastmoney:kline',
        provider: 'eastmoney',
        priority: 10,
        fetch: async () => {
          emCalls++;
          throw new UpstreamEmptyError('rate limit', 'eastmoney');
        },
      }),
      makeAdapter({
        id: 'tencent:kline',
        provider: 'tencent',
        priority: 20,
        fetch: async () => {
          txCalls++;
          return 'ok';
        },
      }),
    ]);

    // 前两次探测东财均失败 → 触发东财冷却
    await router.execute('kline.cn.history', { code: '600519' });
    await router.execute('kline.cn.history', { code: '600519' });
    expect(emCalls).toBe(2);

    // 第三、四次在冷却期内，应直接优先走腾讯，不再撞东财
    await router.execute('kline.cn.history', { code: '600519' });
    await router.execute('kline.cn.history', { code: '600519' });
    expect(emCalls).toBe(2);
    expect(txCalls).toBe(4);

    const emStat = router
      .getHealthStats('kline.cn.history')
      .find((s) => s.provider === 'eastmoney');
    expect(emStat?.isCooling).toBe(true);
    expect(emStat?.consecutiveFailures).toBe(2);
  });

  it('确定性参数/标的错误立即抛出，不切源也不惩罚源健康度', async () => {
    const router = new SourceRouter({ failureThreshold: 1, cooldownMs: 60_000 });
    const backupFetch = vi.fn().mockResolvedValue('backup');

    router.registerAll([
      makeAdapter({
        id: 'eastmoney:kline',
        provider: 'eastmoney',
        priority: 10,
        fetch: async () => {
          throw new InvalidSymbolError('BAD_CODE', 'eastmoney');
        },
      }),
      makeAdapter({
        id: 'tencent:kline',
        provider: 'tencent',
        priority: 20,
        fetch: backupFetch,
      }),
    ]);

    await expect(
      router.execute('kline.cn.history', { code: 'BAD_CODE' })
    ).rejects.toBeInstanceOf(InvalidSymbolError);

    expect(backupFetch).not.toHaveBeenCalled();
    expect(router.getHealthStats('kline.cn.history')).toEqual([]);
  });

  it('支持显式 source 覆盖与无合格源时明确抛 INVALID_ARGUMENT', async () => {
    const router = new SourceRouter();
    router.registerAll([
      makeAdapter({ id: 'em', provider: 'eastmoney', priority: 10 }),
      makeAdapter({ id: 'tx', provider: 'tencent', priority: 20 }),
    ]);

    expect(
      await router.execute('kline.cn.history', { code: '600519' }, { source: 'tencent' })
    ).toBe('tencent');

    await expect(
      router.execute('kline.cn.history', { code: '600519' }, { source: 'nonexistent' })
    ).rejects.toBeInstanceOf(SdkError);

    await expect(
      router.execute('kline.cn.history', { code: '600519' }, { source: 'nonexistent' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });

    // 验证 InvalidArgumentError 也不被误吞
    router.register(
      makeAdapter({
        id: 'bad-arg',
        provider: 'bad',
        priority: 1,
        fetch: async () => {
          throw new InvalidArgumentError('bad param');
        },
      })
    );
    await expect(
      router.execute('kline.cn.history', { code: '600519' }, { source: 'bad' })
    ).rejects.toBeInstanceOf(InvalidArgumentError);
  });

  it('probeFallbackOnEmpty：主源返回合法 [] 时顺带探测备源，备源失败则安全回退 [] 且不冷却主源', async () => {
    const router = new SourceRouter({ failureThreshold: 1, cooldownMs: 60_000 });
    router.registerAll([
      {
        id: 'em:div',
        capability: 'reference.dividendDetail',
        provider: 'eastmoney',
        priority: 10,
        providedFields: new Set(['dividendPretax']),
        probeFallbackOnEmpty: true,
        supports: () => true,
        fetch: async () => [],
      },
      {
        id: 'nasdaq:div',
        capability: 'reference.dividendDetail',
        provider: 'nasdaq',
        priority: 20,
        providedFields: new Set(['dividendPretax']),
        supports: () => true,
        fetch: async () => {
          throw new UpstreamEmptyError('nasdaq unreachable', 'nasdaq');
        },
      },
    ]);

    const out = await router.execute('reference.dividendDetail', { symbol: 'TSLA' });
    expect(out).toEqual([]);
    const emStat = router
      .getHealthStats('reference.dividendDetail')
      .find((s) => s.provider === 'eastmoney');
    expect(emStat?.isCooling).toBe(false);
    expect(emStat?.consecutiveFailures).toBe(0);
  });
});
