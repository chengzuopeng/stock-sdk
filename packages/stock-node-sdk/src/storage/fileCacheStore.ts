import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CacheStore } from '@stock-sdk/core/cache';

interface CacheEnvelope {
  expiresAt: number;
  value: unknown;
}

async function readEnvelope(path: string): Promise<CacheEnvelope | undefined> {
  try {
    const data: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (
      data !== null && typeof data === 'object' && 'value' in data &&
      'expiresAt' in data && typeof data.expiresAt === 'number' &&
      Number.isFinite(data.expiresAt) && data.expiresAt >= 0
    ) {
      return { expiresAt: data.expiresAt, value: data.value };
    }
  } catch {
    // 无法读取或识别的文件不属于可清理的缓存条目。
  }
  return undefined;
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
 * - 读取时校验 TTL，清理只处理分片内可识别的缓存条目。
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
    const entry = await readEnvelope(this.filePath(key));
    return entry && (entry.expiresAt === 0 || entry.expiresAt > Date.now())
      ? entry.value
      : undefined;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const effectiveTtl = ttl ?? this.defaultTTL;
    const expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl : 0;
    const target = this.filePath(key);
    const parent = dirname(target);
    await mkdir(parent, { recursive: true });

    const tmp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    const payload: CacheEnvelope = { expiresAt, value };
    try {
      await writeFile(tmp, JSON.stringify(payload), 'utf8');
      await rename(tmp, target);
    } catch (error) {
      await unlink(tmp).catch(() => {});
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await unlink(this.filePath(key)).catch(() => {});
  }

  async clear(): Promise<void> {
    await this.removeEntries(() => true);
  }

  /**
   * 删除已过期的缓存条目，返回移除的文件数。
   */
  async cleanup(now = Date.now()): Promise<number> {
    return this.removeEntries(({ expiresAt }) => expiresAt > 0 && now >= expiresAt);
  }

  private async removeEntries(shouldRemove: (entry: CacheEnvelope) => boolean): Promise<number> {
    let cleaned = 0;
    const shards = await readdir(this.dir, { withFileTypes: true }).catch(() => []);
    for (const shard of shards) {
      if (!shard.isDirectory() || !/^[a-f0-9]{2}$/.test(shard.name)) continue;
      const shardPath = join(this.dir, shard.name);
      const files = await readdir(shardPath, { withFileTypes: true }).catch(() => []);
      for (const file of files) {
        if (!file.isFile() || !file.name.startsWith(shard.name) || !/^[a-f0-9]{64}\.json$/.test(file.name)) continue;
        const path = join(shardPath, file.name);
        const entry = await readEnvelope(path);
        if (entry && shouldRemove(entry) && await unlink(path).then(() => true, () => false)) {
          cleaned++;
        }
      }
    }
    return cleaned;
  }
}
