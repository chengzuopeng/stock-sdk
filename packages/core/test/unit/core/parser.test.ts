import { describe, it, expect } from 'vitest';
import { decodeGBK, parseResponse, safeNumber, safeNumberOrNull } from '../../../src/core';
import { toNumber, toFiniteNumberOrNull } from '../../../src/core/parser';

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

    // F44: '--' 占位符集中识别(此前 parseFloat NaN 兜底,现显式契约)
    it('should return null for double-dash placeholder', () => {
      expect(safeNumberOrNull('--')).toBeNull();
    });
  });

  describe('toNumber placeholder 集中识别 (F44)', () => {
    it("returns null for '-' and '--'", () => {
      expect(toNumber('-')).toBeNull();
      expect(toNumber('--')).toBeNull();
    });

    it('keeps parseFloat prefix semantics (与 toFiniteNumberOrNull 的关键差异)', () => {
      expect(toNumber('1.5abc')).toBe(1.5);
    });
  });

  describe('toFiniteNumberOrNull (F44: 收编 fund.ts 局部解析器)', () => {
    it('parses plain numeric strings', () => {
      expect(toFiniteNumberOrNull('1.6210')).toBe(1.621);
      expect(toFiniteNumberOrNull('-0.59')).toBe(-0.59);
      expect(toFiniteNumberOrNull('0')).toBe(0);
    });

    it('passes finite numbers through, rejects non-finite', () => {
      expect(toFiniteNumberOrNull(42)).toBe(42);
      expect(toFiniteNumberOrNull(Infinity)).toBeNull();
      expect(toFiniteNumberOrNull(NaN)).toBeNull();
    });

    it('returns null for null / undefined / placeholders', () => {
      expect(toFiniteNumberOrNull(null)).toBeNull();
      expect(toFiniteNumberOrNull(undefined)).toBeNull();
      expect(toFiniteNumberOrNull('')).toBeNull();
      expect(toFiniteNumberOrNull('   ')).toBeNull();
      expect(toFiniteNumberOrNull('\t')).toBeNull();
      expect(toFiniteNumberOrNull('-')).toBeNull();
      expect(toFiniteNumberOrNull(' - ')).toBeNull();
      expect(toFiniteNumberOrNull('--')).toBeNull();
      expect(toFiniteNumberOrNull(' -- ')).toBeNull();
    });

    it('rejects trailing garbage (Number 严格语义,非 parseFloat 前缀)', () => {
      expect(toFiniteNumberOrNull('1.2%')).toBeNull();
      expect(toFiniteNumberOrNull('3元')).toBeNull();
      expect(toFiniteNumberOrNull('abc')).toBeNull();
    });

    it('rejects Infinity strings (Number.isFinite 校验)', () => {
      expect(toFiniteNumberOrNull('Infinity')).toBeNull();
      expect(toFiniteNumberOrNull('-Infinity')).toBeNull();
    });
  });
});
