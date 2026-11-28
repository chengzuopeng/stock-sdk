/**
 * F39 回归：港股 K 线 secid 收编到 v2 symbols 层
 *
 * 此前 hkKline 两处手拼 `116.${symbol.replace(/^hk/i,'').padStart(5,'0')}`,
 * 绕过 normalizeSymbol —— symbols 层支持的输入形式('116.00700' secid 形、
 * '00700.HK' 后缀形)到不了 kline.hk(会拼出 '116.116.00700' 这类坏 secid)。
 * 收编后所有形式统一经 normalizeSymbol({market:'HK'}) + toEastmoneySecid。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestClient, clearClientScopedCaches } from '../../../../src/core';
import {
  getHKHistoryKline,
  getHKMinuteKline,
} from '../../../../src/providers/eastmoney';
import { InvalidSymbolError } from '../../../../src/core/errors';

const client = new RequestClient({ retry: { maxRetries: 0 } });
// R7-11: 模块级共享 client 的用例间缓存隔离
beforeEach(() => clearClientScopedCaches(client));


const sampleKline =
  '2024-12-30 14:30,100.00,101.50,102.00,99.80,1234567,123456789.00,2.20,1.50,1.50,0.55';
const sampleDailyKline =
  '2024-12-30,100.00,101.50,102.00,99.80,1234567,123456789.00,2.20,1.50,1.50,0.55';

describe('F39 HK kline secid 经 symbols 层归一', () => {
  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  function stub(payload: object) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  // '00700' / 'hk00700' / '0700' / '700' 全部归一到 116.00700
  it.each(['00700', 'hk00700', '0700', '700'])(
    'minute kline: %s → secid=116.00700',
    async (symbol) => {
      stub({ data: { klines: [sampleKline] } });
      await getHKMinuteKline(client, symbol, { period: '5' });
      expect(lastUrl).toContain('secid=116.00700');
    }
  );

  // 新增可用的输入形式(修复前手拼出 secid=116.116.00700 / 116.00700.HK 坏请求)
  it.each(['116.00700', '00700.HK', '700.HK'])(
    'minute kline 支持 symbols 层形式: %s → secid=116.00700',
    async (symbol) => {
      stub({ data: { klines: [sampleKline] } });
      await getHKMinuteKline(client, symbol, { period: '5' });
      expect(lastUrl).toContain('secid=116.00700');
      expect(lastUrl).not.toContain('secid=116.116');
    }
  );

  it('minute kline 的 code 字段回填 normalizeSymbol 结果', async () => {
    stub({ data: { klines: [sampleKline] } });
    const rows = await getHKMinuteKline(client, 'hk700', { period: '5' });
    expect((rows[0] as { code: string }).code).toBe('00700');
  });

  it('minute 分时(period=1)同样走归一后的 secid', async () => {
    stub({ data: { trends: [] } });
    await getHKMinuteKline(client, '116.00700');
    expect(lastUrl).toContain('secid=116.00700');
  });

  it.each(['0700', 'hk00700', '116.00700', '00700.HK'])(
    'history kline: %s → secid=116.00700',
    async (symbol) => {
      stub({ data: { klines: [sampleDailyKline] } });
      await getHKHistoryKline(client, symbol);
      expect(lastUrl).toContain('secid=116.00700');
    }
  );

  it('history kline 上游缺 code 时回填 normalizeSymbol 结果', async () => {
    stub({ data: { klines: [sampleDailyKline] } }); // 无 data.code / data.name
    const rows = await getHKHistoryKline(client, 'hk700');
    expect(rows[0].code).toBe('00700');
  });

  it('非法符号抛 InvalidSymbolError(替代以前静默发坏 secid 请求)', async () => {
    stub({ data: { klines: [] } });
    await expect(getHKMinuteKline(client, '!!!', { period: '5' })).rejects.toThrow(
      InvalidSymbolError
    );
  });
});
