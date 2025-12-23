/**
 * HTTP 请求客户端
 */
import { decodeGBK, parseResponse } from './parser';
import { DEFAULT_TIMEOUT, TENCENT_BASE_URL } from './constants';

export interface RequestClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class RequestClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options: RequestClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? TENCENT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * 获取超时时间
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * 发送 GET 请求
   */
  async get<T = string>(
    url: string,
    options: {
      responseType?: 'text' | 'json' | 'arraybuffer';
    } = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(url, { signal: controller.signal });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      switch (options.responseType) {
        case 'json':
          return await resp.json();
        case 'arraybuffer':
          return (await resp.arrayBuffer()) as T;
        default:
          return (await resp.text()) as T;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 腾讯财经专用请求（GBK 解码）
   */
  async getTencentQuote(
    params: string
  ): Promise<{ key: string; fields: string[] }[]> {
    const url = `${this.baseUrl}/?q=${encodeURIComponent(params)}`;
    const buffer = await this.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
    });
    const text = decodeGBK(buffer);
    return parseResponse(text);
  }
}

