/**
 * 缓存模块单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache, createCacheKey } from '../../src/core/cache';

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
});

describe('createCacheKey', () => {
  it('should create cache key from parts', () => {
    expect(createCacheKey('a', 'b', 'c')).toBe('a:b:c');
  });

  it('should handle numbers and booleans', () => {
    expect(createCacheKey('symbol', 123, true)).toBe('symbol:123:true');
  });

  it('should filter out undefined and null', () => {
    expect(createCacheKey('a', undefined, 'b', null, 'c')).toBe('a:b:c');
  });
});
