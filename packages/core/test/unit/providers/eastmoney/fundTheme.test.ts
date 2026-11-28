/**
 * Unit tests for eastmoney theme fund provider
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestClient } from '../../../../src/core/request';
import {
  getThemeList,
  getHotThemes,
  getThemeFunds,
} from '../../../../src/providers/eastmoney/fundTheme';

describe('eastmoney/fundTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createClientWithMock(responseBody: Record<string, unknown>): {
    client: RequestClient;
    lastUrl: { value: string | undefined };
  } {
    const lastUrl = { value: undefined };

    const client = new RequestClient({
      retry: { maxRetries: 0 },
      fetchImpl: vi.fn(async (input: RequestInfo) => {
        lastUrl.value = String(input);
        return new Response(
          JSON.stringify(responseBody),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }),
    });

    return { client, lastUrl };
  }

  describe('getThemeList', () => {
    it('should return theme list with default parameters', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [
          {
            code: 'BK0438',
            name: '食品饮料',
            ZDF: '1.23',
            SYL_W: '2.45',
            SYL_M: '3.67',
            SYL_3M: '5.89',
            SYL_6M: '8.12',
            SYL_Y: '15.34',
            SYL_3Y: '45.67',
            SYL_5Y: '89.01',
            isIndustry: 1,
          },
          {
            code: 'BK0474',
            name: '保险Ⅱ',
            ZDF: '-0.56',
            SYL_W: '1.23',
            SYL_M: '2.34',
            SYL_3M: '3.45',
            SYL_6M: '4.56',
            SYL_Y: '6.78',
            SYL_3Y: '12.34',
            SYL_5Y: '23.45',
            isIndustry: 1,
          },
        ],
        pageinfo: {
          totalPages: 3,
          pageSize: 20,
          page: 1,
        },
      });

      const result = await getThemeList(client);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].code).toBe('BK0438');
      expect(result.items[0].name).toBe('食品饮料');
      expect(result.items[0].dailyChange).toBe(1.23);
      expect(result.items[0].weeklyReturn).toBe(2.45);
      expect(result.items[0].type).toBe('行业');
      expect(result.totalPages).toBe(3);
      expect(result.pageSize).toBe(20);
      expect(result.currentPage).toBe(1);
      expect(lastUrl.value).toContain('FundMNSubjectList');
    });

    it('should respect custom sort and order parameters', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [],
        pageinfo: { totalPages: 1, pageSize: 20, page: 1 },
      });

      await getThemeList(client, {
        sort: 'SYL_Y',
        order: 'asc',
        category: '0',
        pageSize: 30,
        page: 2,
      });

      const url = lastUrl.value!;
      expect(url).toContain('RankItems=SYL_Y');
      expect(url).toContain('RankVectors=asc');
      expect(url).toContain('category=0');
      expect(url).toContain('pageSize=30');
      expect(url).toContain('page=2');
    });

    it('should handle empty data gracefully', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [],
        pageinfo: { totalPages: 0, pageSize: 0, page: 1 },
      });

      const result = await getThemeList(client);

      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle missing fields gracefully', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [
          {
            code: 'BK9999',
            name: '测试主题',
            isIndustry: 0,
          },
        ],
        pageinfo: { totalPages: 1, pageSize: 20, page: 1 },
      });

      const result = await getThemeList(client);

      expect(result.items[0].code).toBe('BK9999');
      expect(result.items[0].dailyChange).toBeNull();
      expect(result.items[0].type).toBe('概念');
    });

    it('should classify isIndustry=0 as 概念', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [
          {
            code: 'BK1234',
            name: '人工智能',
            ZDF: '0',
            isIndustry: 0,
          },
        ],
        pageinfo: { totalPages: 1, pageSize: 20, page: 1 },
      });

      const result = await getThemeList(client);
      expect(result.items[0].type).toBe('概念');
    });
  });

  describe('getHotThemes', () => {
    it('should return hot themes array', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [
          {
            code: 'BK0438',
            name: '食品饮料',
            ZDF: '1.23',
            SYL_W: '2.45',
            SYL_M: '3.67',
            SYL_3M: '5.89',
            SYL_6M: '8.12',
            SYL_Y: '15.34',
            SYL_3Y: '45.67',
            SYL_5Y: '89.01',
            isIndustry: 1,
          },
        ],
      });

      const result = await getHotThemes(client);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('BK0438');
      expect(result[0].name).toBe('食品饮料');
      expect(result[0].dailyChange).toBe(1.23);
    });

    it('should handle empty response', async () => {
      const { client, lastUrl } = createClientWithMock({ Data: [] });

      const result = await getHotThemes(client);

      expect(result).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const { client, lastUrl } = createClientWithMock({ Data: [] });

      await getHotThemes(client, { limit: 50 });

      expect(lastUrl.value).toContain('limit=50');
    });
  });

  describe('getThemeFunds', () => {
    it('should return funds filtered by theme code', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [
          {
            fscode: '000001',
            abname: '测试基金A',
            ftype: '股票型',
            ZDF: '2.34',
            SYL_Z: '5.67',
            SYL_Y: '8.90',
            SYL_3Y: '15.23',
            SYL_1N: '25.67',
            dwjz: '1.2345',
          },
        ],
        fundinfo: {
          total: 150,
          pagesize: 20,
          pageindex: 1,
        },
      });

      const result = await getThemeFunds(client, 'BK0438');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe('000001');
      expect(result.items[0].name).toBe('测试基金A');
      expect(result.items[0].fundType).toBe('股票型');
      expect(result.items[0].dailyChange).toBe(2.34);
      expect(result.items[0].weeklyReturn).toBe(5.67);
      expect(result.items[0].nav).toBe(1.2345);
      expect(result.items[0].themeCode).toBe('BK0438');
      expect(result.total).toBe(150);
      expect(result.pageIndex).toBe(1);
    });

    it('should respect pagination parameters', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [],
        fundinfo: { total: 0, pagesize: 30, pageindex: 2 },
      });

      await getThemeFunds(client, 'BK0438', {
        page: 2,
        pageSize: 30,
        sortColumn: 'SYL_Y',
        sort: 'asc',
        fundType: '混合型',
      });

      const url = lastUrl.value!;
      expect(url).toContain('TOPICAL=BK0438');
      expect(url).toContain('pageIndex=2');
      expect(url).toContain('pageSize=30');
      expect(url).toContain('SortColumn=SYL_Y');
      expect(url).toContain('Sort=asc');
      expect(url).toContain('FundType=%E6%B7%B7%E5%90%88%E5%9E%8B'); // URL encoded
    });

    it('should handle empty data gracefully', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [],
        fundinfo: { total: 0, pagesize: 0, pageindex: 1 },
      });

      const result = await getThemeFunds(client, 'BK0438');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle missing fields gracefully', async () => {
      const { client, lastUrl } = createClientWithMock({
        Data: [
          {
            fscode: '000002',
            abname: '测试基金B',
          },
        ],
        fundinfo: { total: 1, pagesize: 20, pageindex: 1 },
      });

      const result = await getThemeFunds(client, 'BK0438');

      expect(result.items[0].code).toBe('000002');
      expect(result.items[0].dailyChange).toBeNull();
      expect(result.items[0].nav).toBeNull();
    });
  });
});
