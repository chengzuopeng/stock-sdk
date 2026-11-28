import { ProxyAgent } from 'undici';

export interface ProxyResolverContext {
  provider: string;
  url: string;
}

export type ProxyConfig =
  | string
  | readonly string[]
  | ((ctx: ProxyResolverContext) => string | undefined);

interface ProxyNodeState {
  url: string;
  agent: ProxyAgent;
  cooldownUntil: number;
}

const DEFAULT_PROXY_COOLDOWN_MS = 30_000;

/**
 * Node 端代理池调度器（基于 `undici.ProxyAgent`）。
 *
 * 支持：
 * - 单个代理 URL（`http://...` / `https://...`）
 * - 代理池数组（轮换调度 + 失败节点冷却）
 * - 动态解析函数（按 provider / url 灵活分流）
 * - 可选读取环境变量 `HTTPS_PROXY` / `HTTP_PROXY`
 */
export class ProxyPool {
  private readonly nodes: ProxyNodeState[] = [];
  private readonly dynamicAgents = new Map<string, ProxyNodeState>();
  private readonly resolver?: (ctx: ProxyResolverContext) => string | undefined;
  private readonly useEnvProxy: boolean;
  private readonly cooldownMs: number;
  private cursor = 0;

  constructor(options: {
    proxy?: ProxyConfig;
    useEnvProxy?: boolean;
    cooldownMs?: number;
  } = {}) {
    this.useEnvProxy = options.useEnvProxy ?? false;
    this.cooldownMs = Math.max(0, options.cooldownMs ?? DEFAULT_PROXY_COOLDOWN_MS);

    if (typeof options.proxy === 'string' && options.proxy.trim()) {
      this.nodes.push(this.createNode(options.proxy.trim()));
    } else if (Array.isArray(options.proxy)) {
      for (const raw of options.proxy) {
        if (typeof raw === 'string' && raw.trim()) {
          this.nodes.push(this.createNode(raw.trim()));
        }
      }
    } else if (typeof options.proxy === 'function') {
      this.resolver = options.proxy;
    }
  }

  private createNode(url: string): ProxyNodeState {
    return {
      url,
      agent: new ProxyAgent(url),
      cooldownUntil: 0,
    };
  }

  private getOrCreateDynamicNode(proxyUrl: string): ProxyNodeState {
    let node = this.dynamicAgents.get(proxyUrl);
    if (!node) {
      node = this.createNode(proxyUrl);
      this.dynamicAgents.set(proxyUrl, node);
    }
    return node;
  }

  /**
   * 查询指定代理 URL 当前是否处于冷却期。
   */
  isCooling(proxyUrl: string, now = Date.now()): boolean {
    const node = this.nodes.find((n) => n.url === proxyUrl) ?? this.dynamicAgents.get(proxyUrl);
    return node !== undefined && node.cooldownUntil > now;
  }

  /**
   * 为单次请求选择一个可用代理及其 `ProxyAgent` dispatcher；无代理时返回 `undefined`。
   */
  acquire(ctx: ProxyResolverContext): { url: string; dispatcher: ProxyAgent } | undefined {
    if (this.resolver) {
      const resolved = this.resolver(ctx);
      if (resolved) {
        const node = this.getOrCreateDynamicNode(resolved);
        return { url: node.url, dispatcher: node.agent };
      }
      return undefined;
    }

    if (this.nodes.length > 0) {
      const now = Date.now();
      const total = this.nodes.length;
      for (let i = 0; i < total; i++) {
        const idx = (this.cursor + i) % total;
        const node = this.nodes[idx];
        if (node.cooldownUntil <= now) {
          this.cursor = (idx + 1) % total;
          return { url: node.url, dispatcher: node.agent };
        }
      }
      // 全部代理均冷却时回退轮询兜底
      const fallback = this.nodes[this.cursor % total];
      this.cursor = (this.cursor + 1) % total;
      return { url: fallback.url, dispatcher: fallback.agent };
    }

    if (this.useEnvProxy) {
      const isHttps = ctx.url.startsWith('https://');
      const envProxy = isHttps
        ? process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
        : process.env.HTTP_PROXY || process.env.http_proxy;
      if (envProxy) {
        const node = this.getOrCreateDynamicNode(envProxy);
        return { url: node.url, dispatcher: node.agent };
      }
    }

    return undefined;
  }

  /**
   * 标记某代理节点失败并进入冷却期。
   */
  markFailure(proxyUrl: string): void {
    const node = this.nodes.find((n) => n.url === proxyUrl) ?? this.dynamicAgents.get(proxyUrl);
    if (node && this.cooldownMs > 0) {
      node.cooldownUntil = Date.now() + this.cooldownMs;
    }
  }

  /**
   * 释放所有底层 ProxyAgent 连接池。
   */
  async close(): Promise<void> {
    const closers: Promise<void>[] = [];
    for (const node of this.nodes) {
      closers.push(node.agent.close());
    }
    for (const node of this.dynamicAgents.values()) {
      closers.push(node.agent.close());
    }
    this.dynamicAgents.clear();
    await Promise.allSettled(closers);
  }
}
