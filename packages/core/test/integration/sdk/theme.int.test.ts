/**
 * Integration tests for theme fund API (real network requests)
 */
import { describe, it, expect } from 'vitest';
import { StockSDK } from '../../../src';

const sdk = new StockSDK();

describe.skipIf(!process.env.RUN_INTEGRATION)(
  'theme fund integration',
  () => {
    it('should fetch theme list successfully', async () => {
      const result = await sdk.fund.theme.getThemeList({ pageSize: 5 });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].code).toMatch(/^BK\d{4}$/);
      expect(result.items[0].name).toBeDefined();
      expect(result.items[0].type).toMatch(/^行业|概念$/);
    });

    it('should fetch funds by theme code', async () => {
      // 先用 getThemeList 获取一个主题代码
      const themes = await sdk.fund.theme.getThemeList({ pageSize: 1 });
      if (themes.items.length === 0) {
        throw new Error('No themes available for integration test');
      }

      const themeCode = themes.items[0].code;
      const result = await sdk.fund.theme.getThemeFunds(themeCode, {
        pageSize: 5,
      });

      expect(result.items).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.items[0].code).toMatch(/^\d{6}$/);
      expect(result.items[0].name).toBeDefined();
      expect(result.items[0].themeCode).toBe(themeCode);
    });

    it('should handle invalid theme code gracefully', async () => {
      // 非法主题代码：上游返回空集，SDK 优雅降级为空列表而非抛异常
      const result = await sdk.fund.theme.getThemeFunds('INVALID_CODE');
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.total).toBe('number');
    });
  },
  30000
);
