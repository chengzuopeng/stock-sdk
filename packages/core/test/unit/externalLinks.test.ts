import { describe, expect, it } from 'vitest';
import { generateSearchExternalLinks } from '../../src';
import type { SearchResult } from '../../src';

/**
 * 构造最小搜索结果，避免测试依赖腾讯 Smartbox 网络响应。
 * @param overrides 覆盖字段
 */
function createSearchResult(overrides: Partial<SearchResult>): SearchResult {
  return {
    code: '',
    name: '',
    market: '',
    type: '',
    ...overrides,
  };
}

describe('generateSearchExternalLinks', () => {
  it('should generate EastMoney and Xueqiu links for A-share stocks', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: 'sh600519', market: 'sh' })
    );

    expect(links).toEqual([
      {
        name: '东方财富',
        url: 'https://quote.eastmoney.com/sh600519.html',
      },
      {
        name: '雪球',
        url: 'https://xueqiu.com/S/SH600519',
      },
    ]);
  });

  it('should use EastMoney index page for A-share indices', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: 'sh000001', market: 'sh' })
    );

    expect(links[0]?.url).toBe('https://quote.eastmoney.com/zs000001.html');
    expect(links[1]?.url).toBe('https://xueqiu.com/S/SH000001');
  });

  it('should generate links for HK stocks and pad code to 5 digits', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: 'hk700', market: 'hk' })
    );

    expect(links[0]?.url).toBe('https://quote.eastmoney.com/hk/00700.html');
    expect(links[1]?.url).toBe('https://xueqiu.com/S/00700');
  });

  it('should generate links for US stocks', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: 'usAAPL', market: 'us' })
    );

    expect(links[0]?.url).toBe('https://quote.eastmoney.com/us/AAPL.html');
    expect(links[1]?.url).toBe('https://xueqiu.com/S/AAPL');
  });

  it('should support Tencent numeric market codes', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: '00700', market: '116' })
    );

    expect(links[0]?.url).toBe('https://quote.eastmoney.com/hk/00700.html');
    expect(links[1]?.url).toBe('https://xueqiu.com/S/00700');
  });

  it('should map known global index symbols for Xueqiu', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: 'IXIC', market: '100' })
    );

    expect(links[0]?.url).toBe('https://quote.eastmoney.com/gb/zsNDX.html');
    expect(links[1]?.url).toBe('https://xueqiu.com/S/.IXIC');
  });

  it('should fall back to search pages for unknown markets', () => {
    const links = generateSearchExternalLinks(
      createSearchResult({ code: 'ABC 123', market: '999' })
    );

    expect(links[0]?.url).toBe(
      'https://so.eastmoney.com/web/s?keyword=ABC%20123'
    );
    expect(links[1]?.url).toBe('https://xueqiu.com/k?q=ABC%20123');
  });
});
