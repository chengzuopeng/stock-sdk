/**
 * 统一可注入缓存层（v2 B3）
 *
 * - 复用 core 的 {@link MemoryCache}（TTL / LRU / getOrFetch）
 * - 定义可注入的 {@link CacheStore} 接口（用 MaybePromise 兼容同步内存与异步存储）
 * - 提供 {@link cacheThrough} 透明读写 helper
 */
import {
  MemoryCache,
  getSharedCache,
  clearSharedCaches,
  createCacheKey,
  type CacheOptions,
} from '../core/cache';

export {
  MemoryCache,
  getSharedCache,
  clearSharedCaches,
  createCacheKey,
  type CacheOptions,
};

export type MaybePromise<T> = T | Promise<T>;

/**
 * 可注入缓存存储接口。
 *
 * 内置 {@link MemoryCacheStore} 为同步实现；注入的 IndexedDB / 文件 / Redis 等
 * 异步存储可返回 `Promise`。读写处统一 `await`，对两类实现透明。
 * `get` 返回 `undefined` 表示未命中（故 fetcher 返回 `undefined` 不会被
 * {@link cacheThrough} 缓存；需缓存空结果请用 null / 哨兵值）。
 */
export interface CacheStore {
  get(key: string): MaybePromise<unknown>;
  set(key: string, value: unknown, ttl?: number): MaybePromise<void>;
  delete(key: string): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

/** 基于内存的默认 CacheStore（同步） */
export class MemoryCacheStore implements CacheStore {
  private readonly cache: MemoryCache;

  constructor(options?: CacheOptions) {
    this.cache = new MemoryCache(options);
  }

  get(key: string): unknown {
    return this.cache.get(key);
  }

  set(key: string, value: unknown, ttl?: number): void {
    this.cache.set(key, value, ttl);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/** 每个 store 的并发 single-flight 表（按 store 身份隔离 key），用 WeakMap 防泄漏 */
const inflightByStore = new WeakMap<CacheStore, Map<string, Promise<unknown>>>();

/**
 * 透明缓存读写：命中直接返回，未命中执行 fetcher 并写入。
 * 对同步 / 异步 store 都适用（内部统一 await）。
 *
 * - **并发去重(single-flight)**：同一 store + key 上的 N 个并发未命中只触发一次
 *   fetcher，其余共享同一 Promise，避免缓存击穿 / 请求风暴。
 * - **undefined 语义**：fetcher 返回 `undefined` 视为「无值」，不写入（写了下次
 *   `get` 仍判未命中，徒增存储）；需缓存空结果请用 null / 哨兵值。
 */
export async function cacheThrough<T>(
  store: CacheStore,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = await store.get(key);
  if (cached !== undefined) {
    return cached as T;
  }

  let inflight = inflightByStore.get(store);
  if (!inflight) {
    inflight = new Map();
    inflightByStore.set(store, inflight);
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    const value = await fetcher();
    if (value !== undefined) {
      await store.set(key, value, ttl);
    }
    return value;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise as Promise<T>;
}
