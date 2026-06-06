/**
 * 错误面契约护栏（v2 阶段0）
 *
 * 锁定「对外只抛 SdkError」契约：
 * - 所有 SDK 错误类都是 SdkError（且 Error）实例，code 正确
 * - 参数校验抛 InvalidArgumentError（SdkError 子类），不再是裸 RangeError
 * - JSONP 解析失败抛 SdkError(PARSE_ERROR)，不再是裸 Error
 */
import { describe, it, expect } from 'vitest';
import {
  SdkError,
  HttpError,
  UpstreamEmptyError,
  UpstreamError,
  AbortedError,
  NotFoundError,
  InvalidArgumentError,
  InvalidSymbolError,
  getSdkErrorCode,
  type SdkErrorCode,
} from '../../../src/core';
import {
  assertPositiveInteger,
  assertKlinePeriod,
  assertMinutePeriod,
  assertAdjustType,
} from '../../../src/core/utils';
import { extractJsonFromJsonp } from '../../../src/core/jsonp';

describe('error surface contract', () => {
  describe('SDK error classes are SdkError with correct code', () => {
    const cases: Array<{ err: SdkError; code: SdkErrorCode }> = [
      { err: new HttpError(500, 'Internal Server Error'), code: 'HTTP_ERROR' },
      { err: new HttpError(429, 'Too Many Requests'), code: 'RATE_LIMITED' },
      { err: new UpstreamEmptyError('empty'), code: 'UPSTREAM_EMPTY' },
      { err: new UpstreamError('upstream failed'), code: 'UPSTREAM_ERROR' },
      { err: new AbortedError(), code: 'ABORTED' },
      { err: new NotFoundError('nope'), code: 'NOT_FOUND' },
      { err: new InvalidArgumentError('bad arg'), code: 'INVALID_ARGUMENT' },
      { err: new InvalidSymbolError('xxx'), code: 'INVALID_SYMBOL' },
    ];

    cases.forEach(({ err, code }) => {
      it(`${err.name} → code ${code}`, () => {
        expect(err).toBeInstanceOf(SdkError);
        expect(err).toBeInstanceOf(Error);
        expect(err.code).toBe(code);
        expect(getSdkErrorCode(err)).toBe(code);
      });
    });
  });

  describe('parameter assertions throw InvalidArgumentError (a SdkError)', () => {
    it('assertPositiveInteger rejects non-positive / non-integer', () => {
      expect(() => assertPositiveInteger(0, 'n')).toThrow(InvalidArgumentError);
      expect(() => assertPositiveInteger(-1, 'n')).toThrow(SdkError);
      expect(() => assertPositiveInteger(1.5, 'n')).toThrow(InvalidArgumentError);
    });

    it('assertKlinePeriod rejects unknown period', () => {
      expect(() => assertKlinePeriod('bad')).toThrow(InvalidArgumentError);
    });

    it('assertMinutePeriod rejects unknown period', () => {
      expect(() => assertMinutePeriod('bad')).toThrow(InvalidArgumentError);
    });

    it('assertAdjustType rejects unknown adjust', () => {
      expect(() => assertAdjustType('bad')).toThrow(InvalidArgumentError);
    });
  });

  describe('JSONP parse failures throw SdkError(PARSE_ERROR)', () => {
    it('no opening parenthesis', () => {
      expect(() => extractJsonFromJsonp('garbage no paren')).toThrow(SdkError);
      try {
        extractJsonFromJsonp('garbage no paren');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(getSdkErrorCode(e)).toBe('PARSE_ERROR');
      }
    });

    it('no closing parenthesis', () => {
      expect(() => extractJsonFromJsonp('cb({a:1}')).toThrow(SdkError);
    });
  });
});
