/**
 * 轻量级内存 CookieJar（Node 端会话托管）。
 *
 * 支持按域/路径匹配、`Expires` / `Max-Age` 过期淘汰，以及 `Set-Cookie` 响应头自动解析。
 */
export interface StoredCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiresAt?: number;
  hostOnly: boolean;
}

export class CookieJar {
  private readonly store = new Map<string, StoredCookie>();

  private keyOf(domain: string, path: string, name: string): string {
    return `${domain.toLowerCase()}|${path}|${name}`;
  }

  /**
   * 从目标 URL 和 `Set-Cookie` 头列表中存入 Cookie。
   */
  setFromResponse(url: string, setCookieHeaders: readonly string[]): void {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return;
    }
    const defaultHost = parsedUrl.hostname.toLowerCase();

    for (const raw of setCookieHeaders) {
      const parts = raw
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) continue;

      const eqIdx = parts[0].indexOf('=');
      if (eqIdx <= 0) continue;

      const name = parts[0].slice(0, eqIdx).trim();
      const value = parts[0].slice(eqIdx + 1).trim();
      let domain = defaultHost;
      let hostOnly = true;
      let cookiePath = '/';
      let expiresAt: number | undefined;

      for (let i = 1; i < parts.length; i++) {
        const attr = parts[i];
        const idx = attr.indexOf('=');
        const attrName = (idx >= 0 ? attr.slice(0, idx) : attr).trim().toLowerCase();
        const attrVal = idx >= 0 ? attr.slice(idx + 1).trim() : '';

        if (attrName === 'domain' && attrVal) {
          domain = attrVal.replace(/^\./, '').toLowerCase();
          hostOnly = false;
        } else if (attrName === 'path' && attrVal) {
          cookiePath = attrVal;
        } else if (attrName === 'max-age') {
          const sec = Number(attrVal);
          if (Number.isFinite(sec)) {
            expiresAt = Date.now() + sec * 1000;
          }
        } else if (attrName === 'expires' && expiresAt === undefined) {
          const ts = Date.parse(attrVal);
          if (Number.isFinite(ts)) {
            expiresAt = ts;
          }
        }
      }

      const key = this.keyOf(domain, cookiePath, name);
      if (expiresAt !== undefined && expiresAt <= Date.now()) {
        this.store.delete(key);
      } else {
        this.store.set(key, { name, value, domain, path: cookiePath, expiresAt, hostOnly });
      }
    }
  }

  /**
   * 手动写入单条 Cookie（适用于预置会话令牌或测试注入）。
   */
  setCookie(
    url: string,
    name: string,
    value: string,
    options?: number | { maxAgeSeconds?: number; domain?: string; path?: string }
  ): void {
    const opts = typeof options === 'number' ? { maxAgeSeconds: options } : (options ?? {});
    const attrs: string[] = [`${name}=${value}`];
    if (opts.domain) attrs.push(`Domain=${opts.domain}`);
    if (opts.path) attrs.push(`Path=${opts.path}`);
    if (opts.maxAgeSeconds !== undefined) attrs.push(`Max-Age=${opts.maxAgeSeconds}`);
    this.setFromResponse(url, [attrs.join('; ')]);
  }

  /**
   * 按目标 URL 组装可发送的 `Cookie` 请求头字符串；无匹配时返回 `undefined`。
   */
  getCookieHeader(url: string, now = Date.now()): string | undefined {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return undefined;
    }
    const host = parsedUrl.hostname.toLowerCase();
    const reqPath = parsedUrl.pathname || '/';
    const matched = new Map<string, string>();

    for (const [key, cookie] of this.store.entries()) {
      if (cookie.expiresAt !== undefined && cookie.expiresAt <= now) {
        this.store.delete(key);
        continue;
      }
      const domainOk = cookie.hostOnly
        ? host === cookie.domain
        : host === cookie.domain || host.endsWith(`.${cookie.domain}`);
      if (!domainOk) continue;

      const pathOk =
        reqPath === cookie.path ||
        reqPath.startsWith(cookie.path.endsWith('/') ? cookie.path : `${cookie.path}/`);
      if (!pathOk) continue;

      matched.set(cookie.name, cookie.value);
    }

    if (matched.size === 0) return undefined;
    return [...matched.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  /**
   * 清理指定域名或全部 Cookie。
   */
  clear(domain?: string): void {
    if (!domain) {
      this.store.clear();
      return;
    }
    const norm = domain.replace(/^\./, '').toLowerCase();
    for (const [key, cookie] of this.store.entries()) {
      if (cookie.domain === norm || cookie.domain.endsWith(`.${norm}`)) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}
