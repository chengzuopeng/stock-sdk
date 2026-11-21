import { describe, it, expect } from 'vitest';
import { toToolResult, toolErrorResult, MAX_ARRAY_ITEMS, MAX_TEXT_CHARS } from '../../../src/mcp/result';
import { SdkError } from '../../../src/core/errors';

describe('mcp/result · toToolResult', () => {
  it('包装为 text content', () => {
    const r = toToolResult({ a: 1 });
    expect(r.content[0].type).toBe('text');
    expect(JSON.parse(r.content[0].text)).toEqual({ a: 1 });
    expect(r.isError).toBeUndefined();
  });

  it('未超阈值的数组不裁剪', () => {
    const r = toToolResult([1, 2, 3]);
    expect(JSON.parse(r.content[0].text)).toEqual([1, 2, 3]);
  });

  it('超大数组被裁剪为 total + sample', () => {
    const big = Array.from({ length: MAX_ARRAY_ITEMS + 50 }, (_, i) => i);
    const parsed = JSON.parse(toToolResult(big).content[0].text);
    expect(parsed.truncated).toBe(true);
    expect(parsed.total).toBe(MAX_ARRAY_ITEMS + 50);
    expect(parsed.sample).toHaveLength(MAX_ARRAY_ITEMS);
    expect(parsed.sample[0]).toBe(0);
  });

  it('长时间序列按日期保留最近一端，并报告实际覆盖区间', () => {
    const rows = Array.from({ length: 420 }, (_, index) => ({
      date: new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10),
    }));
    const result = toToolResult(rows.slice().reverse(), 'recentSeries');
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed).toMatchObject({
      total: 420,
      returned: 200,
      start: rows[220].date,
      end: rows[419].date,
      truncated: true,
      sample: rows.slice(-200),
    });
  });

  it('200 条指标仍超出字符上限时继续缩减并保留最后一条', () => {
    const rows = Array.from({ length: 200 }, (_, index) => ({
      time: new Date(Date.UTC(2024, 0, 1, 0, index)).toISOString(),
      indicators: 'x'.repeat(600),
    }));
    const text = toToolResult(rows, 'recentSeries').content[0].text;
    const parsed = JSON.parse(text);

    expect(text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(parsed).toMatchObject({ truncated: true, total: 200, end: rows[199].time });
    expect(parsed.returned).toBeGreaterThan(0);
    expect(parsed.returned).toBeLessThan(200);
    expect(parsed.sample).toEqual(rows.slice(-parsed.returned));
  });

  it('未截断的时间序列仍返回数组', () => {
    const rows = [{ date: '2024-01-01' }];
    expect(JSON.parse(toToolResult(rows, 'recentSeries').content[0].text)).toEqual(rows);
  });

  it('排名样本超过字符上限时继续缩减，保留榜首', () => {
    const rows = Array.from({ length: 250 }, (_, index) => ({
      rank: index + 1, detail: 'x'.repeat(600),
    }));
    const text = toToolResult(rows).content[0].text;
    const parsed = JSON.parse(text);

    expect(text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(parsed).toMatchObject({ truncated: true, total: 250 });
    expect(parsed.returned).toBeGreaterThan(0);
    expect(parsed.returned).toBeLessThan(MAX_ARRAY_ITEMS);
    expect(parsed.sample).toEqual(rows.slice(0, parsed.returned));
  });

  it('undefined → text 为字符串 "null"(不丢 text 键)', () => {
    const r = toToolResult(undefined);
    expect(r.content[0].text).toBe('null');
    expect(typeof r.content[0].text).toBe('string');
  });

  it('对象型大结果按序列化大小整体省略', () => {
    const big = { data: 'x'.repeat(MAX_TEXT_CHARS + 100) };
    const r = toToolResult(big);
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.truncated).toBe(true);
    expect(parsed.reason).toBe('oversized');
    expect(r._meta?.truncated).toBe(true);
  });
});

describe('mcp/result · toolErrorResult', () => {
  it('SdkError → isError + 结构化 _meta', () => {
    const e = new SdkError({ code: 'TIMEOUT', message: 'boom', provider: 'tencent' });
    const r = toolErrorResult(e);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain('TIMEOUT');
    expect(r._meta?.code).toBe('TIMEOUT');
    expect(r._meta?.provider).toBe('tencent');
  });

  it('普通 Error → isError + code=UNKNOWN', () => {
    const r = toolErrorResult(new Error('plain'));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain('plain');
    expect(r._meta?.code).toBe('UNKNOWN');
  });
});
