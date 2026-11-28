/**
 * Review 修复回归（commit 7 边角批，provider/指标/MCP 侧）：
 * - F21 hk/usKline toLocal 的 NaN 时间戳归一为 null
 * - F22 DMI adxPeriod ≠ period 时 ADX 种子
 * - F26 FundDividend 补 dividendType 字段（v1 raw[6] 的替代）
 * - F17 MCP transport 超长消息丢弃模式
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { RequestClient } from '../../../src/core';
import { getHKMinuteKline } from '../../../src/providers/eastmoney/hkKline';
import { getFundDividendList } from '../../../src/providers/eastmoney/fund';
import { calcDMI } from '../../../src/indicators/dmi';
import {
  createLineReader,
  MAX_LINE_BYTES,
} from '../../../src/mcp/transport';

describe('F21 toLocal NaN → null', () => {
  it('港股分时遇到无法解析的时间串,timestamp 为 null 而非 NaN', async () => {
    // '10:3' 单位数分钟不匹配任何解析格式 → parseMarketTime 为 NaN;
    // 字符串本身仍落在默认时间窗口内(纯乱码会被窗口过滤,观察不到映射)
    const trends = ['2024-05-10 10:3,1,2,3,4,5,6,7'];
    const client = {
      get: vi.fn(async () => ({ data: { trends } })),
    } as unknown as RequestClient;
    const rows = (await getHKMinuteKline(client, '00700', {
      period: '1',
    })) as Array<{ timestamp: number | null; time: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0].timestamp).toBeNull();
    expect(Number.isNaN(rows[0].timestamp as unknown as number)).toBe(false);
    // 原始字符串保留在 time 字段供排查
    expect(rows[0].time).toBe('2024-05-10 10:3');
  });

  it('正常时间串仍输出数值时间戳', async () => {
    const trends = ['2024-05-10 10:30,1,2,3,4,5,6,7'];
    const client = {
      get: vi.fn(async () => ({ data: { trends } })),
    } as unknown as RequestClient;
    const rows = (await getHKMinuteKline(client, '00700', {
      period: '1',
    })) as Array<{ timestamp: number | null }>;
    expect(typeof rows[0].timestamp).toBe('number');
  });
});

describe('F22 DMI adxPeriod 独立于 period', () => {
  /** 单边上涨序列:+DM 恒正、-DM 恒 0 → DX 恒 100,ADX 种子必为 100 */
  function risingData(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      open: 10 + i,
      close: 11 + i,
      high: 12 + i,
      low: 9 + i,
      volume: 1000,
    }));
  }

  it('adxPeriod < period:种子为窗口均值(旧实现会得到 period/adxPeriod 倍的离谱值)', () => {
    const out = calcDMI(risingData(60), { period: 14, adxPeriod: 5 });
    const adxValues = out.map((r) => r.adx).filter((v): v is number => v !== null);
    expect(adxValues.length).toBeGreaterThan(0);
    // DX 恒 100 → 任何窗口平均都是 100;旧实现种子 = 100*14/5 = 280
    for (const v of adxValues) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(100 + 1e-9);
    }
    expect(adxValues[0]).toBeCloseTo(100, 6);
  });

  it('默认 adxPeriod === period 行为不变(种子 100)', () => {
    const out = calcDMI(risingData(60), { period: 14 });
    const firstAdx = out.find((r) => r.adx !== null)?.adx;
    expect(firstAdx).toBeCloseTo(100, 6);
  });
});

describe('F26 FundDividend.dividendType(v1 raw[6] 的替代)', () => {
  it('第 7 列映射为 dividendType,缺失为 null', async () => {
    const js =
      'var pageinfo = [1, 20, 1];' +
      'var jjfh_data = [' +
      '["000001","基金A","2024-01-01","2024-01-02","0.05","2024-01-03","1"],' +
      '["000002","基金B","2024-02-01","2024-02-02","0.10","2024-02-03",""]' +
      '];';
    const client = {
      get: vi.fn(async () => js),
    } as unknown as RequestClient;
    const result = await getFundDividendList(client, { year: 2024 });
    expect(result.items[0].dividendType).toBe('1');
    expect(result.items[1].dividendType).toBeNull();
  });
});

describe('F17 MCP transport 超长消息丢弃模式', () => {
  afterEach(() => {
    process.stdin.removeAllListeners('data');
    vi.restoreAllMocks();
  });

  it('被腰斩的超长消息:尾部不再被误析,且回复 message-too-large 错误', () => {
    const lines: string[] = [];
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation(((s: string) => {
      writes.push(String(s));
      return true;
    }) as never);
    vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as never);

    createLineReader((l) => lines.push(l));

    // 模拟 stdin 分片:超长首片(无换行) → 中间片 → 尾片(带换行)+ 后续正常消息
    process.stdin.emit('data', 'x'.repeat(MAX_LINE_BYTES + 10));
    process.stdin.emit('data', 'still-the-same-message');
    process.stdin.emit('data', 'tail-end\n{"jsonrpc":"2.0","id":1}\n');

    // 尾部 'tail-end' 没有被当作独立消息回调(旧实现会产生伪 Parse error)
    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}']);
    // 丢弃完成后回了一条 message-too-large 错误
    const errReply = writes.find((w) => w.includes('Message too large'));
    expect(errReply).toBeTruthy();
    expect(errReply).toContain('"id":null');
  });

  it('正常多行消息不受影响', () => {
    const lines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never);
    vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as never);
    createLineReader((l) => lines.push(l));
    process.stdin.emit('data', '{"a":1}\n{"b":2}\n');
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
  });
});
