/**
 * JS 变量声明文件双端解析工具
 *
 * 解决：东方财富等数据源返回的不是 JSONP 而是 `var X = ...; var Y = ...;` 形式
 * 的 JS 变量声明文件（如 pingzhongdata、funddataIndex_Interface），且响应通常没有
 * CORS 头，浏览器侧无法用 fetch 直接拿到。本工具双端实现：
 *
 * - 浏览器端：动态 `<script>` 注入，从 `window` 读全局变量，读完立即删除
 * - Node.js 端：fetch 文本 + 括号配对扫描 + `JSON.parse`；若传入 `client`，走
 *   `RequestClient` 享受 SDK 重试 / 限流 / 熔断 / fallback host 治理
 *
 * 仅支持值是合法 JSON 字面量的变量（数组 / 对象 / 数字 / 字符串 / 布尔 / null）。
 *
 * 浏览器端并发安全：内部用 `withScriptMutex` 做全局串行化（key 为
 * `BROWSER_JSVARS_MUTEX_KEY`），任意两个浏览器 fetchJsVars 调用都按提交顺序
 * 串行执行，避免不同接口的全局变量名集合交集（如 pingzhongdata 系列共享
 * `fS_code` / `fS_name`）导致的相互覆盖。
 *
 * ⚠️ 浏览器端限制：
 * - 通过 `<script>` 注入加载，`options.client` / `options.headers` 都不会生效；
 *   SDK 治理（retry / rateLimit / circuitBreaker / providerPolicies）仅 Node 端生效
 * - 数据源若把字面量改成 JS 表达式（如带函数引用、未引号 key），解析失败的字段将
 *   返回 `undefined`，但不会抛错
 */
import type { RequestClient } from './request';
import { withScriptMutex } from './scriptMutex';
import { SdkError, HttpError } from './errors';

/**
 * 运行时检查是否在浏览器环境。
 * 写成函数（而非 module-level const）是为了让单测能通过 `vi.stubGlobal` 动态切换环境。
 */
function isBrowserEnv(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * 浏览器端 fetchJsVars 默认共享的 mutex 键。
 *
 * 用全局键（而非按变量名集合算 key）的原因：不同接口的变量名集合常有交集
 * （如 pingzhongdata 的 `fS_code` / `fS_name` 同时被多个接口写入）。按集合
 * 分组的 key 会让"集合不同但有交集"的并发请求互相覆盖全局变量。
 *
 * 代价：默认下任意两个浏览器 fetchJsVars 调用都串行。变量集合与基金系
 * **确定不相交**的数据源（如 smartbox 的 `v_hint`）可用 `options.mutexKey`
 * 声明专属队列，避免被基金大文件下载排队拖慢（R7-5）——同 key 仍串行，
 * 保住自身并发安全。
 *
 * Node 端不走 mutex，不受影响。
 */
export const BROWSER_JSVARS_MUTEX_KEY = 'jsVars';

export interface FetchJsVarsOptions {
  /** 超时毫秒数，默认 15000（仅在裸 fetch 路径生效；走 client 时由 client 治理） */
  timeout?: number;
  /** 额外的 fetch headers（仅 Node 端裸 fetch 路径生效；client 路径请通过 client 配置） */
  headers?: Record<string, string>;
  /**
   * 浏览器端注入互斥队列的 key，默认 {@link BROWSER_JSVARS_MUTEX_KEY}（全局串行）。
   * 仅当变量名集合与其它数据源**确定不相交**时才可指定专属 key。
   */
  mutexKey?: string;
  /**
   * 可选的 SDK 请求客户端。
   * - 传入：Node 端走 `client.get<string>(url, { responseType: 'text' })`，享受 SDK 重试 /
   *   限流 / 熔断 / fallback host / providerPolicies 全套治理
   * - 不传：Node 端用裸 `fetch`（兼容直接用工具的高级用户）
   * - 浏览器端始终走 `<script>` 注入，此参数不生效
   */
  client?: RequestClient;
}

/**
 * 从一个 JS 变量声明文件中提取指定变量的值。
 *
 * @param url 目标 URL
 * @param varNames 要提取的变量名列表
 * @param options 选项（timeout / headers）
 * @returns 一个对象；键是变量名，值是解析后的 JS 值；变量不存在或解析失败时键不出现
 */
export async function fetchJsVars<T extends object>(
  url: string,
  varNames: (keyof T & string)[],
  options: FetchJsVarsOptions = {}
): Promise<Partial<T>> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  if (isBrowserEnv()) {
    // 默认全局 mutex key：浏览器端所有 fetchJsVars 串行。
    // 详见 BROWSER_JSVARS_MUTEX_KEY 注释——不同接口的变量集合常有交集
    // （如 pingzhongdata 系列共享 fS_code / fS_name），按集合分组的 key
    // 会出现"集合不同但有交集"的并发漏洞；集合确定不相交的数据源
    // 可通过 options.mutexKey 走专属队列（R7-5）。
    return withScriptMutex(options.mutexKey ?? BROWSER_JSVARS_MUTEX_KEY, () =>
      browserFetchJsVars<T>(url, varNames, timeout)
    );
  }
  return nodeFetchJsVars<T>(
    url,
    varNames,
    timeout,
    options.headers,
    options.client
  );
}

/**
 * 从给定 JS 文本中提取多个变量（暴露用于单测 / 高级用户）。
 */
export function parseJsVars<T extends object>(
  text: string,
  varNames: (keyof T & string)[]
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const name of varNames) {
    const value = extractVar(text, name);
    if (value !== undefined) {
      out[name] = value;
    }
  }
  return out as Partial<T>;
}

function browserFetchJsVars<T extends object>(
  url: string,
  varNames: (keyof T & string)[],
  timeout: number
): Promise<Partial<T>> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let settled = false;

    // R7-10: 注入前把请求的变量名预置为 undefined。
    // 上一轮请求留下的顶层 `var` 全局是 non-configurable 的，delete 必然失败
    // （strict 模式下 TypeError 被下方 catch 吞掉）——若本次脚本不定义某变量，
    // `name in win` 仍为 true，会把上一个基金的数据归属到本次请求。
    // var 全局不可 delete 但可写：置 undefined 等价"清空残留"，读取侧以
    // undefined 判缺失（数据文件的变量值不会是 undefined）。
    const presetUndefined = () => {
      for (const name of varNames) {
        try {
          win[name] = undefined;
        } catch {
          // 只读全局（极端宿主注入场景）：忽略，读取侧仍有 undefined 门
        }
      }
    };
    presetUndefined();

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // R7-10: 移除 script 节点并不能取消已在途的 classic script 执行，且超时
      // reject 即释放互斥——迟到脚本可能落在下一请求的"预置之后、onload 之前"
      // 窗口。给超时脚本挂二次清扫，把最坏后果从"串数据"降级为"偶发缺数据"
      // （已知残余：清扫可能误清下一请求已写入的同名值，表现为该变量缺失，
      // 可重试；彻底方案需请求代际标记，复杂度与收益不匹配）。
      script.onload = presetUndefined;
      script.onerror = null;
      cleanup();
      reject(
        new SdkError({
          code: 'TIMEOUT',
          message: `fetchJsVars timed out after ${timeout}ms: ${url}`,
          url,
          details: { timeout },
        })
      );
    }, timeout);

    script.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const out: Record<string, unknown> = {};
      for (const name of varNames) {
        // undefined 视为"本次脚本未定义"，不采信上一轮残留（R7-10）
        if (name in win && win[name] !== undefined) {
          out[name] = win[name];
        }
        // 无论脚本是否定义，都清理该名：presetUndefined 建的 configurable own
        // 属性会被 delete 掉（不残留 window 命名空间污染），脚本声明的
        // non-configurable var 删不掉则置 undefined 兜底
        try {
          delete win[name];
        } catch {
          win[name] = undefined;
        }
      }
      cleanup();
      resolve(out as Partial<T>);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(
        new SdkError({
          code: 'NETWORK_ERROR',
          message: `fetchJsVars script load failed: ${url}`,
          url,
        })
      );
    };

    script.src = url;
    document.head.appendChild(script);
  });
}

async function nodeFetchJsVars<T extends object>(
  url: string,
  varNames: (keyof T & string)[],
  timeout: number,
  headers?: Record<string, string>,
  client?: RequestClient
): Promise<Partial<T>> {
  // 优先走 SDK RequestClient（享受 retry / rateLimit / circuitBreaker / fallback host）
  if (client) {
    const text = await client.get<string>(url, { responseType: 'text' });
    return parseJsVars<T>(text, varNames);
  }

  // 兼容路径：未传 client 时用裸 fetch（方便高级用户直接用本工具）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (!resp.ok) {
      throw new HttpError(resp.status, resp.statusText, url);
    }
    const text = await resp.text();
    return parseJsVars<T>(text, varNames);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SdkError({
        code: 'TIMEOUT',
        message: `fetchJsVars timed out after ${timeout}ms: ${url}`,
        url,
        details: { timeout },
      });
    }
    if (error instanceof SdkError) {
      throw error;
    }
    // 与 jsonp 同理:裸 fetch 路径非 abort 失败归一为 SdkError,不让原始 TypeError 逃逸
    throw new SdkError({
      code: 'NETWORK_ERROR',
      message: `fetchJsVars failed: ${error instanceof Error ? error.message : String(error)}`,
      url,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从给定 JS 文本中提取单个 `var/let/const` 声明的值（仅当值为 JSON 字面量时能成功）。
 */
function extractVar(text: string, name: string): unknown {
  const declRe = new RegExp(
    `(?:^|[^\\w$])(?:var|let|const)\\s+${escapeRegExp(name)}\\s*=\\s*`,
    'm'
  );
  const m = declRe.exec(text);
  if (!m) return undefined;

  const valueStart = m.index + m[0].length;
  const valueEnd = findValueEnd(text, valueStart);
  const literal = text.slice(valueStart, valueEnd).trim();
  try {
    return JSON.parse(literal);
  } catch {
    // 兜底：部分数据源用单引号字符串字面量（非严格 JSON），如东财
    // pingzhongdata 的 swithSameType `[['001480_..._472.06', ...]]`。
    // 浏览器端 <script> 注入本就能拿到真实 JS 值，这里把 Node 端对齐：
    // 做一次引号感知的单引号→双引号归一后重试，仍失败才放弃。
    try {
      return JSON.parse(normalizeJsStringQuotes(literal));
    } catch {
      return undefined;
    }
  }
}

/**
 * 将 JS 字面量里的单引号字符串归一为双引号字符串，输出严格 JSON 文本。
 *
 * 引号感知：只把单引号字符串的「定界符」转成双引号，双引号字符串原样保留；
 * 单引号字符串内部的 `"` 转义为 `\"`，`\'` 还原为裸 `'`（JSON 双引号串里单引号
 * 无需转义），其余反斜杠转义对照拷贝。
 *
 * 仅用于 `JSON.parse` 失败后的兜底，**不处理**「无引号对象键」等其它非 JSON 形态——
 * 那类输入归一后仍会 parse 失败，由调用方按 `undefined` 处理。
 */
function normalizeJsStringQuotes(literal: string): string {
  let out = '';
  let inStr: '"' | "'" | null = null;
  for (let i = 0; i < literal.length; i++) {
    const ch = literal[i];
    if (inStr === '"') {
      out += ch;
      if (ch === '\\' && i + 1 < literal.length) {
        out += literal[++i]; // 转义对原样拷贝
      } else if (ch === '"') {
        inStr = null;
      }
      continue;
    }
    if (inStr === "'") {
      if (ch === '\\' && i + 1 < literal.length) {
        const next = literal[++i];
        out += next === "'" ? "'" : '\\' + next;
        continue;
      }
      if (ch === "'") {
        out += '"';
        inStr = null;
        continue;
      }
      out += ch === '"' ? '\\"' : ch;
      continue;
    }
    // 字符串外
    if (ch === '"') {
      inStr = '"';
      out += ch;
      continue;
    }
    if (ch === "'") {
      inStr = "'";
      out += '"';
      continue;
    }
    out += ch;
  }
  return out;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 从 start 位置开始扫描，找到下一个顶层 `;` 的索引。
 * "顶层"指不在字符串字面量内部、且方括号 / 大括号 / 圆括号嵌套深度为 0。
 * 找不到则返回字符串末尾索引。
 */
function findValueEnd(text: string, start: number): number {
  let depth = 0;
  let inStr: '"' | "'" | null = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') {
        i++; // 跳过下一个转义字符
        continue;
      }
      if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === '[' || ch === '{' || ch === '(') {
      depth++;
      continue;
    }
    if (ch === ']' || ch === '}' || ch === ')') {
      depth--;
      continue;
    }
    if (ch === ';' && depth === 0) {
      return i;
    }
  }
  return text.length;
}
