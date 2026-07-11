/**
 * 缓存模块单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MemoryCache,
  clearSharedCaches,
  createCacheKey,
  getSharedCache,
  getClientScopedCache,
  clearClientScopedCaches,
} from '../../src/core/cache';

describe('MemoryCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get values', () => {
    const cache = new MemoryCache<string>();
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    const cache = new MemoryCache<string>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should expire values after TTL', () => {
    const cache = new MemoryCache<string>({ defaultTTL: 1000 });
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');

    // 前进 1001ms
    vi.advanceTimersByTime(1001);

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should respect per-key TTL', () => {
    const cache = new MemoryCache<string>({ defaultTTL: 5000 });
    cache.set('key1', 'value1', 1000); // 1秒过期
    cache.set('key2', 'value2'); // 使用默认 5秒

    vi.advanceTimersByTime(1001);

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should evict LRU when maxSize is reached', () => {
    const cache = new MemoryCache<string>({ maxSize: 3 });
    cache.set('key1', 'value1');
    vi.advanceTimersByTime(10);
    cache.set('key2', 'value2');
    vi.advanceTimersByTime(10);
    cache.set('key3', 'value3');
    vi.advanceTimersByTime(10);

    // 访问 key1，更新其 lastAccess
    cache.get('key1');
    vi.advanceTimersByTime(10);

    // 添加第 4 个，应该淘汰最久未访问的 key2
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeUndefined(); // 被淘汰
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should cleanup expired entries', () => {
    const cache = new MemoryCache<string>({ defaultTTL: 1000 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    vi.advanceTimersByTime(1001);

    const cleaned = cache.cleanup();
    expect(cleaned).toBe(2);
    expect(cache.size).toBe(0);
  });

  it('should delete specific keys', () => {
    const cache = new MemoryCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.delete('key1');

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should clear all entries', () => {
    const cache = new MemoryCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.clear();

    expect(cache.size).toBe(0);
  });

  it('should work with getOrFetch', async () => {
    vi.useRealTimers();

    const cache = new MemoryCache<string>();
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount++;
      return 'fetched-value';
    };

    // 第一次调用应该执行 fetcher
    const result1 = await cache.getOrFetch('key1', fetcher);
    expect(result1).toBe('fetched-value');
    expect(fetchCount).toBe(1);

    // 第二次调用应该使用缓存
    const result2 = await cache.getOrFetch('key1', fetcher);
    expect(result2).toBe('fetched-value');
    expect(fetchCount).toBe(1); // 没有再次调用 fetcher
  });

  it('should dedupe concurrent getOrFetch calls', async () => {
    vi.useRealTimers();

    const cache = new MemoryCache<string>();
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 'shared-result';
    });

    const [value1, value2] = await Promise.all([
      cache.getOrFetch('key1', fetcher),
      cache.getOrFetch('key1', fetcher),
    ]);

    expect(value1).toBe('shared-result');
    expect(value2).toBe('shared-result');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('shared cache registry', () => {
  afterEach(() => {
    clearSharedCaches();
  });

  it('should return the same cache instance for the same namespace', () => {
    const cacheA = getSharedCache<string>('codes');
    const cacheB = getSharedCache<string>('codes');

    cacheA.set('a', '1');
    expect(cacheB.get('a')).toBe('1');
    expect(cacheA).toBe(cacheB);
  });

  it('should clear registered shared caches', () => {
    const cache = getSharedCache<string>('calendar');
    cache.set('today', 'open');

    clearSharedCaches();

    expect(cache.get('today')).toBeUndefined();
  });
});

describe('createCacheKey', () => {
  it('should create cache key from parts', () => {
    expect(createCacheKey('a', 'b', 'c')).toBe('a:b:c');
  });

  it('should handle numbers and booleans', () => {
    expect(createCacheKey('symbol', 123, true)).toBe('symbol:123:true');
  });

  it('should filter out undefined and null', () => {
    expect(createCacheKey('a', undefined, 'b', null, 'c')).toBe('a:\u2205:b:\u2205:c');
  });
});

describe('evictLRU 空字符串键（R7-11a 回归）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("'' 为 LRU 时同样被淘汰，容量保持有界", () => {
    const cache = new MemoryCache<string>({ maxSize: 2 });
    cache.set('', 'empty-key'); // 最早访问 → LRU
    vi.advanceTimersByTime(10);
    cache.set('a', '1');
    vi.advanceTimersByTime(10);
    cache.set('b', '2'); // 触发淘汰，应淘汰 ''

    expect(cache.size).toBe(2);
    expect(cache.get('')).toBeUndefined();
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBe('2');
  });

  it('修复前场景：持续写入不再无界增长', () => {
    const cache = new MemoryCache<string>({ maxSize: 3 });
    cache.set('', 'v');
    for (let i = 0; i < 7; i++) {
      vi.advanceTimersByTime(10);
      cache.set(`k${i}`, String(i));
    }
    expect(cache.size).toBe(3);
  });
});

describe('getClientScopedCache（R7-11a 基建）', () => {
  it('同一 client + namespace 返回同一实例', () => {
    const client = {};
    const a = getClientScopedCache<string>(client, 'ns', { maxSize: 4 });
    const b = getClientScopedCache<string>(client, 'ns');
    a.set('k', 'v');
    expect(b).toBe(a);
    expect(b.get('k')).toBe('v');
  });

  it('不同 client 相互隔离（mock 实例的数据不会串给真实实例）', () => {
    const clientA = {};
    const clientB = {};
    getClientScopedCache<string>(clientA, 'tencent:code-lists').set('a-share:full', 'mock-data');
    expect(
      getClientScopedCache<string>(clientB, 'tencent:code-lists').get('a-share:full')
    ).toBeUndefined();
  });

  it('同一 client 的不同 namespace 相互隔离', () => {
    const client = {};
    getClientScopedCache<string>(client, 'ns1').set('k', '1');
    expect(getClientScopedCache<string>(client, 'ns2').get('k')).toBeUndefined();
  });

  it('clearClientScopedCaches 只清指定 client', () => {
    const clientA = {};
    const clientB = {};
    getClientScopedCache<string>(clientA, 'ns').set('k', 'a');
    getClientScopedCache<string>(clientB, 'ns').set('k', 'b');

    clearClientScopedCaches(clientA);

    expect(getClientScopedCache<string>(clientA, 'ns').get('k')).toBeUndefined();
    expect(getClientScopedCache<string>(clientB, 'ns').get('k')).toBe('b');
  });
});
