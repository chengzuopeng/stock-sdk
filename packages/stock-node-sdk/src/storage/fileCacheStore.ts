import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CacheStore } from '@stock-sdk/core/cache';

interface CacheEnvelope {
  expiresAt: number;
  value: unknown;
}

export interface FileCacheStoreOptions {
  /** 磁盘缓存目录路径 */
  dir: string;
  /** 默认过期时间（毫秒），默认 1 小时；0 表示不过期 */
  defaultTTL?: number;
}

/**
 * 基于本地文件系统的持久化 `CacheStore` 实现（零外部依赖）。
 *
 * - SHA-256 哈希分片目录，避免单目录文件过多；
 * - 写入采用临时文件 + `rename` 原子替换，防止并发读到半截 JSON；
 * - 读取时校验 TTL，过期自动清理并返回 `undefined`。
 */
export class FileCacheStore implements CacheStore {
  private readonly dir: string;
  private readonly defaultTTL: number;

  constructor(options: FileCacheStoreOptions) {
    this.dir = options.dir;
    this.defaultTTL = options.defaultTTL ?? 3_600_000;
  }

  private filePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    return join(this.dir, hash.slice(0, 2), `${hash}.json`);
  }

  async get(key: string): Promise<unknown> {
    const target = this.filePath(key);
    try {
      const raw = await readFile(target, 'utf8');
      const parsed = JSON.parse(raw) as CacheEnvelope;
      if (parsed.expiresAt > 0 && Date.now() > parsed.expiresAt) {
        await unlink(target).catch(() => {});
        return undefined;
      }
      return parsed.value;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const effectiveTtl = ttl ?? this.defaultTTL;
    const expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl : 0;
    const target = this.filePath(key);
    const parent = dirname(target);
    await mkdir(parent, { recursive: true });

    const tmp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    const payload: CacheEnvelope = { expiresAt, value };
    await writeFile(tmp, JSON.stringify(payload), 'utf8');
    await rename(tmp, target);
  }

  async delete(key: string): Promise<void> {
    await unlink(this.filePath(key)).catch(() => {});
  }

  async clear(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true }).catch(() => {});
  }

  /**
   * 扫描并清理磁盘缓存目录中的所有已过期或损坏条目，返回清理的文件数。
   */
  async cleanup(now = Date.now()): Promise<number> {
    let cleaned = 0;
    let shards: string[];
    try {
      shards = await readdir(this.dir);
    } catch {
      return 0;
    }
    for (const shard of shards) {
      const shardPath = join(this.dir, shard);
      let files: string[];
      try {
        files = await readdir(shardPath);
      } catch {
        continue;
      }
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const full = join(shardPath, file);
        try {
          const raw = await readFile(full, 'utf8');
          const parsed = JSON.parse(raw) as CacheEnvelope;
          if (parsed.expiresAt > 0 && now > parsed.expiresAt) {
            await unlink(full);
            cleaned++;
          }
        } catch {
          await unlink(full).catch(() => {});
          cleaned++;
        }
      }
    }
    return cleaned;
  }
}
