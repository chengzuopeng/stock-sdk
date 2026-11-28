import type { FetchImpl } from '@stock-sdk/core/core';
import { CookieJar } from './cookieJar';

export interface SessionInitializer {
  /** 需要预热会话的域名（如 `'xueqiu.com'`） */
  domain: string;
  /** 执行预热的回调函数（通过注入的带超时/代理 fetchImpl 访问主站写入 CookieJar） */
  init: (jar: CookieJar, fetchImpl: FetchImpl) => Promise<void>;
  /** 会话有效期（毫秒），默认 25 分钟 */
  ttlMs?: number;
}

interface SessionRecord {
  initializer: SessionInitializer;
  initializedAt: number;
  inflight?: Promise<void>;
}

const DEFAULT_SESSION_TTL_MS = 25 * 60_000;

/**
 * Node 端站点会话管理器（Cookie 预热 + 并发 single-flight + 失效刷新）。
 */
export class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(private readonly jar: CookieJar) {}

  /**
   * 注册一个站点的自动会话预热器。
   */
  register(initializer: SessionInitializer): void {
    const key = initializer.domain.replace(/^\./, '').toLowerCase();
    this.sessions.set(key, {
      initializer,
      initializedAt: 0,
    });
  }

  private findRecord(url: string): SessionRecord | undefined {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return undefined;
    }
    for (const [domain, record] of this.sessions.entries()) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * 若目标 URL 所属域注册了预热器且尚未初始化（或已过期），自动执行预热（并发去重）。
   */
  async ensureSession(
    url: string,
    forceRefresh = false,
    fetchImpl: FetchImpl = globalThis.fetch
  ): Promise<void> {
    const record = this.findRecord(url);
    if (!record) return;

    const ttl = record.initializer.ttlMs ?? DEFAULT_SESSION_TTL_MS;
    const isFresh =
      !forceRefresh &&
      record.initializedAt > 0 &&
      Date.now() - record.initializedAt < ttl;
    if (isFresh) return;

    if (record.inflight) {
      await record.inflight;
      return;
    }

    const job = (async () => {
      if (forceRefresh) {
        this.jar.clear(record.initializer.domain);
      }
      await record.initializer.init(this.jar, fetchImpl);
      record.initializedAt = Date.now();
    })().finally(() => {
      record.inflight = undefined;
    });

    record.inflight = job;
    await job;
  }

  /**
   * 清空已记录的会话状态。
   */
  reset(): void {
    for (const record of this.sessions.values()) {
      record.initializedAt = 0;
    }
  }
}
