import { describe, it, expect } from 'vitest';
import { decodeGBK, parseResponse, safeNumber, safeNumberOrNull } from '../../../src/utils';

describe('core parser utilities', () => {
  describe('decodeGBK', () => {
    it('should decode GBK encoded ArrayBuffer', () => {
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
});
