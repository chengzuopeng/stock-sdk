import { describe, it, expect, vi } from 'vitest';
import StockSDK from './index';
import { decodeGBK, parseResponse, safeNumber, safeNumberOrNull, chunkArray, asyncPool } from './utils';
import { getMarketCode, getPeriodCode, getAdjustCode } from './core';
import {
  calcSMA,
  calcEMA,
  calcWMA,
  calcMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  addIndicators,
} from './indicators';

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
    it('should return 港股行情 with full fields', async () => {
      const res = await sdk.getHKQuotes(['00700']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('00700');
      expect(typeof q.price).toBe('number');
      // 验证新增字段
      expect(q).toHaveProperty('prevClose');
      expect(q).toHaveProperty('open');
      expect(q).toHaveProperty('high');
      expect(q).toHaveProperty('low');
      expect(q).toHaveProperty('volume');
      expect(q).toHaveProperty('amount');
      expect(q).toHaveProperty('time');
      expect(q).toHaveProperty('currency');
      expect(q).toHaveProperty('totalMarketCap');
    });
  });

  describe('getUSQuotes', () => {
    it('should return 美股行情 with full fields', async () => {
      const res = await sdk.getUSQuotes(['AAPL']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toContain('AAPL');
      expect(typeof q.price).toBe('number');
      // 验证新增字段
      expect(q).toHaveProperty('prevClose');
      expect(q).toHaveProperty('open');
      expect(q).toHaveProperty('high');
      expect(q).toHaveProperty('low');
      expect(q).toHaveProperty('volume');
      expect(q).toHaveProperty('amount');
      expect(q).toHaveProperty('time');
      expect(q).toHaveProperty('pe');
      expect(q).toHaveProperty('totalMarketCap');
      expect(q).toHaveProperty('high52w');
      expect(q).toHaveProperty('low52w');
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

describe('getUSCodeList', () => {
  it('should return 美股代码列表 from remote', async () => {
    const codeList = await sdk.getUSCodeList();
    expect(Array.isArray(codeList)).toBe(true);
    expect(codeList.length).toBeGreaterThan(1000);
    // 验证包含市场前缀
    expect(codeList[0]).toMatch(/^\d{3}\.[A-Z]+$/);
  });

  it('should return codes without market prefix', async () => {
    const codeList = await sdk.getUSCodeList(false);
    expect(Array.isArray(codeList)).toBe(true);
    expect(codeList.length).toBeGreaterThan(1000);
    // 验证不含市场前缀
    expect(codeList[0]).toMatch(/^[A-Z]+$/);
  });
});

describe('getHKCodeList', () => {
  it('should return 港股代码列表 from remote', async () => {
    const codeList = await sdk.getHKCodeList();
    expect(Array.isArray(codeList)).toBe(true);
    expect(codeList.length).toBeGreaterThan(1000);
    // 验证是数字代码
    expect(codeList[0]).toMatch(/^\d+$/);
  });

  it('should return codes that work with getHKQuotes', async () => {
    const codeList = await sdk.getHKCodeList();
    // 使用代码列表中的前 3 个代码测试
    const testCodes = codeList.slice(0, 3);
    const quotes = await sdk.getHKQuotes(testCodes);
    // 验证返回数据
    expect(quotes.length).toBeGreaterThan(0);
    if (quotes.length > 0) {
      const q = quotes[0];
      expect(q).toHaveProperty('code');
      expect(q).toHaveProperty('name');
      expect(q).toHaveProperty('price');
      expect(q).toHaveProperty('currency');
      expect(typeof q.price).toBe('number');
    }
  });
});

describe('getUSCodeList codes work with getUSQuotes', () => {
  it('should return codes that work with getUSQuotes', async () => {
    const codeList = await sdk.getUSCodeList(false);
    // 使用代码列表中的前 5 个代码测试（有些股票可能没有数据）
    const testCodes = codeList.slice(0, 5);
    const quotes = await sdk.getUSQuotes(testCodes);
    // 验证返回数据
    expect(quotes.length).toBeGreaterThan(0);
    if (quotes.length > 0) {
      const q = quotes[0];
      expect(q).toHaveProperty('code');
      expect(q).toHaveProperty('name');
      expect(q).toHaveProperty('price');
      expect(q).toHaveProperty('prevClose');
      expect(q).toHaveProperty('totalMarketCap');
      expect(typeof q.price).toBe('number');
    }
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

describe('getHKHistoryKline', () => {
  it('should return 港股日K线数据', async () => {
    const res = await sdk.getHKHistoryKline('00700', {
      startDate: '20241201',
      endDate: '20241220',
    });
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.code).toBe('00700');
    expect(k.name).toContain('腾讯');
    expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof k.open).toBe('number');
    expect(typeof k.close).toBe('number');
  });

  it('should return 港股周K线数据', async () => {
    const res = await sdk.getHKHistoryKline('09988', {
      period: 'weekly',
      startDate: '20241101',
      endDate: '20241231',
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].code).toBe('09988');
  });

  it('should support different adjust types', async () => {
    const [hfq, qfq, noAdj] = await Promise.all([
      sdk.getHKHistoryKline('00700', { adjust: 'hfq', startDate: '20241201', endDate: '20241220' }),
      sdk.getHKHistoryKline('00700', { adjust: 'qfq', startDate: '20241201', endDate: '20241220' }),
      sdk.getHKHistoryKline('00700', { adjust: '', startDate: '20241201', endDate: '20241220' }),
    ]);
    expect(hfq.length).toBeGreaterThan(0);
    expect(qfq.length).toBeGreaterThan(0);
    expect(noAdj.length).toBeGreaterThan(0);
  });
});

describe('getUSHistoryKline', () => {
  it('should return 美股日K线数据 (纳斯达克)', async () => {
    const res = await sdk.getUSHistoryKline('105.MSFT', {
      startDate: '20241201',
      endDate: '20241220',
    });
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.code).toBe('MSFT');
    expect(k.name).toContain('微软');
    expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof k.open).toBe('number');
    expect(typeof k.close).toBe('number');
  });

  it('should return 美股周K线数据 (纽交所)', async () => {
    const res = await sdk.getUSHistoryKline('106.BABA', {
      period: 'weekly',
      startDate: '20241101',
      endDate: '20241231',
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].code).toBe('BABA');
  });

  it('should support different adjust types', async () => {
    const [hfq, qfq, noAdj] = await Promise.all([
      sdk.getUSHistoryKline('105.AAPL', { adjust: 'hfq', startDate: '20241201', endDate: '20241220' }),
      sdk.getUSHistoryKline('105.AAPL', { adjust: 'qfq', startDate: '20241201', endDate: '20241220' }),
      sdk.getUSHistoryKline('105.AAPL', { adjust: '', startDate: '20241201', endDate: '20241220' }),
    ]);
    expect(hfq.length).toBeGreaterThan(0);
    expect(qfq.length).toBeGreaterThan(0);
    expect(noAdj.length).toBeGreaterThan(0);
  });

  it('should return 美股月K线数据', async () => {
    const res = await sdk.getUSHistoryKline('105.TSLA', {
      period: 'monthly',
      startDate: '20240101',
      endDate: '20241231',
    });
    expect(res.length).toBeGreaterThan(0);
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

    it('should throw for invalid chunk size', () => {
      expect(() => chunkArray([1, 2], 0)).toThrow(/chunkSize/i);
      expect(() => chunkArray([1, 2], -1)).toThrow(/chunkSize/i);
      expect(() => chunkArray([1, 2], 1.5)).toThrow(/chunkSize/i);
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

    it('should throw for invalid concurrency', async () => {
      await expect(asyncPool([async () => 1], 0)).rejects.toThrow(/concurrency/i);
      await expect(asyncPool([async () => 1], -1)).rejects.toThrow(/concurrency/i);
    });

    it('should handle high concurrency with many fast tasks', async () => {
      // 测试当并发数很高时，已完成的任务会被正确清理
      const tasks = Array.from({ length: 20 }, (_, i) => async () => {
        // 使用固定的延迟确保顺序
        await new Promise(resolve => setTimeout(resolve, 1));
        return i;
      });
      const output = await asyncPool(tasks, 5);
      expect(output.length).toBe(20);
      // 验证所有结果都存在（不验证顺序，因为并发执行顺序不确定）
      expect(output.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    });
  });

  describe('getMarketCode', () => {
    it('should return 1 for Shanghai stocks', () => {
      expect(getMarketCode('sh600519')).toBe('1');
      expect(getMarketCode('600519')).toBe('1');
      expect(getMarketCode('688001')).toBe('1');
    });

    it('should return 0 for Shenzhen stocks', () => {
      expect(getMarketCode('sz000001')).toBe('0');
      expect(getMarketCode('000001')).toBe('0');
      expect(getMarketCode('300001')).toBe('0');
    });

    it('should return 0 for Beijing stocks', () => {
      expect(getMarketCode('bj430047')).toBe('0');
      expect(getMarketCode('430047')).toBe('0');
    });
  });

  describe('getPeriodCode', () => {
    it('should return correct period codes', () => {
      expect(getPeriodCode('daily')).toBe('101');
      expect(getPeriodCode('weekly')).toBe('102');
      expect(getPeriodCode('monthly')).toBe('103');
    });
  });

  describe('getAdjustCode', () => {
    it('should return correct adjust codes', () => {
      expect(getAdjustCode('')).toBe('0');
      expect(getAdjustCode('qfq')).toBe('1');
      expect(getAdjustCode('hfq')).toBe('2');
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

  describe('getAllHKShareQuotes', () => {
    it('should return 港股全量行情 with correct HKQuote structure', async () => {
      const customSdk = new StockSDK();
      const res = await customSdk.getAllHKShareQuotes({
        batchSize: 50,
        concurrency: 2,
      });
      expect(res.length).toBeGreaterThan(0);
      
      // 验证每条数据都符合 HKQuote 结构
      const sample = res[0];
      expect(sample).toHaveProperty('marketId');
      expect(sample).toHaveProperty('name');
      expect(sample).toHaveProperty('code');
      expect(sample).toHaveProperty('price');
      expect(sample).toHaveProperty('prevClose');
      expect(sample).toHaveProperty('open');
      expect(sample).toHaveProperty('volume');
      expect(sample).toHaveProperty('time');
      expect(sample).toHaveProperty('change');
      expect(sample).toHaveProperty('changePercent');
      expect(sample).toHaveProperty('high');
      expect(sample).toHaveProperty('low');
      expect(sample).toHaveProperty('amount');
      expect(sample).toHaveProperty('currency');
      expect(sample).toHaveProperty('raw');
      
      // 验证价格是数字
      expect(typeof sample.price).toBe('number');
      expect(typeof sample.changePercent).toBe('number');
    }, 60000);
  });

  describe('getAllUSShareQuotes', () => {
    it('should return 美股全量行情 with correct USQuote structure', async () => {
      const customSdk = new StockSDK();
      const res = await customSdk.getAllUSShareQuotes({
        batchSize: 50,
        concurrency: 2,
      });
      expect(res.length).toBeGreaterThan(0);
      
      // 验证每条数据都符合 USQuote 结构
      const sample = res[0];
      expect(sample).toHaveProperty('marketId');
      expect(sample).toHaveProperty('name');
      expect(sample).toHaveProperty('code');
      expect(sample).toHaveProperty('price');
      expect(sample).toHaveProperty('prevClose');
      expect(sample).toHaveProperty('open');
      expect(sample).toHaveProperty('high');
      expect(sample).toHaveProperty('low');
      expect(sample).toHaveProperty('change');
      expect(sample).toHaveProperty('changePercent');
      expect(sample).toHaveProperty('volume');
      expect(sample).toHaveProperty('amount');
      expect(sample).toHaveProperty('totalMarketCap');
      expect(sample).toHaveProperty('raw');
      
      // 验证价格是数字
      expect(typeof sample.price).toBe('number');
      expect(typeof sample.changePercent).toBe('number');
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

// ============ 参数校验测试 ============
describe('参数校验', () => {
  it('getHistoryKline should throw for invalid period', async () => {
    await expect(
      sdk.getHistoryKline('000001', { period: 'yearly' as any })
    ).rejects.toThrow(/period/i);
  });

  it('getHistoryKline should throw for invalid adjust', async () => {
    await expect(
      sdk.getHistoryKline('000001', { adjust: 'bad' as any })
    ).rejects.toThrow(/adjust/i);
  });

  it('getMinuteKline should throw for invalid period', async () => {
    await expect(
      sdk.getMinuteKline('000001', { period: '2' as any })
    ).rejects.toThrow(/period/i);
  });

  it('getMinuteKline should throw for invalid adjust', async () => {
    await expect(
      sdk.getMinuteKline('000001', { period: '5', adjust: 'bad' as any })
    ).rejects.toThrow(/adjust/i);
  });

  it('getAllQuotesByCodes should throw for invalid batch options', async () => {
    await expect(
      sdk.getAllQuotesByCodes(['sz000858'], { batchSize: 0 as any })
    ).rejects.toThrow(/batchSize/i);
    await expect(
      sdk.getAllQuotesByCodes(['sz000858'], { concurrency: 0 as any })
    ).rejects.toThrow(/concurrency/i);
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

  describe('getKlineWithIndicators', () => {
    it('should return kline with MA indicators', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          ma: { periods: [5, 10, 20] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].ma).toBeDefined();
      expect(res[res.length - 1].ma?.ma5).toBeDefined();
    });

    it('should return kline with MACD indicators', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          macd: true,
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].macd).toBeDefined();
      expect(res[res.length - 1].macd?.dif).toBeDefined();
    });

    it('should return kline with BOLL indicators', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          boll: true,
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].boll).toBeDefined();
    });

    it('should return kline with KDJ indicators', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          kdj: true,
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].kdj).toBeDefined();
    });

    it('should return kline with multiple indicators', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          ma: { periods: [5, 10] },
          macd: true,
          boll: true,
          kdj: true,
          rsi: true,
          wr: true,
          bias: true,
          cci: true,
          atr: true,
        },
      });
      expect(res.length).toBeGreaterThan(0);
      const last = res[res.length - 1];
      expect(last.ma).toBeDefined();
      expect(last.macd).toBeDefined();
      expect(last.boll).toBeDefined();
      expect(last.kdj).toBeDefined();
      expect(last.rsi).toBeDefined();
      expect(last.wr).toBeDefined();
      expect(last.bias).toBeDefined();
      expect(last.cci).toBeDefined();
      expect(last.atr).toBeDefined();
    });

    it('should return kline with BIAS indicators', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          bias: { periods: [6, 12, 24] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].bias).toBeDefined();
      expect(res[res.length - 1].bias?.bias6).toBeDefined();
    });

    it('should return kline with CCI indicator', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          cci: { period: 14 },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].cci).toBeDefined();
      expect(res[res.length - 1].cci?.cci).toBeDefined();
    });

    it('should return kline with ATR indicator', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          atr: { period: 14 },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[res.length - 1].atr).toBeDefined();
      expect(res[res.length - 1].atr?.atr).toBeDefined();
      expect(res[res.length - 1].atr?.tr).toBeDefined();
    });

    it('should auto detect HK market', async () => {
      const res = await sdk.getKlineWithIndicators('00700', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          ma: { periods: [5] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].ma).toBeDefined();
    });

    it('should auto detect US market', async () => {
      const res = await sdk.getKlineWithIndicators('105.MSFT', {
        startDate: '20241201',
        endDate: '20241220',
        indicators: {
          ma: { periods: [5] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].ma).toBeDefined();
    });

    it('should work without startDate (return all available data)', async () => {
      const res = await sdk.getKlineWithIndicators('sz000001', {
        indicators: {
          ma: { periods: [5] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].ma).toBeDefined();
    });

    it('should work for HK market without startDate', async () => {
      const res = await sdk.getKlineWithIndicators('00700', {
        indicators: {
          ma: { periods: [5] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].ma).toBeDefined();
    });

    it('should work for US market without startDate', async () => {
      const res = await sdk.getKlineWithIndicators('105.MSFT', {
        indicators: {
          ma: { periods: [5] },
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].ma).toBeDefined();
    });
  });
});

// 技术指标独立计算函数测试
describe('Technical Indicators', () => {
  describe('calcSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sma = calcSMA(data, 3);
      expect(sma[0]).toBeNull();
      expect(sma[1]).toBeNull();
      expect(sma[2]).toBe(2); // (1+2+3)/3
      expect(sma[3]).toBe(3); // (2+3+4)/3
      expect(sma[9]).toBe(9); // (8+9+10)/3
    });

    it('should handle null values', () => {
      const data = [1, 2, null, 4, 5];
      const sma = calcSMA(data, 3);
      expect(sma[2]).toBeNull(); // null in window
    });
  });

  describe('calcEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const ema = calcEMA(data, 3);
      expect(ema[0]).toBeNull();
      expect(ema[1]).toBeNull();
      expect(ema[2]).toBe(11); // SMA 初始化: (10+11+12)/3 = 11
      expect(ema[3]).not.toBeNull();
    });
  });

  describe('calcWMA', () => {
    it('should calculate weighted moving average correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const wma = calcWMA(data, 3);
      expect(wma[0]).toBeNull();
      expect(wma[1]).toBeNull();
      // WMA = (1*1 + 2*2 + 3*3) / (1+2+3) = (1+4+9)/6 = 14/6 = 2.33
      expect(wma[2]).toBeCloseTo(2.33, 1);
    });
  });

  describe('calcMA', () => {
    it('should calculate multiple periods', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const ma = calcMA(data, { periods: [3, 5] });
      expect(ma.length).toBe(10);
      expect(ma[2].ma3).toBe(2);
      expect(ma[4].ma5).toBe(3);
    });

    it('should support ema type', () => {
      const data = [10, 11, 12, 13, 14];
      const ma = calcMA(data, { periods: [3], type: 'ema' });
      expect(ma[2].ma3).toBe(11); // SMA 初始化
    });
  });

  describe('calcMACD', () => {
    it('should calculate MACD correctly', () => {
      // 生成足够长的测试数据
      const data = Array.from({ length: 50 }, (_, i) => 100 + i);
      const macd = calcMACD(data, { short: 12, long: 26, signal: 9 });
      expect(macd.length).toBe(50);
      // 前 25 天应该是 null（长期 EMA 需要 26 天）
      expect(macd[0].dif).toBeNull();
      // 后面应该有值
      expect(macd[49].dif).not.toBeNull();
      expect(macd[49].dea).not.toBeNull();
      expect(macd[49].macd).not.toBeNull();
    });
  });

  describe('calcBOLL', () => {
    it('should calculate BOLL correctly', () => {
      const data = Array.from({ length: 30 }, (_, i) => 100 + (i % 5) - 2);
      const boll = calcBOLL(data, { period: 20, stdDev: 2 });
      expect(boll.length).toBe(30);
      expect(boll[19].mid).not.toBeNull();
      expect(boll[19].upper).not.toBeNull();
      expect(boll[19].lower).not.toBeNull();
      expect(boll[19].upper!).toBeGreaterThan(boll[19].mid!);
      expect(boll[19].lower!).toBeLessThan(boll[19].mid!);
    });
  });

  describe('calcKDJ', () => {
    it('should calculate KDJ correctly', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
      }));
      const kdj = calcKDJ(data, { period: 9 });
      expect(kdj.length).toBe(20);
      expect(kdj[8].k).not.toBeNull();
      expect(kdj[8].d).not.toBeNull();
      expect(kdj[8].j).not.toBeNull();
    });

    it('should handle null values in data', () => {
      const data = [
        { high: 110, low: 90, close: 100 },
        { high: null, low: 95, close: 102 },  // null high
        { high: 115, low: null, close: 105 }, // null low
        { high: 120, low: 100, close: null }, // null close
        { high: 125, low: 105, close: 115 },
        { high: 130, low: 110, close: 120 },
        { high: 135, low: 115, close: 125 },
        { high: 140, low: 120, close: 130 },
        { high: 145, low: 125, close: 135 },
        { high: 150, low: 130, close: 140 },
      ];
      const kdj = calcKDJ(data, { period: 5 });
      expect(kdj.length).toBe(10);
      // 包含 null 的数据段应该返回 null
      expect(kdj[4].k).toBeNull();
    });

    it('should handle high equals low (division by zero)', () => {
      const data = Array.from({ length: 10 }, () => ({
        high: 100, // 高=低
        low: 100,
        close: 100,
      }));
      const kdj = calcKDJ(data, { period: 5 });
      expect(kdj.length).toBe(10);
      expect(kdj[4].k).toBeNull(); // 高=低时返回 null
    });
  });

  describe('calcRSI', () => {
    it('should calculate RSI correctly', () => {
      // 上涨趋势
      const upData = Array.from({ length: 20 }, (_, i) => 100 + i);
      const rsiUp = calcRSI(upData, { periods: [6] });
      expect(rsiUp[6].rsi6).toBe(100); // 全部上涨

      // 下跌趋势
      const downData = Array.from({ length: 20 }, (_, i) => 100 - i);
      const rsiDown = calcRSI(downData, { periods: [6] });
      expect(rsiDown[6].rsi6).toBe(0); // 全部下跌
    });
  });

  describe('calcWR', () => {
    it('should calculate WR correctly', () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        open: 100,
        high: 110,
        low: 90,
        close: 100 + (i % 3) * 5 - 5, // 95, 100, 105 循环
      }));
      const wr = calcWR(data, { periods: [6] });
      expect(wr.length).toBe(15);
      expect(wr[5].wr6).not.toBeNull();
    });

    it('should handle null values in data', () => {
      const data = [
        { high: 110, low: 90, close: 100 },
        { high: null, low: 95, close: 102 },  // null high
        { high: 115, low: null, close: 105 }, // null low
        { high: 120, low: 100, close: null }, // null close
        { high: 125, low: 105, close: 115 },
        { high: 130, low: 110, close: 120 },
        { high: 135, low: 115, close: 125 },
        { high: 140, low: 120, close: 130 },
        { high: 145, low: 125, close: 135 },
        { high: 150, low: 130, close: 140 },
      ];
      const wr = calcWR(data, { periods: [5] });
      expect(wr.length).toBe(10);
      expect(wr[4].wr5).toBeNull();
    });

    it('should handle high equals low', () => {
      const data = Array.from({ length: 10 }, () => ({
        high: 100,
        low: 100,
        close: 100,
      }));
      const wr = calcWR(data, { periods: [5] });
      expect(wr.length).toBe(10);
      expect(wr[4].wr5).toBeNull();
    });
  });

  describe('calcBIAS', () => {
    it('should calculate BIAS correctly', () => {
      const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const bias = calcBIAS(data, { periods: [6] });
      expect(bias.length).toBe(11);
      // 前 5 个应该是 null
      expect(bias[4].bias6).toBeNull();
      // 第 6 个应该有值
      expect(bias[5].bias6).not.toBeNull();
      // 验证计算公式: BIAS = (close - MA) / MA * 100
      const ma6 = (10 + 11 + 12 + 13 + 14 + 15) / 6; // 12.5
      const expectedBias = ((15 - ma6) / ma6) * 100; // 20
      expect(bias[5].bias6).toBeCloseTo(expectedBias, 2);
    });

    it('should calculate multiple BIAS periods', () => {
      const data = Array.from({ length: 30 }, (_, i) => 100 + i);
      const bias = calcBIAS(data, { periods: [6, 12, 24] });
      expect(bias.length).toBe(30);
      expect(bias[29].bias6).not.toBeNull();
      expect(bias[29].bias12).not.toBeNull();
      expect(bias[29].bias24).not.toBeNull();
    });
  });

  describe('calcCCI', () => {
    it('should calculate CCI correctly', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i,
        high: 110 + i,
        low: 90 + i,
        close: 100 + i,
        volume: 1000,
      }));
      const cci = calcCCI(data, { period: 14 });
      expect(cci.length).toBe(20);
      // 前 13 个应该是 null
      expect(cci[12].cci).toBeNull();
      // 第 14 个应该有值
      expect(cci[13].cci).not.toBeNull();
    });

    it('should handle steady trend', () => {
      // 稳定上涨趋势，CCI 应该为正
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i * 2,
        high: 110 + i * 2,
        low: 90 + i * 2,
        close: 100 + i * 2,
        volume: 1000,
      }));
      const cci = calcCCI(data, { period: 14 });
      expect(cci[19].cci).toBeGreaterThan(0);
    });

    it('should handle null values in data', () => {
      const data = [
        { high: 110, low: 90, close: 100 },
        { high: null, low: 95, close: 102 },  // null high
        { high: 115, low: null, close: 105 }, // null low
        { high: 120, low: 100, close: null }, // null close
        { high: 125, low: 105, close: 115 },
        { high: 130, low: 110, close: 120 },
      ];
      const cci = calcCCI(data, { period: 3 });
      expect(cci.length).toBe(6);
    });

    it('should handle zero mean deviation (flat prices)', () => {
      // 所有价格相同，平均偏差为 0
      const data = Array.from({ length: 20 }, () => ({
        high: 100,
        low: 100,
        close: 100,
      }));
      const cci = calcCCI(data, { period: 5 });
      expect(cci.length).toBe(20);
      // 平均偏差为 0 时 CCI 返回 0
      expect(cci[10].cci).toBe(0);
    });
  });

  describe('calcATR', () => {
    it('should calculate ATR correctly', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i,
        high: 110 + i,
        low: 90 + i,
        close: 100 + i,
        volume: 1000,
      }));
      const atr = calcATR(data, { period: 14 });
      expect(atr.length).toBe(20);
      // 前 13 个应该是 null
      expect(atr[12].atr).toBeNull();
      // 第 14 个应该有值
      expect(atr[13].atr).not.toBeNull();
      // TR 应该总是有值（第一个除外）
      expect(atr[1].tr).not.toBeNull();
    });

    it('should calculate TR correctly', () => {
      const data = [
        { open: 100, high: 110, low: 90, close: 100, volume: 1000 },
        { open: 105, high: 115, low: 95, close: 105, volume: 1000 },
      ];
      const atr = calcATR(data, { period: 14 });
      // TR = max(high - low, |high - prevClose|, |low - prevClose|)
      // TR[1] = max(115 - 95, |115 - 100|, |95 - 100|) = max(20, 15, 5) = 20
      expect(atr[1].tr).toBe(20);
    });

    it('should handle null values in data', () => {
      const data = [
        { high: 110, low: 90, close: 100 },
        { high: null, low: 95, close: 102 },  // null high
        { high: 115, low: null, close: 105 }, // null low
        { high: 120, low: 100, close: null }, // null close
        { high: 125, low: 105, close: 115 },
        { high: 130, low: 110, close: 120 },
      ];
      const atr = calcATR(data, { period: 3 });
      expect(atr.length).toBe(6);
      // 含有 null 的位置 TR 应该是 null
      expect(atr[1].tr).toBeNull();
      expect(atr[2].tr).toBeNull();
      expect(atr[3].tr).toBeNull();
    });
  });

  describe('addIndicators', () => {
    it('should add indicators to kline data', () => {
      const klines = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        code: '000001',
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
        amount: 100000,
        amplitude: 10,
        changePercent: 1,
        change: 1,
        turnoverRate: 1,
      }));
      
      const result = addIndicators(klines, {
        ma: { periods: [5, 10] },
        macd: true,
      });
      
      expect(result.length).toBe(30);
      expect(result[10].ma).toBeDefined();
      expect(result[10].macd).toBeDefined();
    });

    it('should handle empty array', () => {
      const result = addIndicators([], { ma: true });
      expect(result).toEqual([]);
    });
  });
});

// ============ 行业板块测试 ============
describe('行业板块', () => {
  describe('getIndustryList', () => {
    it('should return 行业板块名称列表', async () => {
      const res = await sdk.getIndustryList();
      expect(res.length).toBeGreaterThan(0);
      const board = res[0];
      expect(board).toHaveProperty('rank');
      expect(board).toHaveProperty('name');
      expect(board).toHaveProperty('code');
      expect(board).toHaveProperty('price');
      expect(board).toHaveProperty('changePercent');
      expect(board.code).toMatch(/^BK\d+$/);
      expect(typeof board.name).toBe('string');
    });

    it('should return boards sorted by changePercent', async () => {
      const res = await sdk.getIndustryList();
      expect(res.length).toBeGreaterThan(1);
      // 验证按涨跌幅降序排列
      for (let i = 0; i < res.length - 1; i++) {
        const curr = res[i].changePercent ?? 0;
        const next = res[i + 1].changePercent ?? 0;
        expect(curr).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getIndustrySpot', () => {
    it('should return 行业板块实时行情 by name', async () => {
      const res = await sdk.getIndustrySpot('互联网服务');
      expect(res.length).toBeGreaterThan(0);
      const items = res.map((r) => r.item);
      expect(items).toContain('最新');
      expect(items).toContain('涨跌幅');
      expect(items).toContain('成交量');
    });

    it('should return 行业板块实时行情 by code', async () => {
      const res = await sdk.getIndustrySpot('BK0447');
      expect(res.length).toBeGreaterThan(0);
      expect(res.find((r) => r.item === '最新')).toBeDefined();
    });
  });

  describe('getIndustryConstituents', () => {
    it('should return 行业板块成分股 by name', async () => {
      const res = await sdk.getIndustryConstituents('互联网服务');
      expect(res.length).toBeGreaterThan(0);
      const stock = res[0];
      expect(stock).toHaveProperty('rank');
      expect(stock).toHaveProperty('code');
      expect(stock).toHaveProperty('name');
      expect(stock).toHaveProperty('price');
      expect(stock).toHaveProperty('changePercent');
      expect(stock).toHaveProperty('pe');
      expect(stock).toHaveProperty('pb');
    });

    it('should return 行业板块成分股 by code', async () => {
      const res = await sdk.getIndustryConstituents('BK0447');
      expect(res.length).toBeGreaterThan(0);
      expect(typeof res[0].code).toBe('string');
    });
  });

  describe('getIndustryKline', () => {
    it('should return 行业板块日K线', async () => {
      const res = await sdk.getIndustryKline('互联网服务', {
        startDate: '20241201',
        endDate: '20241220',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('date');
      expect(k).toHaveProperty('open');
      expect(k).toHaveProperty('close');
      expect(k).toHaveProperty('high');
      expect(k).toHaveProperty('low');
      expect(k).toHaveProperty('volume');
      expect(k).toHaveProperty('changePercent');
      expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return 行业板块周K线', async () => {
      const res = await sdk.getIndustryKline('BK0447', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 行业板块月K线', async () => {
      const res = await sdk.getIndustryKline('互联网服务', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('getIndustryMinuteKline', () => {
    it('should return 行业板块1分钟分时数据', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '1',
      });
      expect(res.length).toBeGreaterThan(0);
      const t = res[0];
      expect(t).toHaveProperty('time');
      expect(t).toHaveProperty('open');
      expect(t).toHaveProperty('close');
      expect(t).toHaveProperty('volume');
      // 1 分钟数据有 price 字段
      expect('price' in t).toBe(true);
    });

    it('should return 行业板块5分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('BK0447', {
        period: '5',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('time');
      // 5 分钟 K 线有 changePercent 字段
      expect('changePercent' in k).toBe(true);
    });

    it('should return 行业板块15分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '15',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 行业板块30分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '30',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 行业板块60分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '60',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('should throw error for invalid board name', async () => {
      await expect(
        sdk.getIndustrySpot('不存在的板块名称')
      ).rejects.toThrow(/未找到行业板块/);
    });
  });
});

// ============ 概念板块测试 ============
describe('概念板块', () => {
  describe('getConceptList', () => {
    it('should return 概念板块名称列表', async () => {
      const res = await sdk.getConceptList();
      expect(res.length).toBeGreaterThan(0);
      const board = res[0];
      expect(board).toHaveProperty('rank');
      expect(board).toHaveProperty('name');
      expect(board).toHaveProperty('code');
      expect(board).toHaveProperty('price');
      expect(board).toHaveProperty('changePercent');
      expect(board.code).toMatch(/^BK\d+$/);
      expect(typeof board.name).toBe('string');
    });

    it('should return boards sorted by changePercent', async () => {
      const res = await sdk.getConceptList();
      expect(res.length).toBeGreaterThan(1);
      // 验证按涨跌幅降序排列
      for (let i = 0; i < res.length - 1; i++) {
        const curr = res[i].changePercent ?? 0;
        const next = res[i + 1].changePercent ?? 0;
        expect(curr).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getConceptSpot', () => {
    it('should return 概念板块实时行情 by name', async () => {
      const res = await sdk.getConceptSpot('人工智能');
      expect(res.length).toBeGreaterThan(0);
      const items = res.map((r) => r.item);
      expect(items).toContain('最新');
      expect(items).toContain('涨跌幅');
      expect(items).toContain('成交量');
    });

    it('should return 概念板块实时行情 by code', async () => {
      const res = await sdk.getConceptSpot('BK0800');
      expect(res.length).toBeGreaterThan(0);
      expect(res.find((r) => r.item === '最新')).toBeDefined();
    });
  });

  describe('getConceptConstituents', () => {
    it('should return 概念板块成分股 by name', async () => {
      const res = await sdk.getConceptConstituents('人工智能');
      expect(res.length).toBeGreaterThan(0);
      const stock = res[0];
      expect(stock).toHaveProperty('rank');
      expect(stock).toHaveProperty('code');
      expect(stock).toHaveProperty('name');
      expect(stock).toHaveProperty('price');
      expect(stock).toHaveProperty('changePercent');
      expect(stock).toHaveProperty('pe');
      expect(stock).toHaveProperty('pb');
    });

    it('should return 概念板块成分股 by code', async () => {
      const res = await sdk.getConceptConstituents('BK0800');
      expect(res.length).toBeGreaterThan(0);
      expect(typeof res[0].code).toBe('string');
    });
  });

  describe('getConceptKline', () => {
    it('should return 概念板块日K线', async () => {
      const res = await sdk.getConceptKline('人工智能', {
        startDate: '20241201',
        endDate: '20241220',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('date');
      expect(k).toHaveProperty('open');
      expect(k).toHaveProperty('close');
      expect(k).toHaveProperty('high');
      expect(k).toHaveProperty('low');
      expect(k).toHaveProperty('volume');
      expect(k).toHaveProperty('changePercent');
      expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return 概念板块周K线', async () => {
      const res = await sdk.getConceptKline('BK0800', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 概念板块月K线', async () => {
      const res = await sdk.getConceptKline('人工智能', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('getConceptMinuteKline', () => {
    it('should return 概念板块1分钟分时数据', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '1',
      });
      expect(res.length).toBeGreaterThan(0);
      const t = res[0];
      expect(t).toHaveProperty('time');
      expect(t).toHaveProperty('open');
      expect(t).toHaveProperty('close');
      expect(t).toHaveProperty('volume');
      // 1 分钟数据有 price 字段
      expect('price' in t).toBe(true);
    });

    it('should return 概念板块5分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('BK0800', {
        period: '5',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('time');
      // 5 分钟 K 线有 changePercent 字段
      expect('changePercent' in k).toBe(true);
    });

    it('should return 概念板块15分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '15',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 概念板块30分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '30',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 概念板块60分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '60',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('should throw error for invalid concept board name', async () => {
      await expect(
        sdk.getConceptSpot('不存在的概念板块')
      ).rejects.toThrow(/未找到概念板块/);
    });
  });
});

// ==================== 扩展数据 ====================

describe('扩展数据', () => {
  describe('getTradingCalendar', () => {
    it('should return A股交易日历', async () => {
      const res = await sdk.getTradingCalendar();
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
      // 验证日期格式 YYYY-MM-DD
      expect(res[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // 验证包含已知的历史交易日
      expect(res).toContain('1990-12-19'); // 上证所开业日
      expect(res).toContain('2024-01-02'); // 2024年第一个交易日
    });

    it('should return dates in chronological order', async () => {
      const res = await sdk.getTradingCalendar();
      // 检查前几个日期是按时间顺序排列的
      for (let i = 1; i < Math.min(10, res.length); i++) {
        expect(new Date(res[i]).getTime()).toBeGreaterThan(
          new Date(res[i - 1]).getTime()
        );
      }
    });
  });
});
