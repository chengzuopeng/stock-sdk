import { describe, it, expect } from 'vitest';
import { parseArgv } from '../../../src/cli/parser';

describe('parseArgv', () => {
  it('位置参数 + --key value', () => {
    const r = parseArgv(['quote', '600519', '--market', 'a']);
    expect(r.positional).toEqual(['quote', '600519']);
    expect(r.options.market).toBe('a');
  });

  it('--key=value', () => {
    expect(parseArgv(['--period=weekly']).options.period).toBe('weekly');
  });

  it('布尔 flag（在集合中）置 true，不吞下一个 token', () => {
    const r = parseArgv(['--full', '600519'], new Set(['full']));
    expect(r.options.full).toBe(true);
    expect(r.positional).toEqual(['600519']);
  });

  it('未在布尔集合的 flag 贪婪吃 value', () => {
    const r = parseArgv(['kline', '600519', '--period', 'weekly']);
    expect(r.options.period).toBe('weekly');
    expect(r.positional).toEqual(['kline', '600519']);
  });

  it('-- 终止 flag 解析', () => {
    const r = parseArgv(['kline', '--', '--weird']);
    expect(r.positional).toEqual(['kline', '--weird']);
  });

  it('重复 flag 收集成数组', () => {
    expect(parseArgv(['--code', 'a', '--code', 'b']).options.code).toEqual(['a', 'b']);
  });

  it('负数 token 视为位置参数', () => {
    expect(parseArgv(['calc', '-5']).positional).toEqual(['calc', '-5']);
  });

  it('短 flag', () => {
    const r = parseArgv(['--quiet', '-q'], new Set(['quiet', 'q']));
    expect(r.options.quiet).toBe(true);
    expect(r.options.q).toBe(true);
  });
});
