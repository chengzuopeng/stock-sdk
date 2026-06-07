/**
 * 统一缓存层（B3）单测
 */
import { describe, it, expect } from 'vitest';
import {
  MemoryCacheStore,
  cacheThrough,
  createCacheKey,
  type CacheStore,
} from '../../../src/cache';

describe('MemoryCacheStore', () => {
  it('get/set/delete/clear', () => {
    const s = new MemoryCacheStore();
    expect(s.get('k')).toBeUndefined();
    s.set('k', 1);
    expect(s.get('k')).toBe(1);
    s.delete('k');
    expect(s.get('k')).toBeUndefined();
    s.set('a', 1);
    s.clear();
    expect(s.get('a')).toBeUndefined();
  });
});

describe('createCacheKey', () => {
  it('joins parts and skips null/undefined', () => {
    expect(createCacheKey('codes', 'cn', undefined, 'kc')).toBe('codes:cn:kc');
  });
});

describe('cacheThrough', () => {
  it('caches on miss, hits on second call (sync store)', async () => {
    const s = new MemoryCacheStore();
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return 'v';
    };
    expect(await cacheThrough(s, 'k', fetcher)).toBe('v');
    expect(await cacheThrough(s, 'k', fetcher)).toBe('v');
    expect(calls).toBe(1);
  });

  it('works with an async store adapter', async () => {
    const map = new Map<string, unknown>();
    const asyncStore: CacheStore = {
      get: async (k) => map.get(k),
      set: async (k, v) => {
        map.set(k, v);
      },
      delete: async (k) => {
        map.delete(k);
      },
      clear: async () => {
        map.clear();
      },
    };
    let calls = 0;
    const r1 = await cacheThrough(asyncStore, 'x', async () => {
      calls++;
      return 42;
    });
    const r2 = await cacheThrough(asyncStore, 'x', async () => {
      calls++;
      return 42;
    });
    expect(r1).toBe(42);
    expect(r2).toBe(42);
    expect(calls).toBe(1);
  });
});
