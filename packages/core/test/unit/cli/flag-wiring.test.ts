/**
 * Review 修复回归（F8/F9/F10/F11/F12/F13/F14/F16）：CLI 日期归一与选项接线
 */
import { describe, it, expect, vi } from 'vitest';
import { dispatch, toNumberArray } from '../../../src/cli/dispatch';
import { findCommand } from '../../../src/cli/manifest';
import type { StockSDK } from '../../../src/sdk';
import type { InvokeContext } from '../../../src/cli/types';
import { CliUsageError } from '../../../src/cli/errors';
import type { RequestClient } from '../../../src/core';
import {
  getNorthboundHistory,
  getNorthboundIndividual,
} from '../../../src/providers/eastmoney/northbound';
import { getFuturesInventory } from '../../../src/providers/eastmoney/futuresInventory';
import {
  toIsoDate,
  normalizeMinuteWindow,
} from '../../../src/providers/eastmoney/utils';
import { getMinuteKline } from '../../../src/providers/eastmoney/aShareKline';

// async 包装:dispatch 的校验错误是同步抛出,转成 rejection 便于统一 rejects 断言
async function run(
  tokens: string[],
  options: Record<string, unknown>,
  sdkShape: Record<string, unknown>
): Promise<unknown> {
  const match = findCommand(tokens);
  if (!match) throw new Error(`no command for ${tokens.join(' ')}`);
  const ctx: InvokeContext = { positional: match.rest, options };
  return dispatch(sdkShape as unknown as StockSDK, match.spec, ctx);
}

describe('F10 codes us --market 改 enum NASDAQ/NYSE/AMEX', () => {
  it('--market sh(旧 help 的取值)→ 校验拒绝而非静默空列表', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await expect(
      run(['codes', 'us'], { market: 'sh' }, { codes: { us: fn } })
    ).rejects.toBeInstanceOf(CliUsageError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('--market nasdaq → upper 归一为 NASDAQ 并透传', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(['codes', 'us'], { market: 'nasdaq' }, { codes: { us: fn } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ market: 'NASDAQ' }));
  });

  it('codes cn --market 仍接受 sh/sz/bj/kc/cy 且校验非法值', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(['codes', 'cn'], { market: 'kc' }, { codes: { cn: fn } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ market: 'kc' }));
    await expect(
      run(['codes', 'cn'], { market: 'NASDAQ' }, { codes: { cn: fn } })
    ).rejects.toBeInstanceOf(CliUsageError);
  });

  it('codes 别名 --board 仅 A 股可用,us 路径拒绝', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await expect(
      run(['codes', 'us'], { board: 'sh' }, { codes: { us: fn } })
    ).rejects.toBeInstanceOf(CliUsageError);
  });
});

describe('F11 batch hk/byCodes 不再声明无效 --market', () => {
  it('batch hk --market sh → 未知选项报错(而非静默忽略)', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await expect(
      run(['batch', 'hk'], { market: 'sh' }, { batch: { hk: fn } })
    ).rejects.toBeInstanceOf(CliUsageError);
  });

  it('batch us --market nyse → enum 校验 + upper 透传', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(['batch', 'us'], { market: 'nyse' }, { batch: { us: fn } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ market: 'NYSE' }));
  });
});

describe('F12 board minuteKline 死选项移除', () => {
  it('--adjust 不再被静默丢弃,报未知选项', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await expect(
      run(
        ['board', 'industry', 'minuteKline', 'BK0475'],
        { adjust: 'hfq' },
        { board: { industry: { minuteKline: fn } } }
      )
    ).rejects.toBeInstanceOf(CliUsageError);
  });

  it('--period 正常透传', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(
      ['board', 'industry', 'minuteKline', 'BK0475'],
      { period: '5' },
      { board: { industry: { minuteKline: fn } } }
    );
    expect(fn).toHaveBeenCalledWith('BK0475', expect.objectContaining({ period: '5' }));
  });
});

describe('F13 港/美分时 --ndays 可达', () => {
  it('kline hkMinute --ndays 5 → 透传 ndays', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(
      ['kline', 'hkMinute', '00700'],
      { ndays: '5' },
      { kline: { hkMinute: fn } }
    );
    expect(fn).toHaveBeenCalledWith('00700', expect.objectContaining({ ndays: 5 }));
  });

  it('minute 别名对港股转发 ndays', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(
      ['minute', '00700'],
      { ndays: '3' },
      { kline: { hkMinute: fn } }
    );
    expect(fn).toHaveBeenCalledWith('00700', expect.objectContaining({ ndays: 3 }));
  });

  it('minute 别名对 A 股 --ndays 报错而非静默丢弃', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await expect(
      run(['minute', '600519'], { ndays: '3' }, { kline: { cnMinute: fn } })
    ).rejects.toBeInstanceOf(CliUsageError);
  });
});

describe('F14 indicators 别名支持 --market', () => {
  it('indicators 00992 --market HK → withIndicators 收到 market HK', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(
      ['indicators', '00992'],
      { market: 'hk', ma: '5,10' },
      { kline: { withIndicators: fn } }
    );
    expect(fn).toHaveBeenCalledWith(
      '00992',
      expect.objectContaining({ market: 'HK' })
    );
  });
});

describe('F16 toNumberArray 空段与非法周期过滤', () => {
  it("'5,10,'(尾逗号)→ [5,10] 而非 [5,10,0]", () => {
    expect(toNumberArray('5,10,')).toEqual([5, 10]);
  });

  it("'5,,10' → [5,10]", () => {
    expect(toNumberArray('5,,10')).toEqual([5, 10]);
  });

  it('0/负数/小数周期被过滤', () => {
    expect(toNumberArray('0,-5,2.5,20')).toEqual([20]);
  });

  it('端到端:indicators --ma 5,10, 不再产出 ma0 NaN 列', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await run(
      ['indicators', '600519'],
      { ma: '5,10,' },
      { kline: { withIndicators: fn } }
    );
    expect(fn).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({ indicators: { ma: { periods: [5, 10] } } })
    );
  });
});

describe('F8 datacenter 日期归一(provider 层)', () => {
  function captureClient(): { client: RequestClient; urls: string[] } {
    const urls: string[] = [];
    const client = {
      get: vi.fn(async (url: string) => {
        urls.push(url);
        return { result: { data: [] } };
      }),
    } as unknown as RequestClient;
    return { client, urls };
  }

  it('toIsoDate: YYYYMMDD → YYYY-MM-DD,其余原样', () => {
    expect(toIsoDate('20240101')).toBe('2024-01-01');
    expect(toIsoDate('2024-01-01')).toBe('2024-01-01');
  });

  it('northbound history --start 20240101 → filter 用 2024-01-01', async () => {
    const { client, urls } = captureClient();
    await getNorthboundHistory(client, 'north', {
      startDate: '20240101',
      endDate: '20240131',
    });
    expect(decodeURIComponent(urls[0])).toContain("TRADE_DATE>='2024-01-01'");
    expect(decodeURIComponent(urls[0])).toContain("TRADE_DATE<='2024-01-31'");
  });

  it('northbound individual 同样归一', async () => {
    const { client, urls } = captureClient();
    await getNorthboundIndividual(client, '600519', { startDate: '20240101' });
    expect(decodeURIComponent(urls[0])).toContain("TRADE_DATE>='2024-01-01'");
  });

  it('futures inventory 同样归一', async () => {
    const { client, urls } = captureClient();
    await getFuturesInventory(client, 'rb', { startDate: '20240101' });
    expect(decodeURIComponent(urls[0])).toContain("TRADE_DATE>='2024-01-01'");
  });
});

describe('F9 分钟K线窗口归一', () => {
  it('normalizeMinuteWindow: 8 位日期补横线,end 仅日期补 23:59', () => {
    expect(normalizeMinuteWindow('20250601', '20250601')).toEqual({
      start: '2025-06-01',
      end: '2025-06-01 23:59',
    });
    expect(normalizeMinuteWindow('2025-06-01 09:30', '2025-06-01T11:30')).toEqual({
      start: '2025-06-01 09:30',
      end: '2025-06-01 11:30',
    });
  });

  it('getMinuteKline --start 20250601(文档格式)不再整天过滤为空', async () => {
    const trends = [
      '2025-06-01 09:31,10,10.1,10.2,9.9,100,1000,10.05',
      '2025-06-01 09:32,10.1,10.2,10.3,10.0,110,1100,10.06',
    ];
    const client = {
      get: vi.fn(async () => ({ data: { trends } })),
    } as unknown as RequestClient;
    const rows = await getMinuteKline(client, '600519', {
      period: '1',
      startDate: '20250601',
      endDate: '20250601',
    });
    expect(rows.length).toBe(2);
  });
});
