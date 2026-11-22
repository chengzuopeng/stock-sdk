/**
 * Review 修复回归（F15/F46）：call 直达命令 this 绑定 + 白名单化、路径 walker 合一
 *
 * 旧实现:三套点路径 walker(dispatch.invokeMethod / manifest.callMethod /
 * call 别名内联),PR review 的 this 修复只落在第一处 ——
 * `stock-sdk call search` 实测 TypeError 崩溃;且 call 用 DANGEROUS 黑名单
 * 走原型链,运行时可达 sdk 内部成员并绕过全部选项校验。
 */
import { describe, it, expect, vi } from 'vitest';
import { dispatch } from '../../../src/cli/dispatch';
import { findCommand } from '../../../src/cli/manifest';
import type { StockSDK } from '../../../src/sdk';
import type { InvokeContext } from '../../../src/cli/types';
import { CliUsageError } from '../../../src/cli/errors';

async function run(
  tokens: string[],
  options: Record<string, unknown>,
  sdkShape: unknown
): Promise<unknown> {
  const match = findCommand(tokens);
  if (!match) throw new Error(`no command for ${tokens.join(' ')}`);
  const ctx: InvokeContext = { positional: match.rest, options };
  return dispatch(sdkShape as StockSDK, match.spec, ctx);
}

/** 顶层方法依赖 this 的伪 SDK（class 原型方法,与真实 StockSDK 同构）。 */
class FakeSdk {
  label = 'self';
  quotes = {
    cn: vi.fn((codes: string[]) => Promise.resolve(codes)),
  };
  // 内部成员:不在 manifest 白名单内,call 不应可达
  client = {
    get: vi.fn(() => Promise.resolve('internal')),
  };
  search(keyword: string): Promise<unknown[]> {
    // 旧实现无绑定调用时 this 为 undefined,这里直接复现崩溃路径
    return Promise.resolve([this.label, keyword]);
  }
}

describe('F15 call 命令 this 绑定', () => {
  it("call search --args '[\"茅台\"]' 不再丢 this 崩溃", async () => {
    const out = await run(['call', 'search'], { args: '["茅台"]' }, new FakeSdk());
    expect(out).toEqual(['self', '茅台']);
  });

  it('call quotes.cn 正常透传实参数组', async () => {
    const sdk = new FakeSdk();
    const out = await run(
      ['call', 'quotes.cn'],
      { args: '[["sh600519"]]' },
      sdk
    );
    expect(out).toEqual(['sh600519']);
    expect(sdk.quotes.cn).toHaveBeenCalledWith(['sh600519']);
  });
});

describe('F15 call 命令白名单(替代原型链黑名单)', () => {
  it('内部成员 client.get 不可达', async () => {
    const sdk = new FakeSdk();
    await expect(
      run(['call', 'client.get'], {}, sdk)
    ).rejects.toBeInstanceOf(CliUsageError);
    expect(sdk.client.get).not.toHaveBeenCalled();
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    '原型链成员 %s 不可达',
    async (path) => {
      await expect(run(['call', path], {}, new FakeSdk())).rejects.toBeInstanceOf(
        CliUsageError
      );
    }
  );

  it('白名单内的方法路径正常放行(northbound.summary)', async () => {
    const fn = vi.fn().mockResolvedValue({});
    const sdk = { northbound: { summary: fn } };
    await run(['call', 'northbound.summary'], {}, sdk);
    expect(fn).toHaveBeenCalled();
  });
});

describe('F46 别名路径 walker 合一后保留 this', () => {
  it('kline 别名(经统一 invokeMethod)调用未 bind 的命名空间方法不丢 this', async () => {
    const sdk = {
      kline: {
        tag: 'NS',
        cn(this: { tag: string }, symbol: string) {
          return Promise.resolve([this.tag, symbol]);
        },
      },
    };
    const out = await run(['kline', '600519'], {}, sdk);
    expect(out).toEqual(['NS', '600519']);
  });

  it('northbound 别名 invoke 同样保留 this', async () => {
    const sdk = {
      northbound: {
        tag: 'NB',
        minute(this: { tag: string }, direction?: string) {
          return Promise.resolve([this.tag, direction]);
        },
      },
    };
    const out = await run(['northbound', 'minute', 'south'], {}, sdk);
    expect(out).toEqual(['NB', 'south']);
  });
});
