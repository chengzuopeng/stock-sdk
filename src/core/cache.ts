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
  private inflight: Map<string, Promise<T>> = new Map();
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
    this.inflight.clear();
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

    // R7-11a: 必须用 !== null 而非真值判断 —— 空字符串是合法键
    // （createCacheKey() 零参即产出 ''），真值判断会让 '' 成为 LRU 时
    // 淘汰永久失效（缓存无界增长；配合容量收缩循环则直接死循环）
    if (oldestKey !== null) {
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

    const inflight = this.inflight.get(key);
    if (inflight) {
      return inflight;
    }

    const nextPromise = fetcher()
      .then((value) => {
        this.set(key, value, ttl);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, nextPromise);
    return nextPromise;
  }
}

const sharedCaches = new Map<string, MemoryCache<unknown>>();

/**
 * 获取具名共享缓存
 */
export function getSharedCache<T = unknown>(
  namespace: string,
  options?: CacheOptions
): MemoryCache<T> {
  const cached = sharedCaches.get(namespace);
  if (cached) {
    return cached as MemoryCache<T>;
  }

  const nextCache = new MemoryCache<T>(options);
  sharedCaches.set(namespace, nextCache as MemoryCache<unknown>);
  return nextCache;
}

/**
 * 清空所有共享缓存
 */
export function clearSharedCaches(): void {
  for (const cache of sharedCaches.values()) {
    cache.clear();
  }
}

const clientScopedCaches = new WeakMap<object, Map<string, MemoryCache<unknown>>>();

/**
 * 按 client 实例隔离的具名缓存：同一 client + namespace 返回同一实例。
 *
 * 用于"数据经由某个 client 的传输栈取回"的缓存（代码表 / 交易日历 /
 * 板块映射 / us-secid 等），避免自定义 fetchImpl（mock / 代理）实例
 * 取回的数据串到其它 StockSDK 实例（R7-11）。
 *
 * 语义与 {@link getSharedCache} 一致为 first-wins：`options` 仅在该
 * (client, namespace) 首次创建时生效，后续调用传入的 options 被忽略
 * ——SDK 内部各调用点统一使用模块级常量 options，无二次配置意图。
 * client 被 GC 后其全部缓存随 WeakMap 自动释放。
 */
export function getClientScopedCache<T = unknown>(
  client: object,
  namespace: string,
  options?: CacheOptions
): MemoryCache<T> {
  let byNs = clientScopedCaches.get(client);
  if (!byNs) {
    byNs = new Map();
    clientScopedCaches.set(client, byNs);
  }
  let cache = byNs.get(namespace);
  if (!cache) {
    cache = new MemoryCache<T>(options) as MemoryCache<unknown>;
    byNs.set(namespace, cache);
  }
  return cache as MemoryCache<T>;
}

/**
 * 清空某 client 的全部作用域缓存（测试 teardown / 手动强制失效用；
 * 面向 SDK 用户的入口是 `StockSDK.clearCaches()`）。
 */
export function clearClientScopedCaches(client: object): void {
  clientScopedCaches.delete(client);
}

/**
 * 生成缓存键的辅助函数
 */
export function createCacheKey(...parts: (string | number | boolean | undefined | null)[]): string {
  // F49: undefined/null 以固定占位符保位,不再静默丢弃 ——
  // 否则 ('q', undefined, 'hk') 与 ('q', 'hk') 撞 key,可选中间参数的
  // 调用方会拿到串味的缓存(本函数从包根导出,外部组合 key 是公开用法)。
  return parts
    .map((p) => (p === undefined || p === null ? '\u2205' : String(p)))
    .join(':');
}
