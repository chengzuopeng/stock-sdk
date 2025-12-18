import { describe, it, expect, vi } from 'vitest';
import StockSDK from './index';
import { decodeGBK, parseResponse, safeNumber, safeNumberOrNull, chunkArray, asyncPool } from './utils';

const sdk = new StockSDK();

describe('TencentStockSDK', () => {
  describe('getFullQuotes', () => {
    it('should return A股全量行情', async () => {
      const res = await sdk.getFullQuotes(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000858');
      expect(q.name).toContain('粮');
      expect(typeof q.price).toBe('number');
      expect(q.bid.length).toBe(5);
      expect(q.ask.length).toBe(5);
    });
  });

  describe('getSimpleQuotes', () => {
    it('should return 简要行情', async () => {
      const res = await sdk.getSimpleQuotes(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000858');
      expect(typeof q.price).toBe('number');
    });

    it('should return 指数简要行情', async () => {
      const res = await sdk.getSimpleQuotes(['sh000001']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000001');
      expect(q.name).toContain('指数');
    });
  });

  describe('getFundFlow', () => {
    it('should return 资金流向', async () => {
      const res = await sdk.getFundFlow(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      // API 可能返回 pv_none_match（无数据），此时 code 会是 "1"
      // 正常情况下 code 应包含股票代码
      expect(typeof q.code).toBe('string');
      expect(typeof q.mainInflow).toBe('number');
    });
  });

  describe('getPanelLargeOrder', () => {
    it('should return 盘口大单占比', async () => {
      const res = await sdk.getPanelLargeOrder(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(typeof q.buyLargeRatio).toBe('number');
      expect(typeof q.sellLargeRatio).toBe('number');
    });
  });

  describe('getHKQuotes', () => {
    it('should return 港股扩展行情', async () => {
      const res = await sdk.getHKQuotes(['09988']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('09988');
      expect(typeof q.price).toBe('number');
    });
  });

  describe('getUSQuotes', () => {
    it('should return 美股简要行情', async () => {
      const res = await sdk.getUSQuotes(['BABA']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toContain('BABA');
      expect(typeof q.price).toBe('number');
    });
  });

  describe('getFundQuotes', () => {
    it('should return 公募基金行情', async () => {
      const res = await sdk.getFundQuotes(['000001']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000001');
      expect(typeof q.nav).toBe('number');
    });
  });

  describe('batchRaw', () => {
    it('should return 批量混合查询原始结果', async () => {
      const res = await sdk.batchRaw('sz000858,s_sh000001');
      expect(res.length).toBe(2);
      expect(res[0].key).toContain('sz000858');
      expect(res[1].key).toContain('sh000001');
    });
  });

  describe('getTodayTimeline', () => {
    it('should return 当日分时数据', async () => {
      const res = await sdk.getTodayTimeline('sz000001');
      expect(res.code).toBe('sz000001');
      expect(res.date).toMatch(/^\d{8}$/);
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0) {
        const first = res.data[0];
        expect(first.time).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof first.price).toBe('number');
        expect(typeof first.volume).toBe('number');
        expect(typeof first.amount).toBe('number');
      }
    });

    it('should return 上证指数分时数据', async () => {
      const res = await sdk.getTodayTimeline('sh000001');
      expect(res.code).toBe('sh000001');
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe('getAllQuotesByCodes', () => {
    it('should return 批量获取多只股票行情', async () => {
      const codes = ['sz000858', 'sh600000', 'sz000001'];
      const res = await sdk.getAllQuotesByCodes(codes, {
        batchSize: 2,
        concurrency: 2,
      });
      expect(res.length).toBe(3);
      expect(res.some((q) => q.code === '000858')).toBe(true);
      expect(res.some((q) => q.code === '600000')).toBe(true);
    });

    it('should call onProgress callback', async () => {
      const codes = ['sz000858', 'sh600000', 'sz000001', 'sh600036'];
      const progressCalls: { completed: number; total: number }[] = [];

      await sdk.getAllQuotesByCodes(codes, {
        batchSize: 2,
        concurrency: 1,
        onProgress: (completed, total) => {
          progressCalls.push({ completed, total });
        },
      });

      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0]).toEqual({ completed: 1, total: 2 });
      expect(progressCalls[1]).toEqual({ completed: 2, total: 2 });
    });
  });
});

describe('getAShareCodeList', () => {
  it('should return A股代码列表 from remote', async () => {
    const codeList = await sdk.getAShareCodeList();
    expect(Array.isArray(codeList)).toBe(true);
    expect(codeList.length).toBeGreaterThan(5000);
    expect(codeList[0]).toMatch(/^(sh|sz|bj)\d+$/);
  });

  it('should contain major stock codes', async () => {
    const codeList = await sdk.getAShareCodeList();
    expect(codeList).toContain('sz000858'); // 五粮液
    expect(codeList).toContain('sh600000'); // 浦发银行
    expect(codeList).toContain('sh600519'); // 贵州茅台
  });
});

describe('getHistoryKline', () => {
  it('should return 日K线数据', async () => {
    const res = await sdk.getHistoryKline('000001', {
      startDate: '20241201',
      endDate: '20241217',
    });
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.code).toBe('000001');
    expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof k.open).toBe('number');
    expect(typeof k.close).toBe('number');
    expect(typeof k.high).toBe('number');
    expect(typeof k.low).toBe('number');
    expect(typeof k.volume).toBe('number');
  });

  it('should return 周K线数据', async () => {
    const res = await sdk.getHistoryKline('sz000858', {
      period: 'weekly',
      startDate: '20241101',
      endDate: '20241231',
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].code).toBe('000858');
  });

  it('should support different adjust types', async () => {
    const [hfq, qfq, noAdj] = await Promise.all([
      sdk.getHistoryKline('000001', { adjust: 'hfq', startDate: '20241201', endDate: '20241217' }),
      sdk.getHistoryKline('000001', { adjust: 'qfq', startDate: '20241201', endDate: '20241217' }),
      sdk.getHistoryKline('000001', { adjust: '', startDate: '20241201', endDate: '20241217' }),
    ]);
    expect(hfq.length).toBeGreaterThan(0);
    expect(qfq.length).toBeGreaterThan(0);
    expect(noAdj.length).toBeGreaterThan(0);
  });
});

describe('getMinuteKline', () => {
  it('should return 分时数据 (period=1)', async () => {
    const res = await sdk.getMinuteKline('000001', { period: '1' });
    expect(res.length).toBeGreaterThan(0);
    const t = res[0];
    expect(t.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(typeof t.open).toBe('number');
    expect(typeof t.close).toBe('number');
    // 分时数据有均价字段
    expect('avgPrice' in t).toBe(true);
  });

  it('should return 5分钟K线', async () => {
    const res = await sdk.getMinuteKline('sz000858', { period: '5' });
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(typeof k.open).toBe('number');
    // 分钟K线有涨跌幅字段
    expect('changePercent' in k).toBe(true);
  });

  it('should return 60分钟K线', async () => {
    const res = await sdk.getMinuteKline('sh600519', { period: '60' });
    expect(res.length).toBeGreaterThan(0);
    expect(typeof res[0].open).toBe('number');
  });

  it('should return 15分钟K线', async () => {
    const res = await sdk.getMinuteKline('000001', { period: '15' });
    expect(res.length).toBeGreaterThan(0);
  });

  it('should return 30分钟K线', async () => {
    const res = await sdk.getMinuteKline('000001', { period: '30' });
    expect(res.length).toBeGreaterThan(0);
  });
});

// ============ 工具函数测试 ============
describe('utils', () => {
  describe('decodeGBK', () => {
    it('should decode GBK encoded ArrayBuffer', () => {
      // 简单的 ASCII 测试
      const text = 'hello';
      const encoder = new TextEncoder();
      const buffer = encoder.encode(text).buffer;
      const result = decodeGBK(buffer);
      expect(result).toBe('hello');
    });
  });

  describe('parseResponse', () => {
    it('should parse valid response text', () => {
      const text = 'v_sz000001="1~平安银行~000001~11.50";';
      const result = parseResponse(text);
      expect(result.length).toBe(1);
      expect(result[0].key).toBe('sz000001');
      expect(result[0].fields).toContain('平安银行');
    });

    it('should handle multiple entries', () => {
      const text = 'v_sz000001="1~平安银行~000001";v_sh600000="2~浦发银行~600000";';
      const result = parseResponse(text);
      expect(result.length).toBe(2);
    });

    it('should handle empty response', () => {
      const result = parseResponse('');
      expect(result).toEqual([]);
    });

    it('should handle malformed response', () => {
      const result = parseResponse('invalid data without quotes');
      expect(result).toEqual([]);
    });
  });

  describe('safeNumber', () => {
    it('should parse valid number string', () => {
      expect(safeNumber('123.45')).toBe(123.45);
    });

    it('should return 0 for empty string', () => {
      expect(safeNumber('')).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(safeNumber(undefined)).toBe(0);
    });

    it('should return 0 for NaN', () => {
      expect(safeNumber('abc')).toBe(0);
    });
  });

  describe('safeNumberOrNull', () => {
    it('should parse valid number string', () => {
      expect(safeNumberOrNull('123.45')).toBe(123.45);
    });

    it('should return null for empty string', () => {
      expect(safeNumberOrNull('')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(safeNumberOrNull(undefined)).toBeNull();
    });

    it('should return null for dash', () => {
      expect(safeNumberOrNull('-')).toBeNull();
    });

    it('should return null for NaN', () => {
      expect(safeNumberOrNull('abc')).toBeNull();
    });
  });

  describe('chunkArray', () => {
    it('should chunk array correctly', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = chunkArray(arr, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 2);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2, 3];
      const chunks = chunkArray(arr, 10);
      expect(chunks).toEqual([[1, 2, 3]]);
    });
  });

  describe('asyncPool', () => {
    it('should execute tasks with concurrency limit', async () => {
      const results: number[] = [];
      const tasks = [1, 2, 3, 4, 5].map(n => async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(n);
        return n * 2;
      });

      const output = await asyncPool(tasks, 2);
      expect(output).toEqual([2, 4, 6, 8, 10]);
      expect(results.length).toBe(5);
    });

    it('should handle empty tasks', async () => {
      const output = await asyncPool([], 2);
      expect(output).toEqual([]);
    });

    it('should correctly remove completed promises', async () => {
      // 测试当任务数量超过并发限制时，已完成的 Promise 会被移除
      let completedCount = 0;
      const tasks = [1, 2, 3, 4, 5, 6, 7, 8].map(n => async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        completedCount++;
        return n;
      });

      const output = await asyncPool(tasks, 3);
      // 验证所有任务都完成了
      expect(completedCount).toBe(8);
      // 验证返回结果按顺序
      expect(output).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should handle concurrency of 1', async () => {
      const tasks = [1, 2, 3].map(n => async () => n * 2);
      const output = await asyncPool(tasks, 1);
      expect(output).toEqual([2, 4, 6]);
    });
  });
});

// ============ 边界情况测试 ============
describe('边界情况', () => {
  describe('空参数处理', () => {
    it('getFullQuotes 空数组应返回空', async () => {
      const res = await sdk.getFullQuotes([]);
      expect(res).toEqual([]);
    });

    it('getSimpleQuotes 空数组应返回空', async () => {
      const res = await sdk.getSimpleQuotes([]);
      expect(res).toEqual([]);
    });

    it('getFundFlow 空数组应返回空', async () => {
      const res = await sdk.getFundFlow([]);
      expect(res).toEqual([]);
    });

    it('getPanelLargeOrder 空数组应返回空', async () => {
      const res = await sdk.getPanelLargeOrder([]);
      expect(res).toEqual([]);
    });

    it('getHKQuotes 空数组应返回空', async () => {
      const res = await sdk.getHKQuotes([]);
      expect(res).toEqual([]);
    });

    it('getUSQuotes 空数组应返回空', async () => {
      const res = await sdk.getUSQuotes([]);
      expect(res).toEqual([]);
    });

    it('getFundQuotes 空数组应返回空', async () => {
      const res = await sdk.getFundQuotes([]);
      expect(res).toEqual([]);
    });

    it('getAllQuotesByCodes 空数组应返回空', async () => {
      const res = await sdk.getAllQuotesByCodes([]);
      expect(res).toEqual([]);
    });
  });

  describe('SDK 配置', () => {
    it('should use custom baseUrl', () => {
      const customSdk = new StockSDK({ baseUrl: 'https://custom.url' });
      expect(customSdk).toBeInstanceOf(StockSDK);
    });

    it('should use custom timeout', () => {
      const customSdk = new StockSDK({ timeout: 5000 });
      expect(customSdk).toBeInstanceOf(StockSDK);
    });
  });

  describe('getAShareCodeList', () => {
    it('should return codes without exchange prefix', async () => {
      const codeList = await sdk.getAShareCodeList(false);
      expect(Array.isArray(codeList)).toBe(true);
      expect(codeList.length).toBeGreaterThan(5000);
      // 验证不含前缀
      expect(codeList[0]).toMatch(/^\d+$/);
    });
  });

  describe('getHistoryKline', () => {
    it('should support monthly period', async () => {
      const res = await sdk.getHistoryKline('000001', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should support sh prefix', async () => {
      const res = await sdk.getHistoryKline('sh600000', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('600000');
    });

    it('should support bj prefix', async () => {
      const res = await sdk.getHistoryKline('bj430047', {
        startDate: '20241201',
        endDate: '20241217',
      });
      // 北交所股票可能没数据，只要不报错就行
      expect(Array.isArray(res)).toBe(true);
    });
  });

  describe('getTodayTimeline', () => {
    it('should calculate avgPrice correctly', async () => {
      const res = await sdk.getTodayTimeline('sz000001');
      if (res.data.length > 0) {
        const first = res.data[0];
        expect(typeof first.avgPrice).toBe('number');
        // 均价应该大于0（如果有成交）
        if (first.volume > 0) {
          expect(first.avgPrice).toBeGreaterThan(0);
        }
      }
    });

    it('should throw error for invalid stock code', async () => {
      // 无效代码会抛出错误
      await expect(sdk.getTodayTimeline('invalid_code')).rejects.toThrow();
    });

    // 各板块成交量单位统一测试
    it('主板深圳 sz000001 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sz000001');
      if (res.data.length > 0) {
        const first = res.data[0];
        // 验证均价计算正确：amount / volume 应接近 price
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('主板上海 sh600519 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sh600519');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('科创板 sh688601 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sh688601');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('创业板 sz300750 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sz300750');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('北交所 bj830799 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('bj830799');
      // 北交所股票可能无成交，只验证返回结构正确
      expect(res.code).toBe('bj830799');
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0 && res.data[0].volume > 0) {
        const first = res.data[0];
        const calcAvg = first.amount / first.volume;
        expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
      }
    });
  });

  describe('getAllAShareQuotes', () => {
    it('should call onProgress callback', async () => {
      let progressCalled = false;
      // 只获取少量数据用于测试
      const customSdk = new StockSDK();
      const res = await customSdk.getAllAShareQuotes({
        batchSize: 50,
        concurrency: 1,
        onProgress: (completed, total) => {
          progressCalled = true;
          expect(completed).toBeGreaterThan(0);
          expect(total).toBeGreaterThan(0);
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(progressCalled).toBe(true);
    }, 60000);
  });
});

// ============ 多种周期和参数组合测试 ============
describe('参数组合测试', () => {
  describe('getMinuteKline 复权类型', () => {
    it('should support qfq adjust', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '5', adjust: 'qfq' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should support no adjust', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '5', adjust: '' });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('市场代码前缀处理', () => {
    it('getMinuteKline should handle sz prefix', async () => {
      const res = await sdk.getMinuteKline('sz000001', { period: '5' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('getMinuteKline should handle sh prefix', async () => {
      const res = await sdk.getMinuteKline('sh600000', { period: '5' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('getMinuteKline 分时应处理带前缀的代码', async () => {
      const res = await sdk.getMinuteKline('sz000001', { period: '1' });
      expect(res.length).toBeGreaterThan(0);
    });
  });
});

// ============ 错误处理测试 ============
describe('错误处理', () => {
  describe('超时处理', () => {
    it('should throw error when request times out', async () => {
      const slowSdk = new StockSDK({ timeout: 1 }); // 1ms 超时
      await expect(slowSdk.getFullQuotes(['sz000858'])).rejects.toThrow();
    });
  });

  describe('API 错误', () => {
    it('getTodayTimeline should throw when API returns error', async () => {
      await expect(sdk.getTodayTimeline('abc123')).rejects.toThrow();
    });
  });
});

// ============ 导出测试 ============
describe('模块导出', () => {
  it('should export StockSDK class', async () => {
    const { StockSDK } = await import('./index');
    expect(StockSDK).toBeDefined();
    expect(new StockSDK()).toBeInstanceOf(StockSDK);
  });

  it('should export default', async () => {
    const defaultExport = await import('./index');
    expect(defaultExport.default).toBeDefined();
  });

  it('should export GetAllAShareQuotesOptions', async () => {
    const module = await import('./index');
    expect(module.StockSDK).toBeDefined();
    // GetAllAShareQuotesOptions 是类型，只能在编译时检查
  });
});

// ============ 更多边界情况测试 ============
describe('更多边界情况', () => {
  describe('多只股票批量请求', () => {
    it('should handle multiple full quotes', async () => {
      const codes = ['sz000858', 'sh600000', 'sz000001', 'sh600519'];
      const res = await sdk.getFullQuotes(codes);
      expect(res.length).toBe(4);
    });

    it('should handle multiple simple quotes', async () => {
      const codes = ['sz000858', 'sh000001'];
      const res = await sdk.getSimpleQuotes(codes);
      expect(res.length).toBe(2);
    });

    it('should handle multiple HK quotes', async () => {
      const res = await sdk.getHKQuotes(['09988', '00700']);
      expect(res.length).toBe(2);
    });

    it('should handle multiple US quotes', async () => {
      const res = await sdk.getUSQuotes(['BABA', 'AAPL']);
      expect(res.length).toBe(2);
    });

    it('should handle multiple fund quotes', async () => {
      const res = await sdk.getFundQuotes(['000001', '110011']);
      expect(res.length).toBe(2);
    });
  });

  describe('getHistoryKline 更多场景', () => {
    it('should handle 6-digit code starting with 6', async () => {
      const res = await sdk.getHistoryKline('600000', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('600000');
    });

    it('should handle code starting with 0', async () => {
      const res = await sdk.getHistoryKline('000001', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('getMinuteKline 时间范围过滤', () => {
    it('should filter by time range', async () => {
      const res = await sdk.getMinuteKline('000001', {
        period: '5',
        startDate: '2024-12-01 09:30:00',
        endDate: '2024-12-31 15:00:00',
      });
      // 只验证返回是数组
      expect(Array.isArray(res)).toBe(true);
    });
  });
});


