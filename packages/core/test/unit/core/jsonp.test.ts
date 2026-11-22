import { describe, it, expect } from 'vitest';
import { extractJsonFromJsonp } from '../../../src/core/jsonp';

describe('extractJsonFromJsonp', () => {
  it('should extract JSON from openapi.php response', () => {
    const raw = `/*<script>location.href='//sina.com';</script>*/\nmyCallback({"result":{"status":{"code":0},"data":{"up":[],"down":[]}}})`;
    const result = extractJsonFromJsonp(raw) as { result: { data: { up: unknown[]; down: unknown[] } } };
    expect(result.result.data.up).toEqual([]);
    expect(result.result.data.down).toEqual([]);
  });

  it('should extract JSON from jsonp.php response (array)', () => {
    const raw = `/*<script>location.href='//sina.com';</script>*/\ncb123([{"d":"2025-01-20","o":"305","h":"305","l":"293","c":"293","v":"6"}])`;
    const result = extractJsonFromJsonp(raw) as { d: string }[];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].d).toBe('2025-01-20');
  });

  it('should handle response without script comment', () => {
    const raw = `callback({"foo":"bar"})`;
    const result = extractJsonFromJsonp(raw) as { foo: string };
    expect(result.foo).toBe('bar');
  });

  it('should handle null JSONP response', () => {
    const raw = `/*<script></script>*/\ncb(null)`;
    const result = extractJsonFromJsonp(raw);
    expect(result).toBeNull();
  });

  it('should throw on missing parenthesis', () => {
    expect(() => extractJsonFromJsonp('no parens here')).toThrow('no opening parenthesis');
  });

  it('should throw on invalid JSON inside callback', () => {
    expect(() => extractJsonFromJsonp('cb({invalid json})')).toThrow();
  });

  it('should handle nested objects', () => {
    const raw = `/**/\ncb({"result":{"status":{"code":0},"data":{"contractMonth":["2026-03","2026-04"],"stockId":"510050"}}})`;
    const result = extractJsonFromJsonp(raw) as { result: { data: { contractMonth: string[] } } };
    expect(result.result.data.contractMonth).toEqual(['2026-03', '2026-04']);
  });
});
