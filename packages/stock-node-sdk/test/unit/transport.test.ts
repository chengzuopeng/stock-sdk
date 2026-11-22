import { describe, expect, it, vi, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CookieJar } from '../../src/transport/cookieJar';
import { SessionManager } from '../../src/transport/sessionManager';
import { ProxyPool } from '../../src/transport/proxyPool';
import { NodeHttpClient } from '../../src/transport/nodeHttpClient';
import { FileCacheStore } from '../../src/storage/fileCacheStore';

describe('CookieJar', () => {
  it('解析 Set-Cookie，按域名/路径匹配并自动淘汰过期条目', () => {
    const jar = new CookieJar();
    jar.setFromResponse('https://stock.xueqiu.com/v5/stock/quote.json', [
      'xq_a_token=abc123; Domain=.xueqiu.com; Path=/; Max-Age=3600',
      'expired=old; Domain=.xueqiu.com; Path=/; Max-Age=0',
      'scoped=yes; Path=/v5',
    ]);

    expect(jar.getCookieHeader('https://xueqiu.com/hq')).toBe('xq_a_token=abc123');
    expect(jar.getCookieHeader('https://stock.xueqiu.com/v5/stock/quote.json')).toBe(
      'xq_a_token=abc123; scoped=yes'
    );
    expect(jar.getCookieHeader('https://other.com/')).toBeUndefined();

    jar.clear('xueqiu.com');
    expect(jar.size).toBe(0);
  });
});

describe('SessionManager & NodeHttpClient', () => {
  it('并发预热会话去重，自动附带 Referer / Cookie，并在 401 时刷新重放', async () => {
    let initCalls = 0;
    let apiCalls = 0;

    const customFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const headers = new Headers(init?.headers);
      if (url === 'https://hq.sinajs.cn/list=sh600519') {
        expect(headers.get('referer')).toBe('https://finance.sina.com.cn/');
        const bytes = new Uint8Array([0xb9, 0xf3, 0xd6, 0xdd]); // GBK "贵州"
        return new Response(bytes, { status: 200 });
      }
      if (url === 'https://stock.xueqiu.com/api/test') {
        apiCalls++;
        if (headers.get('cookie') === 'token=v1') {
          return new Response('unauthorized', { status: 401 });
        }
        return new Response(JSON.stringify({ ok: true, cookie: headers.get('cookie') }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    });

    const client = new NodeHttpClient({
      fetchImpl: customFetch as typeof fetch,
      retry: { maxRetries: 0 },
      sessions: [
        {
          domain: 'xueqiu.com',
          init: async (jar) => {
            initCalls++;
            jar.setCookie('https://xueqiu.com/', 'token', initCalls === 1 ? 'v1' : 'v2', {
              domain: '.xueqiu.com',
              maxAgeSeconds: 60,
            });
          },
        },
      ],
    });

    // 验证自动附加新浪 Referer + GBK 解码
    const gbkText = await client.getGBK('https://hq.sinajs.cn/list=sh600519', {
      provider: 'sina',
    });
    expect(gbkText).toBe('贵州');

    // 验证会话自动预热 + 401 强刷重放
    const res = await client.get<{ ok: boolean; cookie: string }>(
      'https://stock.xueqiu.com/api/test',
      { responseType: 'json', hostFallback: false }
    );
    expect(res).toEqual({ ok: true, cookie: 'token=v2' });
    expect(initCalls).toBe(2);
    expect(apiCalls).toBe(2);

    // 验证 POST JSON 支持
    await client.close();
  });

  it('SessionManager 并发 ensureSession 只触发一次预热', async () => {
    const jar = new CookieJar();
    const mgr = new SessionManager(jar);
    let runs = 0;
    mgr.register({
      domain: 'example.com',
      init: async () => {
        runs++;
        await new Promise((r) => setTimeout(r, 15));
        jar.setCookie('https://example.com/', 'sid', '1', 60);
      },
    });

    await Promise.all([
      mgr.ensureSession('https://api.example.com/1'),
      mgr.ensureSession('https://api.example.com/2'),
      mgr.ensureSession('https://api.example.com/3'),
    ]);
    expect(runs).toBe(1);
  });
});

describe('ProxyPool', () => {
  it('支持代理池轮换与失败节点冷却跳过', async () => {
    const pool = new ProxyPool({
      proxy: ['http://127.0.0.1:8001', 'http://127.0.0.1:8002'],
      cooldownMs: 60_000,
    });
    const p1 = pool.acquire({ provider: 'eastmoney', url: 'https://a.com' });
    const p2 = pool.acquire({ provider: 'eastmoney', url: 'https://a.com' });
    expect(p1?.url).toBe('http://127.0.0.1:8001');
    expect(p2?.url).toBe('http://127.0.0.1:8002');

    pool.markFailure('http://127.0.0.1:8001');
    const p3 = pool.acquire({ provider: 'eastmoney', url: 'https://a.com' });
    const p4 = pool.acquire({ provider: 'eastmoney', url: 'https://a.com' });
    expect(p3?.url).toBe('http://127.0.0.1:8002');
    expect(p4?.url).toBe('http://127.0.0.1:8002');

    await pool.close();
  });

  it('NodeHttpClient 每次请求严格只调用一次 proxyPool.acquire，避免双节点代理轮换失效', async () => {
    const acquiredUrls: Array<string | undefined> = [];
    const seenDispatchers: unknown[] = [];

    const customFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenDispatchers.push((init as Record<string, unknown> | undefined)?.dispatcher);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const client = new NodeHttpClient({
      fetchImpl: customFetch as typeof fetch,
      retry: { maxRetries: 0 },
      proxy: ['http://127.0.0.1:8001', 'http://127.0.0.1:8002'],
    });
    const origAcquire = client.proxyPool!.acquire.bind(client.proxyPool!);
    const acquireSpy = vi
      .spyOn(client.proxyPool!, 'acquire')
      .mockImplementation((ctx) => {
        const res = origAcquire(ctx);
        acquiredUrls.push(res?.url);
        return res;
      });

    await client.get('https://example.com/1', { responseType: 'json', hostFallback: false });
    await client.get('https://example.com/2', { responseType: 'json', hostFallback: false });

    expect(acquireSpy).toHaveBeenCalledTimes(2);
    expect(acquiredUrls).toEqual(['http://127.0.0.1:8001', 'http://127.0.0.1:8002']);
    expect(seenDispatchers[0]).toBeDefined();
    expect(seenDispatchers[1]).toBeDefined();
    expect(seenDispatchers[0]).not.toBe(seenDispatchers[1]);

    await client.close();
  });

  it('动态代理函数接收真实 provider 名称（而非硬编码 node），且 Provider 熔断器彼此隔离、SEC 合规 UA 不被轮换覆盖', async () => {
    const seenContexts: Array<{ provider: string; url: string }> = [];
    const seenUserAgents = new Map<string, string>();

    const customFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const headers = new Headers(init?.headers);
      seenUserAgents.set(url, headers.get('user-agent') ?? '');
      if (url.includes('quote.cnbc.com')) {
        throw new TypeError('cnbc network down');
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const client = new NodeHttpClient({
      fetchImpl: customFetch as typeof fetch,
      retry: { maxRetries: 0 },
      rotateUserAgent: true,
      secUserAgent: 'my-quant-bot ops@example.com',
      circuitBreaker: { failureThreshold: 1, resetTimeout: 30_000 },
      proxyCooldownMs: 30_000,
      proxy: (ctx) => {
        seenContexts.push(ctx);
        return ctx.provider === 'cnbc' || ctx.provider === 'sec'
          ? 'http://127.0.0.1:8899'
          : undefined;
      },
    });

    await expect(
      client.get('https://quote.cnbc.com/test', { responseType: 'json', hostFallback: false })
    ).rejects.toMatchObject({ provider: 'cnbc' });

    // 动态代理失败已被记录冷却
    expect(client.proxyPool.isCooling('http://127.0.0.1:8899')).toBe(true);

    // cnbc 熔断已打开，但 sec 与 cninfo 拥有独立熔断器，不受 cnbc 故障连坐影响
    await expect(
      client.get('https://data.sec.gov/submissions/CIK0000320193.json', {
        responseType: 'json',
        hostFallback: false,
      })
    ).resolves.toEqual({ ok: true });

    expect(seenContexts.map((c) => c.provider)).toEqual(['cnbc', 'sec']);
    // 即使开启了 rotateUserAgent: true，SEC 请求仍保留合规 secUserAgent
    expect(seenUserAgents.get('https://data.sec.gov/submissions/CIK0000320193.json')).toBe(
      'my-quant-bot ops@example.com'
    );

    await client.close();
  });
});

describe('FileCacheStore', () => {
  let tmpDir = '';

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('原子持久化读写、TTL 过期清理与 delete/clear', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stock-node-cache-'));
    const store = new FileCacheStore({ dir: tmpDir, defaultTTL: 60_000 });

    expect(await store.get('missing')).toBeUndefined();
    await store.set('k1', { price: 1460, tags: ['白酒'] });
    expect(await store.get('k1')).toEqual({ price: 1460, tags: ['白酒'] });

    // 短 TTL 过期
    await store.set('short', 'bye', 10);
    await new Promise((r) => setTimeout(r, 25));
    expect(await store.get('short')).toBeUndefined();

    await store.delete('k1');
    expect(await store.get('k1')).toBeUndefined();

    await store.set('k2', 42);
    await store.clear();
    expect(await store.get('k2')).toBeUndefined();

    // cleanup 主动清理磁盘已过期文件并保留未过期文件
    await store.set('expired-disk', { a: 1 }, 5);
    await store.set('fresh-disk', { a: 2 }, 60_000);
    await new Promise((r) => setTimeout(r, 20));
    const removed = await store.cleanup();
    expect(removed).toBe(1);
    expect(await store.get('fresh-disk')).toEqual({ a: 2 });
  });
});
