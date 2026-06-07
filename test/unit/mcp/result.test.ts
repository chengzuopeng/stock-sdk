import { describe, it, expect } from 'vitest';
import { toToolResult, toolErrorResult, MAX_ARRAY_ITEMS } from '../../../src/mcp/result';
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
