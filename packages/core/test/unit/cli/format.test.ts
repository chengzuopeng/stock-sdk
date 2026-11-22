import { describe, it, expect } from 'vitest';
import { formatOutput, isEmptyResult } from '../../../src/cli/format';

const rows = [
  { code: 'a', price: 1 },
  { code: 'b', price: 22 },
];

describe('formatOutput', () => {
  it('json 默认单行', () => {
    expect(formatOutput(rows, 'json', false)).toBe(JSON.stringify(rows));
  });

  it('json --pretty 缩进', () => {
    expect(formatOutput(rows, 'json', true)).toContain('\n');
  });

  it('csv 表头 + 行', () => {
    const csv = formatOutput(rows, 'csv', false);
    expect(csv.split('\n')[0]).toBe('code,price');
    expect(csv).toContain('a,1');
  });

  it('csv 转义含逗号的值', () => {
    expect(formatOutput([{ name: 'a,b' }], 'csv', false)).toContain('"a,b"');
  });

  it('table 含表头', () => {
    const t = formatOutput(rows, 'table', false);
    expect(t).toContain('code');
    expect(t).toContain('price');
  });

  it('空结果返回空串', () => {
    expect(formatOutput([], 'table', false)).toBe('');
  });
});

describe('isEmptyResult', () => {
  it('空数组 / null / undefined 为空', () => {
    expect(isEmptyResult([])).toBe(true);
    expect(isEmptyResult(null)).toBe(true);
    expect(isEmptyResult(undefined)).toBe(true);
  });
  it('非空数组不为空', () => {
    expect(isEmptyResult([1])).toBe(false);
  });
});
