/**
 * JSONP 双端请求工具
 * 浏览器端：动态创建 <script> 标签注入
 * Node.js 端：fetch + 正则剥离 JSONP 包裹
 */

const isBrowser =
  typeof document !== 'undefined' && typeof window !== 'undefined';

let callbackCounter = 0;

function generateCallbackName(): string {
  return `__stock_sdk_jsonp_${Date.now()}_${callbackCounter++}`;
}

/**
 * 从 JSONP 响应文本中提取 JSON 数据
 * 处理新浪财经的三种 JSONP 格式：
 * - openapi.php: `/*<script>...</script>*\/\ncallback({...})`
 * - jsonp.php:   `/*<script>...</script>*\/\ncallback([...])`
 * - jsonp_v2.php: 同 jsonp.php
 */
export function extractJsonFromJsonp(text: string): unknown {
  let cleaned = text;
  const commentEnd = cleaned.indexOf('*/');
  if (commentEnd !== -1) {
    cleaned = cleaned.slice(commentEnd + 2).trim();
  }

  const parenStart = cleaned.indexOf('(');
  if (parenStart === -1) {
    throw new Error('Invalid JSONP response: no opening parenthesis found');
  }

  const parenEnd = cleaned.lastIndexOf(')');
  if (parenEnd === -1 || parenEnd <= parenStart) {
    throw new Error('Invalid JSONP response: no closing parenthesis found');
  }

  const jsonStr = cleaned.slice(parenStart + 1, parenEnd);
  return JSON.parse(jsonStr);
}

export interface JsonpOptions {
  /** 超时毫秒数，默认 15000 */
  timeout?: number;
  /** 自定义回调参数名（用于 openapi.php 类接口），默认 'callback' */
  callbackParam?: string;
  /**
   * 回调名嵌入方式：
   * - 'query' : 通过 URL query 参数传入（openapi.php 类）
   * - 'path'  : 嵌入 URL 路径中的 {callback} 占位符（jsonp.php 类）
   * 默认 'query'
   */
  callbackMode?: 'query' | 'path';
}

/**
 * 浏览器端 JSONP 请求
 */
function jsonpBrowser<T>(url: string, options: JsonpOptions): Promise<T> {
  const {
    timeout = 15000,
    callbackParam = 'callback',
    callbackMode = 'query',
  } = options;

  return new Promise<T>((resolve, reject) => {
    const cbName = generateCallbackName();
    let finalUrl: string;

    if (callbackMode === 'path') {
      finalUrl = url.replace('{callback}', cbName);
    } else {
      const sep = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${sep}${callbackParam}=${cbName}`;
    }

    const script = document.createElement('script');
    let settled = false;

    const globalObj = window as unknown as Record<string, unknown>;

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete globalObj[cbName];
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`JSONP request timed out after ${timeout}ms: ${url}`));
      }
    }, timeout);

    globalObj[cbName] = (data: T) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      }
    };

    script.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error(`JSONP script load failed: ${url}`));
      }
    };

    script.src = finalUrl;
    document.head.appendChild(script);
  });
}

/**
 * Node.js 端 JSONP 请求（fetch + 正则剥离）
 */
async function jsonpNode<T>(url: string, options: JsonpOptions): Promise<T> {
  const {
    timeout = 15000,
    callbackParam = 'callback',
    callbackMode = 'query',
  } = options;

  const cbName = generateCallbackName();
  let finalUrl: string;

  if (callbackMode === 'path') {
    finalUrl = url.replace('{callback}', cbName);
  } else {
    const sep = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${sep}${callbackParam}=${cbName}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(finalUrl, { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`JSONP fetch failed with status ${resp.status}: ${url}`);
    }
    const text = await resp.text();
    return extractJsonFromJsonp(text) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`JSONP request timed out after ${timeout}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 发送 JSONP 请求（自动适配浏览器 / Node.js 环境）
 * @param url - 请求 URL
 * @param options - 配置选项
 * @returns 解析后的 JSON 数据
 */
export function jsonpRequest<T = unknown>(
  url: string,
  options: JsonpOptions = {}
): Promise<T> {
  if (isBrowser) {
    return jsonpBrowser<T>(url, options);
  }
  return jsonpNode<T>(url, options);
}
