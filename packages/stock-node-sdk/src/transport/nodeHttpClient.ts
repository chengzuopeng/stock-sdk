import { AsyncLocalStorage } from 'node:async_hooks';
import {
  DEFAULT_TIMEOUT,
  inferProviderFromUrl,
  RequestClient,
  type FetchImpl,
  type GetOptions,
  type RequestClientOptions,
} from '@stock-sdk/core/core';
import { combineSignals } from '@stock-sdk/core/core/abort';
import { CookieJar } from './cookieJar';
import { ProxyPool, type ProxyConfig } from './proxyPool';
import { SessionManager, type SessionInitializer } from './sessionManager';

const DEFAULT_NODE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DEFAULT_SEC_UA = 'stock-node-sdk research@linkdiary.cn';

/**
 * Node 端按域名自动附加的默认防拦截 Headers（Referer / Origin / User-Agent）。
 * 浏览器端无法自由设置 Referer/Origin，而 Node 端可以安全配置，从而解锁大量上游源。
 */
const DEFAULT_HOST_HEADERS: ReadonlyArray<{
  match: (host: string) => boolean;
  headers: Record<string, string>;
}> = [
  {
    match: (h) => h.endsWith('sinajs.cn') || h.endsWith('sina.com.cn') || h.endsWith('sina.cn'),
    headers: {
      Referer: 'https://finance.sina.com.cn/',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('eastmoney.com'),
    headers: {
      Referer: 'https://quote.eastmoney.com/',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('cninfo.com.cn'),
    headers: {
      Referer: 'http://www.cninfo.com.cn/new/commonUrl/pageOfSearch?url=disclosure/list/search',
      Origin: 'http://www.cninfo.com.cn',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('hkexnews.hk'),
    headers: {
      Referer: 'https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=zh',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('nasdaq.com'),
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://www.nasdaq.com',
      Referer: 'https://www.nasdaq.com/',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('cnbc.com'),
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.cnbc.com/',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('sec.gov'),
    headers: {
      Accept: 'application/json',
      'User-Agent': DEFAULT_SEC_UA,
    },
  },
  {
    match: (h) => h.endsWith('xueqiu.com'),
    headers: {
      Referer: 'https://xueqiu.com/',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
  {
    match: (h) => h.endsWith('gtimg.cn'),
    headers: {
      Referer: 'https://gu.qq.com/',
      'User-Agent': DEFAULT_NODE_UA,
    },
  },
];

function getDefaultHostHeaders(url: string, secUserAgent: string): Record<string, string> {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('sec.gov')) {
      return {
        Accept: 'application/json',
        'User-Agent': secUserAgent,
      };
    }
    for (const entry of DEFAULT_HOST_HEADERS) {
      if (entry.match(host)) {
        return entry.headers;
      }
    }
  } catch {
    // 忽略非法 URL
  }
  return { 'User-Agent': DEFAULT_NODE_UA };
}

function extractSetCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(headers);
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * NodeHttpClient 构造选项（继承并完全兼容 `RequestClientOptions`）。
 */
export interface NodeHttpClientOptions extends RequestClientOptions {
  /** 代理配置（单代理 URL、代理池数组或动态解析函数） */
  proxy?: ProxyConfig;
  /** 是否读取环境变量 `HTTP_PROXY` / `HTTPS_PROXY`，默认 false */
  useEnvProxy?: boolean;
  /** 代理失败冷却时间（毫秒），默认 30_000 */
  proxyCooldownMs?: number;
  /** 自定义 CookieJar 实例（缺省自动创建实例级 CookieJar） */
  cookieJar?: CookieJar;
  /** 注册自定义站点会话预热器 */
  sessions?: readonly SessionInitializer[];
  /** SEC EDGAR 官方接口合规 User-Agent（含应用名与联系邮箱） */
  secUserAgent?: string;
}

/**
 * Node.js 专属增强型 HTTP 客户端。
 *
 * 在完全复用 `@stock-sdk/core` `RequestClient`（限流、熔断、指数退避重试、AbortSignal、
 * 生命周期钩子、HostFallback）的基础上，叠加：
 * - 自动按源注入 `Referer` / `Origin` / `User-Agent`；
 * - 内存 `CookieJar` 与 `SessionManager` 会话预热及 401/403 自动刷新重放；
 * - 基于 `undici.ProxyAgent` 的代理池调度与失败节点冷却；
 * - 便捷的 GBK / GB18030 文本解码请求方法。
 */
export class NodeHttpClient extends RequestClient {
  readonly cookieJar: CookieJar;
  readonly sessionManager: SessionManager;
  readonly proxyPool: ProxyPool;
  readonly secUserAgent: string;
  private readonly rawFetch: FetchImpl;
  private readonly routeSignal: AsyncLocalStorage<AbortSignal>;

  constructor(options: NodeHttpClientOptions = {}) {
    const secUserAgent = options.secUserAgent ?? DEFAULT_SEC_UA;
    const cookieJar = options.cookieJar ?? new CookieJar();
    const sessionManager = new SessionManager(cookieJar);
    const proxyPool = new ProxyPool({
      proxy: options.proxy,
      useEnvProxy: options.useEnvProxy,
      cooldownMs: options.proxyCooldownMs,
    });
    const baseFetch: FetchImpl = options.fetchImpl ?? globalThis.fetch;

    for (const session of options.sessions ?? []) {
      sessionManager.register(session);
    }

    const defaultTimeoutMs = options.timeout ?? DEFAULT_TIMEOUT;

    // 供会话预热器使用的安全底层 fetch：自带默认超时与代理池调度，且不递归触发 ensureSession
    const sessionFetch: FetchImpl = async (input, init) => {
      const targetUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const provider = inferProviderFromUrl(targetUrl);
      const headers = new Headers(getDefaultHostHeaders(targetUrl, secUserAgent));
      if (init?.headers) {
        new Headers(init.headers).forEach((v, k) => headers.set(k, v));
      }
      const proxyChoice = proxyPool.acquire({ provider, url: targetUrl });
      const timeoutCtrl = new AbortController();
      const timer = setTimeout(() => timeoutCtrl.abort(), defaultTimeoutMs);
      const nextInit: Record<string, unknown> = {
        ...(init as Record<string, unknown> | undefined),
        headers,
        signal: init?.signal ?? timeoutCtrl.signal,
      };
      if (proxyChoice) {
        nextInit.dispatcher = proxyChoice.dispatcher;
      }
      try {
        const resp = await baseFetch(input, nextInit as RequestInit);
        const setCookies = extractSetCookies(resp.headers);
        if (setCookies.length > 0) {
          cookieJar.setFromResponse(targetUrl, setCookies);
        }
        return resp;
      } catch (err) {
        if (proxyChoice?.url) {
          proxyPool.markFailure(proxyChoice.url);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    const enhancedFetch: FetchImpl = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const provider = inferProviderFromUrl(url);

      init?.signal?.throwIfAborted();
      await sessionManager.ensureSession(url, false, sessionFetch);
      init?.signal?.throwIfAborted();

      const buildInit = (): { reqInit: RequestInit; proxyUrl?: string } => {
        const headers = new Headers(getDefaultHostHeaders(url, secUserAgent));
        if (init?.headers) {
          const incoming = new Headers(init.headers);
          incoming.forEach((value, key) => {
            headers.set(key, value);
          });
        }
        // SEC EDGAR 强制校验应用标识 + 邮箱格式 User-Agent：若全局开启了浏览器 UA 轮换，
        // 避免通用 Mozilla/... 浏览器 UA 覆盖合规 secUserAgent 导致 403 封禁。
        if (provider === 'sec') {
          const currentUa = headers.get('user-agent') ?? '';
          if (currentUa.startsWith('Mozilla/5.0 ')) {
            headers.set('user-agent', secUserAgent);
          }
        }
        const cookieHeader = cookieJar.getCookieHeader(url);
        if (cookieHeader && !headers.has('cookie')) {
          headers.set('cookie', cookieHeader);
        }

        const proxyChoice = proxyPool.acquire({ provider, url });
        const nextInit: Record<string, unknown> = {
          ...(init as Record<string, unknown> | undefined),
          headers,
        };
        if (proxyChoice) {
          nextInit.dispatcher = proxyChoice.dispatcher;
        }
        return { reqInit: nextInit as RequestInit, proxyUrl: proxyChoice?.url };
      };

      const first = buildInit();
      let activeProxyUrl = first.proxyUrl;

      try {
        const resp = await baseFetch(input, first.reqInit);
        const setCookies = extractSetCookies(resp.headers);
        if (setCookies.length > 0) {
          cookieJar.setFromResponse(url, setCookies);
        }

        // 若命中 401/403 且该站点配置了自动会话预热器，自动强刷会话重放一次
        if (resp.status === 401 || resp.status === 403) {
          init?.signal?.throwIfAborted();
          const before = cookieJar.getCookieHeader(url);
          await sessionManager.ensureSession(url, true, sessionFetch);
          init?.signal?.throwIfAborted();
          const after = cookieJar.getCookieHeader(url);
          if (after && after !== before) {
            const retry = buildInit();
            activeProxyUrl = retry.proxyUrl;
            const retryResp = await baseFetch(input, retry.reqInit);
            const retryCookies = extractSetCookies(retryResp.headers);
            if (retryCookies.length > 0) {
              cookieJar.setFromResponse(url, retryCookies);
            }
            return retryResp;
          }
        }

        return resp;
      } catch (error) {
        if (activeProxyUrl && !init?.signal?.aborted) {
          proxyPool.markFailure(activeProxyUrl);
        }
        throw error;
      }
    };

    super({
      ...options,
      fetchImpl: enhancedFetch,
    });

    this.cookieJar = cookieJar;
    this.sessionManager = sessionManager;
    this.proxyPool = proxyPool;
    this.secUserAgent = secUserAgent;
    this.rawFetch = sessionFetch;
    this.routeSignal = new AsyncLocalStorage<AbortSignal>();
  }

  /** 将路由取消信号传给本次适配器发起的所有请求。 */
  withRouteSignal<T>(signal: AbortSignal | undefined, fetcher: () => Promise<T>): Promise<T> {
    return signal ? this.routeSignal.run(signal, fetcher) : fetcher();
  }

  override async get<T = string>(url: string, options: GetOptions = {}): Promise<T> {
    const routeSignal = this.routeSignal.getStore();
    if (!routeSignal || routeSignal === options.signal) return super.get<T>(url, options);
    const { signal, cleanup } = combineSignals([routeSignal, options.signal]);
    try {
      return await super.get<T>(url, { ...options, signal });
    } finally {
      cleanup();
    }
  }

  /**
   * 注册站点会话预热器（如预热主站拿到会话 Cookie）。
   */
  registerSession(initializer: SessionInitializer): void {
    this.sessionManager.register(initializer);
  }

  /**
   * 暴露原始底层 fetch（供会话预热器本身使用，避免递归触发 ensureSession）。
   */
  getRawFetch(): FetchImpl {
    return this.rawFetch;
  }

  /**
   * 发送 GET 请求并按 GB18030/GBK 解码为 UTF-8 字符串（适用于新浪 `hq.sinajs.cn` 等 GBK 源）。
   */
  async getGBK(
    url: string,
    options: Omit<GetOptions, 'responseType'> = {}
  ): Promise<string> {
    const buffer = await this.get<ArrayBuffer>(url, {
      ...options,
      responseType: 'arraybuffer',
    });
    return new TextDecoder('gb18030').decode(buffer);
  }

  /**
   * 关闭底层代理连接池（进程优雅退出时可选调用）。
   */
  async close(): Promise<void> {
    await this.proxyPool.close();
  }
}
