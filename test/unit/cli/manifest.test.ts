import { describe, it, expect } from 'vitest';
import {
  allMethodPaths,
  collectBooleanFlags,
  findCommand,
  namespaceMethodCount,
} from '../../../src/cli/manifest';

describe('findCommand — 命名空间 vs 别名歧义', () => {
  it('`kline cn 600519` 走命名空间 kline.cn（≥2 段优先）', () => {
    const m = findCommand(['kline', 'cn', '600519']);
    expect(m?.spec.path).toEqual(['kline', 'cn']);
    expect(m?.rest).toEqual(['600519']);
    expect(m?.spec.invoke).toBeUndefined(); // 命名空间方法无自定义 invoke
  });

  it('`kline 600519` 走别名 kline（symbol=600519）', () => {
    const m = findCommand(['kline', '600519']);
    expect(m?.spec.alias).toContain('kline');
    expect(m?.rest).toEqual(['600519']);
  });

  it('`codes cn` 走命名空间 codes.cn', () => {
    expect(findCommand(['codes', 'cn'])?.spec.path).toEqual(['codes', 'cn']);
  });

  it('`codes a` 走别名 codes', () => {
    const m = findCommand(['codes', 'a']);
    expect(m?.spec.alias).toContain('codes');
    expect(m?.rest).toEqual(['a']);
  });

  it('`board industry list` 命中 3 段命名空间', () => {
    const m = findCommand(['board', 'industry', 'list']);
    expect(m?.spec.path).toEqual(['board', 'industry', 'list']);
    expect(m?.rest).toEqual([]);
  });

  it('`quote 600519` 走别名（quote 非命名空间名）', () => {
    expect(findCommand(['quote', '600519'])?.spec.alias).toContain('quote');
  });

  it('`options etf dailyKline X` 命中 3 段', () => {
    const m = findCommand(['options', 'etf', 'dailyKline', 'X']);
    expect(m?.spec.path).toEqual(['options', 'etf', 'dailyKline']);
    expect(m?.rest).toEqual(['X']);
  });

  it('未知命令返回 null', () => {
    expect(findCommand(['bogusxyz'])).toBeNull();
  });
});

describe('manifest 完整性', () => {
  it('85 个命名空间方法 + 顶层 search', () => {
    expect(namespaceMethodCount()).toBe(85);
    const paths = allMethodPaths();
    expect(paths).toContain('search');
    expect(paths.length).toBe(86);
  });

  it('collectBooleanFlags 含全局、声明布尔与全部布尔指标 flag', () => {
    const f = collectBooleanFlags();
    for (const k of [
      'full', 'simple', 'help', 'q', 'pretty',
      'macd', 'kdj', 'boll', 'cci', 'atr', 'obv', 'roc', 'dmi', 'sar', 'kc',
    ]) {
      expect(f.has(k)).toBe(true);
    }
  });
});
