/**
 * 通用缓存模块
 * 支持 TTL（过期时间）和 LRU 淘汰策略
 */

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 默认过期时间（毫秒），0 表示永不过期 */
  defaultTTL?: number;
  /** 最大缓存条目数，超出时按 LRU 淘汰 */
  maxSize?: number;
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  value: T;
  expireAt: number; // 0 表示永不过期
  lastAccess: number;
}

/**
 * 通用内存缓存
 * 
 * 特性：
 * - 支持 TTL 过期
 * - 支持 LRU 淘汰
 * - 支持手动清理
 */
export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.defaultTTL ?? 0;
    this.maxSize = options.maxSize ?? 1000;
  }

  /**
   * 获取缓存值
   * @returns 缓存值，不存在或已过期返回 undefined
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (entry.expireAt > 0 && Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问时间（LRU）
    entry.lastAccess = Date.now();
    return entry.value;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），不传则使用默认值
   */
  set(key: string, value: T, ttl?: number): void {
    // 检查是否需要淘汰
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const effectiveTTL = ttl ?? this.defaultTTL;
    const now = Date.now();

    this.cache.set(key, {
      value,
      expireAt: effectiveTTL > 0 ? now + effectiveTTL : 0,
      lastAccess: now,
    });
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expireAt > 0 && now > entry.expireAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 淘汰最久未访问的缓存（LRU）
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 带缓存的异步获取
   * 如果缓存存在则返回缓存，否则执行 fetcher 并缓存结果
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }
}

/**
 * 生成缓存键的辅助函数
 */
export function createCacheKey(...parts: (string | number | boolean | undefined | null)[]): string {
  return parts
    .filter((p) => p !== undefined && p !== null)
    .map(String)
    .join(':');
}
