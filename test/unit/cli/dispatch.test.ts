import { describe, it, expect, vi } from 'vitest';
import { dispatch } from '../../../src/cli/dispatch';
import { findCommand } from '../../../src/cli/manifest';
import type { StockSDK } from '../../../src/sdk';
import type { InvokeContext } from '../../../src/cli/types';
import { CliUsageError } from '../../../src/cli/errors';

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
