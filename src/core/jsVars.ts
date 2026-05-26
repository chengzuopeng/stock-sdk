/**
 * JS 变量声明文件双端解析工具
 *
 * 解决：东方财富等数据源返回的不是 JSONP 而是 `var X = ...; var Y = ...;` 形式
 * 的 JS 变量声明文件（如 pingzhongdata、funddataIndex_Interface），且响应通常没有
 * CORS 头，浏览器侧无法用 fetch 直接拿到。本工具双端实现：
 *
 * - 浏览器端：动态 `<script>` 注入，从 `window` 读全局变量，读完立即删除
 * - Node.js 端：fetch 文本 + 括号配对扫描 + `JSON.parse`
 *
 * 仅支持值是合法 JSON 字面量的变量（数组 / 对象 / 数字 / 字符串 / 布尔 / null）。
 *
 * ⚠️ 浏览器端注意：
 * - 注入期间会污染 `window`。并发请求同一变量名可能互相覆盖，调用方需自行做请求级
 *   mutex 或避免并发。
 * - 数据源若把字面量改成 JS 表达式（如带函数引用、未引号 key），解析失败的字段将
 *   返回 `undefined`，但不会抛错。
 */

const isBrowser =
  typeof document !== 'undefined' && typeof window !== 'undefined';

const DEFAULT_TIMEOUT_MS = 15000;

export interface FetchJsVarsOptions {
  /** 超时毫秒数，默认 15000 */
  timeout?: number;
  /** 额外的 fetch headers（仅 Node 端生效；浏览器 `<script>` 注入无法自定义 header） */
  headers?: Record<string, string>;
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
  if (isBrowser) {
    return browserFetchJsVars<T>(url, varNames, timeout);
  }
  return nodeFetchJsVars<T>(url, varNames, timeout, options.headers);
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
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`fetchJsVars timed out after ${timeout}ms: ${url}`));
    }, timeout);

    script.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const win = window as unknown as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const name of varNames) {
        if (name in win) {
          out[name] = win[name];
          try {
            delete win[name];
          } catch {
            // 严格模式或不可配置的属性：忽略，不影响业务
          }
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
      reject(new Error(`fetchJsVars script load failed: ${url}`));
    };

    script.src = url;
    document.head.appendChild(script);
  });
}

async function nodeFetchJsVars<T extends object>(
  url: string,
  varNames: (keyof T & string)[],
  timeout: number,
  headers?: Record<string, string>
): Promise<Partial<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (!resp.ok) {
      throw new Error(
        `fetchJsVars fetch failed with status ${resp.status}: ${url}`
      );
    }
    const text = await resp.text();
    return parseJsVars<T>(text, varNames);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`fetchJsVars timed out after ${timeout}ms: ${url}`);
    }
    throw error;
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
    return undefined;
  }
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
