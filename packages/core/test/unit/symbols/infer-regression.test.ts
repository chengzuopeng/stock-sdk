/**
 * Review 修复回归（F27）：迁移 v1 getMarketCode 的历史回归用例
 *
 * 这些用例钉住的都是修过的真实 bug：
 * - 920xxx 北交所新代码段：必须在「9 开头 → 上交所」之前判断（'92 先于 9'）
 * - 5xx 上交所场内 ETF/LOF：修复前被错误归到深圳
 * - 9xx 上交所 B 股：修复前被错误归到深圳
 * - 1xx 深交所 ETF/LOF：保持深圳
 * v2 中该逻辑迁到 inferAShareExchange，删除原测试后这些排序规则失去护栏，
 * 此处按 v2 形态（exchange + 东财 secid）重建。
 */
import { describe, it, expect } from 'vitest';
import {
  inferAShareExchange,
  normalizeSymbol,
  toEastmoneySecid,
} from '../../../src/symbols';

describe('F27 inferAShareExchange（v1 getMarketCode 语义）', () => {
  it('上交所：6 开头主板/科创', () => {
    expect(inferAShareExchange('600519')).toBe('SSE');
    expect(inferAShareExchange('688001')).toBe('SSE');
  });

  it('深交所：0 主板 / 3 创业板', () => {
    expect(inferAShareExchange('000001')).toBe('SZSE');
    expect(inferAShareExchange('300001')).toBe('SZSE');
  });

  it('北交所：4 / 8 开头 + 920 新代码段（92 必须先于 9 判断）', () => {
    expect(inferAShareExchange('430047')).toBe('BSE');
    expect(inferAShareExchange('830799')).toBe('BSE');
    expect(inferAShareExchange('870204')).toBe('BSE');
    expect(inferAShareExchange('920819')).toBe('BSE'); // 修复前被误判为上海
    expect(inferAShareExchange('920000')).toBe('BSE');
  });

  it('上交所场内 ETF/LOF/封基（5xx）：修复前被错误归到深圳', () => {
    for (const code of [
      '510050', // 上证 50 ETF
      '510300', // 沪深 300 ETF
      '512170', // 医疗 ETF
      '513050', // 中概互联网 ETF
      '515030', // 新能源车 ETF
      '518880', // 黄金 ETF
      '588000', // 科创 50 ETF
    ]) {
      expect(inferAShareExchange(code)).toBe('SSE');
    }
  });

  it('上交所 B 股（9xx 非 92 段）：修复前被错误归到深圳', () => {
    expect(inferAShareExchange('900901')).toBe('SSE');
  });

  it('深交所 ETF/LOF（1 开头）：保持深圳', () => {
    expect(inferAShareExchange('159919')).toBe('SZSE');
    expect(inferAShareExchange('161725')).toBe('SZSE');
  });
});

describe('F27 端到端：normalizeSymbol + toEastmoneySecid（对应 v1 getMarketCode 的 1/0）', () => {
  it.each([
    ['600519', '1.600519'],
    ['sh600519', '1.600519'],
    ['688001', '1.688001'],
    ['900901', '1.900901'], // SH B 股
    ['sh900901', '1.900901'],
    ['510050', '1.510050'], // SH ETF
    ['588000', '1.588000'],
    ['000001', '0.000001'],
    ['sz000001', '0.000001'],
    ['300001', '0.300001'],
    ['159919', '0.159919'], // SZ ETF
    ['sz159919', '0.159919'],
    ['161725', '0.161725'],
    ['430047', '0.430047'], // BSE
    ['830799', '0.830799'],
    ['920819', '0.920819'], // 920 新代码段
    ['bj920819', '0.920819'],
  ])('%s → secid %s', (input, secid) => {
    expect(toEastmoneySecid(normalizeSymbol(input))).toBe(secid);
  });
});
