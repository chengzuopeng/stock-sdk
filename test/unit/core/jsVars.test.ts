import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseJsVars, fetchJsVars } from '../../../src/core';

describe('parseJsVars (synchronous text extraction)', () => {
  it('extracts an array literal', () => {
    const text = 'var arr = [1, 2, 3];';
    expect(parseJsVars<{ arr: number[] }>(text, ['arr'])).toEqual({
      arr: [1, 2, 3],
    });
  });

  it('extracts a nested array literal', () => {
    const text = 'var data = [["a", 1], ["b", 2]];';
    expect(parseJsVars<{ data: unknown[] }>(text, ['data'])).toEqual({
      data: [
        ['a', 1],
        ['b', 2],
      ],
    });
  });

  it('extracts an object literal', () => {
    const text = 'var obj = {"k": "v", "n": 42};';
    expect(parseJsVars<{ obj: Record<string, unknown> }>(text, ['obj'])).toEqual({
      obj: { k: 'v', n: 42 },
    });
  });

  it('extracts string / number / boolean / null', () => {
    const text =
      'var s = "hello"; var n = 3.14; var b = true; var z = null;';
    expect(parseJsVars(text, ['s', 'n', 'b', 'z'])).toEqual({
      s: 'hello',
      n: 3.14,
      b: true,
      z: null,
    });
  });

  it('handles semicolons inside string values without splitting', () => {
    const text = 'var s = "a;b;c"; var n = 1;';
    expect(parseJsVars(text, ['s', 'n'])).toEqual({ s: 'a;b;c', n: 1 });
  });

  it('handles brackets inside string values without breaking nesting', () => {
    const text = 'var s = "][}{"; var arr = [1, 2];';
    expect(parseJsVars(text, ['s', 'arr'])).toEqual({
      s: '][}{',
      arr: [1, 2],
    });
  });

  it('accepts var / let / const declarations', () => {
    const text = 'var a = 1; let b = 2; const c = 3;';
    expect(parseJsVars(text, ['a', 'b', 'c'])).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('returns no key for variables that are not present', () => {
    const text = 'var a = 1;';
    const out = parseJsVars(text, ['a', 'missing'] as ('a' | 'missing')[]);
    expect(out).toEqual({ a: 1 });
    expect('missing' in out).toBe(false);
  });

  it('returns no key for variables whose value is not valid JSON', () => {
    // JS 字面量但非 JSON：未引号 key、单引号
    const text = "var bad = {key: 'value'}; var good = [1];";
    const out = parseJsVars(text, ['bad', 'good']);
    expect(out).toEqual({ good: [1] });
    expect('bad' in out).toBe(false);
  });

  it('parses real funddataIndex_Interface-style payload', () => {
    const text =
      'var pageinfo = [67, 100, 1]; ' +
      'var jjfh_data = [' +
      '["508019","中金湖北科投光谷REIT","2024-12-31","2024-12-31","0.03033","2025-01-03","6"],' +
      '["110011","易方达优质精选混合","2024-12-30","2024-12-30","0.05","2024-12-31","1"]' +
      '];';
    const out = parseJsVars<{
      pageinfo: [number, number, number];
      jjfh_data: string[][];
    }>(text, ['pageinfo', 'jjfh_data']);
    expect(out.pageinfo).toEqual([67, 100, 1]);
    expect(out.jjfh_data).toHaveLength(2);
    expect(out.jjfh_data?.[1][0]).toBe('110011');
  });

  it('parses real pingzhongdata-style net worth trend', () => {
    const text =
      'var fS_name = "测试基金"; ' +
      'var Data_netWorthTrend = [{"x":1262620800000,"y":1.0,"equityReturn":0.0,"unitMoney":""},{"x":1262707200000,"y":1.0002,"equityReturn":0.02,"unitMoney":""}];';
    const out = parseJsVars<{
      fS_name: string;
      Data_netWorthTrend: Array<{ x: number; y: number; equityReturn: number }>;
    }>(text, ['fS_name', 'Data_netWorthTrend']);
    expect(out.fS_name).toBe('测试基金');
    expect(out.Data_netWorthTrend).toHaveLength(2);
    expect(out.Data_netWorthTrend?.[1].y).toBeCloseTo(1.0002);
  });
});

describe('fetchJsVars (Node fetch path)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('var a = [10, 20]; var b = "ok";', {
          status: 200,
          headers: { 'content-type': 'application/javascript' },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed variables when HTTP 200', async () => {
    const out = await fetchJsVars<{ a: number[]; b: string }>(
      'https://example.com/x.js',
      ['a', 'b']
    );
    expect(out).toEqual({ a: [10, 20], b: 'ok' });
  });

  it('throws on non-2xx HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    );
    await expect(
      fetchJsVars('https://example.com/x.js', ['a'])
    ).rejects.toThrow(/fetchJsVars fetch failed.*500/);
  });

  it('throws on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError')
              );
            });
          })
      )
    );
    await expect(
      fetchJsVars('https://example.com/x.js', ['a'], { timeout: 50 })
    ).rejects.toThrow(/timed out after 50ms/);
  });
});
