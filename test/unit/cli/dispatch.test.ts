import { describe, it, expect, vi } from 'vitest';
import { dispatch } from '../../../src/cli/dispatch';
import { findCommand } from '../../../src/cli/manifest';
import type { StockSDK } from '../../../src/sdk';
import type { InvokeContext } from '../../../src/cli/types';
import { CliUsageError } from '../../../src/cli/errors';
import { InvalidSymbolError } from '../../../src/core';

/** 用嵌套 mock 构造一个「足够 dispatch 动态访问」的伪 SDK，并返回被调函数引用。 */
function call(
  tokens: string[],
  options: Record<string, unknown>,
  build: (fn: ReturnType<typeof vi.fn>) => Record<string, unknown>
): { fn: ReturnType<typeof vi.fn>; done: Promise<unknown> } {
  const fn = vi.fn().mockResolvedValue([]);
  const sdk = build(fn) as unknown as StockSDK;
  const match = findCommand(tokens);
  if (!match) throw new Error(`no command for ${tokens.join(' ')}`);
  const ctx: InvokeContext = { positional: match.rest, options };
  return { fn, done: dispatch(sdk, match.spec, ctx) };
}

describe('dispatch — argShape 实参组装', () => {
  it('symbol+options：kline cn 600519 --period weekly', async () => {
    const { fn, done } = call(['kline', 'cn', '600519'], { period: 'weekly' }, (f) => ({
      kline: { cn: f },
    }));
    await done;
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ period: 'weekly' }));
  });

  it('adjust none → 空字符串（map 生效）', async () => {
    const { fn, done } = call(['kline', 'cn', '600519'], { adjust: 'none' }, (f) => ({
      kline: { cn: f },
    }));
    await done;
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ adjust: '' }));
  });

  it('codes[]：quotes cn 收集成数组', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['quotes', 'cn'])!;
    await dispatch(sdk, m.spec, { positional: ['sh600519', 'sz000001'], options: {} });
    expect(fn).toHaveBeenCalledWith(['sh600519', 'sz000001']);
  });

  it('positional：marketEvent ztPool 按序传参', async () => {
    const { fn, done } = call(['marketEvent', 'ztPool'], {}, (f) => ({
      marketEvent: { ztPool: f },
    }));
    // ztPool 的位置参数来自 rest；这里 rest 为空，故用直接构造
    void done;
    void fn;
    const fn2 = vi.fn().mockResolvedValue([]);
    const sdk = { marketEvent: { ztPool: fn2 } } as unknown as StockSDK;
    const m = findCommand(['marketEvent', 'ztPool'])!;
    await dispatch(sdk, m.spec, { positional: ['zt', '20260101'], options: {} });
    expect(fn2).toHaveBeenCalledWith('zt', '20260101');
  });

  it('none：board industry list 无参调用', async () => {
    const { fn, done } = call(['board', 'industry', 'list'], {}, (f) => ({
      board: { industry: { list: f } },
    }));
    await done;
    expect(fn).toHaveBeenCalledWith();
  });

  it('codes+options：batch byCodes（数组 + number 转换）', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { batch: { byCodes: fn } } as unknown as StockSDK;
    const m = findCommand(['batch', 'byCodes'])!;
    await dispatch(sdk, m.spec, { positional: ['sh600519'], options: { batchSize: '100' } });
    expect(fn).toHaveBeenCalledWith(['sh600519'], expect.objectContaining({ batchSize: 100 }));
  });

  it('options：fundFlow rank 透传选项', async () => {
    const { fn, done } = call(['fundFlow', 'rank'], { period: 'today' }, (f) => ({
      fundFlow: { rank: f },
    }));
    await done;
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ period: 'today' }));
  });

  it('enum+upper：kline withIndicators --market a 先 upper 后 enum（不拒收小写）', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { withIndicators: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', 'withIndicators', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { market: 'a' } });
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ market: 'A' }));
  });

  it('待值 flag 无值（被 parser 置 true）→ 缺少值用法错误', () => {
    const fn = vi.fn();
    const sdk = { kline: { withIndicators: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', 'withIndicators', '600519'])!;
    expect(() =>
      dispatch(sdk, m.spec, { positional: m.rest, options: { market: true } })
    ).toThrow(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('别名位置参数 enum 校验：status xyz 报错（不绕过 invoke）', () => {
    const fn = vi.fn();
    const sdk = { calendar: { marketStatus: fn } } as unknown as StockSDK;
    const m = findCommand(['status', 'xyz'])!;
    expect(() => dispatch(sdk, m.spec, { positional: m.rest, options: {} })).toThrow(
      CliUsageError
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it('未声明 --start/--end 自动映射成 startDate/endDate', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { northbound: { history: fn } } as unknown as StockSDK;
    const m = findCommand(['northbound', 'history'])!;
    await dispatch(sdk, m.spec, {
      positional: ['north'],
      options: { start: '20240101', end: '20240201' },
    });
    expect(fn).toHaveBeenCalledWith(
      'north',
      expect.objectContaining({ startDate: '20240101', endDate: '20240201' })
    );
  });

  it('search --limit 0 不裁剪、--limit 2 裁剪', async () => {
    const sdk = { search: vi.fn().mockResolvedValue([1, 2, 3]) } as unknown as StockSDK;
    const m = findCommand(['search', 'x'])!;
    const r0 = await dispatch(sdk, m.spec, { positional: m.rest, options: { limit: '0' } });
    expect((r0 as unknown[]).length).toBe(3);
    const r2 = await dispatch(sdk, m.spec, { positional: m.rest, options: { limit: '2' } });
    expect((r2 as unknown[]).length).toBe(2);
  });

  it('P2-1 quote --market fund → quotes.fund', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { fund: fn } } as unknown as StockSDK;
    const m = findCommand(['quote', '110011'])!;
    await dispatch(sdk, m.spec, { positional: ['110011'], options: { market: 'fund' } });
    expect(fn).toHaveBeenCalledWith(['110011']);
  });

  it('quote 混合代码自动识别分组(F38 单次解析后仍正确分组/格式化)', async () => {
    const cn = vi.fn().mockResolvedValue([]);
    const hk = vi.fn().mockResolvedValue([]);
    const us = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { cnSimple: cn, hk, us } } as unknown as StockSDK;
    const m = findCommand(['quote', '600519'])!;
    await dispatch(sdk, m.spec, {
      // A股补腾讯前缀；港股 4/5 位补零纯代码；美股纯字母大写；无法解析(@@) 原样归入 A 股组
      positional: ['600519', '00700', '0700', 'AAPL', '@@'],
      options: {},
    });
    expect(cn).toHaveBeenCalledWith(['sh600519', '@@']);
    expect(hk).toHaveBeenCalledWith(['00700', '00700']);
    expect(us).toHaveBeenCalledWith(['AAPL']);
  });

  it('R3-7 quote --market hk + 确定性矛盾代码(sh600519) → InvalidSymbolError 浮出(不再静默塞进 HK 组)', async () => {
    const hk = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { hk } } as unknown as StockSDK;
    const m = findCommand(['quote', 'sh600519'])!;
    await expect(
      dispatch(sdk, m.spec, { positional: ['sh600519'], options: { market: 'hk' } })
    ).rejects.toBeInstanceOf(InvalidSymbolError);
    expect(hk).not.toHaveBeenCalled();
  });

  it('R3-7 quote --market hk:一致代码正常分组,不可解析代码维持原样透传(两类失败区分)', async () => {
    const hk = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { hk } } as unknown as StockSDK;
    const m = findCommand(['quote', '00700'])!;
    // '00700' 正常解析;'@@' 本身不可解析(marketOf undefined)→ 不算矛盾,原样进组
    await dispatch(sdk, m.spec, {
      positional: ['00700', '@@'],
      options: { market: 'hk' },
    });
    expect(hk).toHaveBeenCalledWith(['00700', '@@']);
  });

  it('quote 特殊指数拦截仅限腾讯无码项:hkHSI/usDJI 放行分组,HSHCI 仍拦截', async () => {
    // 前缀回读修复后 hkHSI/usDJI 解析为指数;拦截一刀切会把可用行情误报为
    // 「无行情接口」(HSTECH 还与 kline 侧 fail-fast 指引循环)
    const hk = vi.fn().mockResolvedValue([]);
    const us = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { hk, us } } as unknown as StockSDK;
    const m = findCommand(['quote', 'hkHSI'])!;
    await dispatch(sdk, m.spec, { positional: ['hkHSI', 'usDJI'], options: {} });
    expect(hk).toHaveBeenCalledWith(['HSI']);
    expect(us).toHaveBeenCalledWith(['DJI']);
    // 无腾讯码的注册项(HSHCI)维持拦截
    await expect(
      dispatch(sdk, m.spec, { positional: ['HSHCI'], options: {} })
    ).rejects.toBeInstanceOf(CliUsageError);
  });

  it('P2-2 call quotes.cn --args 原始直通', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { quotes: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['call', 'quotes.cn'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { args: '[["sh600519"]]' } });
    expect(fn).toHaveBeenCalledWith(['sh600519']);
  });

  it('P2-2 call 未知方法报错', () => {
    const sdk = { quotes: {} } as unknown as StockSDK;
    const m = findCommand(['call', 'quotes.nope'])!;
    expect(() => dispatch(sdk, m.spec, { positional: m.rest, options: {} })).toThrow(CliUsageError);
  });

  it('P2-3 northbound history --direction south → history("south", {...})', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { northbound: { history: fn } } as unknown as StockSDK;
    const m = findCommand(['northbound', 'history'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { direction: 'south' } });
    expect(fn).toHaveBeenCalledWith('south', expect.any(Object));
  });

  it('P2-3 northbound history 位置参数 north 也可', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { northbound: { history: fn } } as unknown as StockSDK;
    const m = findCommand(['northbound', 'history', 'north'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: {} });
    expect(fn).toHaveBeenCalledWith('north', expect.any(Object));
  });

  it('P2-3 northbound --direction 非法值报错', () => {
    const fn = vi.fn();
    const sdk = { northbound: { history: fn } } as unknown as StockSDK;
    const m = findCommand(['northbound', 'history'])!;
    expect(() =>
      dispatch(sdk, m.spec, { positional: m.rest, options: { direction: 'bad' } })
    ).toThrow(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });
});

/**
 * 别名命令（自定义 invoke）此前绕过了 buildOptions→convert 的 enum/类型校验，
 * 导致 `--period`/`--adjust` 等已声明 option 未经校验直透 SDK。
 * 这里专门覆盖 ALIAS 路径（findCommand(['kline','600519']) 等），与上面只覆盖
 * 命名空间 `kline cn` 形成对照。
 */
describe('dispatch — 别名 invoke 的 option 校验/归一', () => {
  it('kline 600519 --period weekly 正常透传(基线)', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { period: 'weekly' } });
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ period: 'weekly' }));
  });

  it('kline 600519 --period xyz 抛 CliUsageError（enum 校验不再被绕过）', () => {
    const fn = vi.fn();
    const sdk = { kline: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', '600519'])!;
    expect(() =>
      dispatch(sdk, m.spec, { positional: m.rest, options: { period: 'xyz' } })
    ).toThrow(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('kline 600519 --adjust bogus 抛 CliUsageError', () => {
    const fn = vi.fn();
    const sdk = { kline: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', '600519'])!;
    expect(() =>
      dispatch(sdk, m.spec, { positional: m.rest, options: { adjust: 'bogus' } })
    ).toThrow(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('kline 600519 --period daily --period weekly 取末值(不再透传数组)', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { period: ['daily', 'weekly'] } });
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ period: 'weekly' }));
    const [, opts] = fn.mock.calls[0] as [string, Record<string, unknown>];
    expect(Array.isArray(opts.period)).toBe(false);
  });

  it('kline 600519 --adjust none → 空字符串（map 归一对别名同样生效）', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { cn: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { adjust: 'none' } });
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ adjust: '' }));
  });

  it('minute 600519 --period 7 抛 CliUsageError（分钟周期 enum）', () => {
    const fn = vi.fn();
    const sdk = { kline: { cnMinute: fn } } as unknown as StockSDK;
    const m = findCommand(['minute', '600519'])!;
    expect(() =>
      dispatch(sdk, m.spec, { positional: m.rest, options: { period: '7' } })
    ).toThrow(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('minute 600519 --period 5 正常透传', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { cnMinute: fn } } as unknown as StockSDK;
    const m = findCommand(['minute', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { period: '5' } });
    expect(fn).toHaveBeenCalledWith('600519', expect.objectContaining({ period: '5' }));
  });

  it('indicators 600519 --period xyz 抛 CliUsageError', () => {
    const fn = vi.fn();
    const sdk = { kline: { withIndicators: fn } } as unknown as StockSDK;
    const m = findCommand(['indicators', '600519'])!;
    expect(() =>
      dispatch(sdk, m.spec, { positional: m.rest, options: { period: 'xyz' } })
    ).toThrow(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('indicators 600519 --period weekly --ma 5,10 正常组装', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { withIndicators: fn } } as unknown as StockSDK;
    const m = findCommand(['indicators', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { period: 'weekly', ma: '5,10' } });
    expect(fn).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({ period: 'weekly', indicators: { ma: { periods: [5, 10] } } })
    );
  });

  it('#8 命名空间 kline withIndicators 也能传指标(不再静默丢)', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { withIndicators: fn } } as unknown as StockSDK;
    const m = findCommand(['kline', 'withIndicators', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { ma: '5,10', macd: true } });
    expect(fn).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({ indicators: { ma: { periods: [5, 10] }, macd: true } })
    );
  });

  it('#7 indicators --macd=false 不启用 MACD(=false 不再误启用)', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const sdk = { kline: { withIndicators: fn } } as unknown as StockSDK;
    const m = findCommand(['indicators', '600519'])!;
    await dispatch(sdk, m.spec, { positional: m.rest, options: { macd: 'false' } });
    const [, opts] = fn.mock.calls[0] as [string, Record<string, unknown>];
    expect((opts.indicators as Record<string, unknown>).macd).toBeUndefined();
  });

  it('#13 call toString/constructor/valueOf/__proto__ 不命中 Object.prototype', () => {
    const sdk = { quotes: {} } as unknown as StockSDK;
    for (const bad of ['toString', 'constructor', 'valueOf', '__proto__']) {
      const m = findCommand(['call', bad])!;
      expect(() => dispatch(sdk, m.spec, { positional: m.rest, options: {} })).toThrow(
        CliUsageError
      );
    }
  });
});
