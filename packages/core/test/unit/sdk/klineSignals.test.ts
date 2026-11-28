/**
 * IndicatorService.getKlineSignals（get_kline_signals 工具的 SDK 底座）单测。
 *
 * 用 fake klineService 注入合成 K 线（零网络），验证三件事：
 * ① 参数校验：maFast/maSlow 必须是正整数且 fast < slow；
 * ② 周期对齐：withIndicators 的指标周期与 calcSignals 的信号周期一致
 *    （否则 calcSignals 会因找不到 ma/rsi 键而抛错或静默零信号）——
 *    一个 V 形序列必现 MA 金叉即证明链路打通；
 * ③ 结果补全：每条信号补上所在 K 线的 date / close。
 */
import { describe, it, expect } from 'vitest';
import { IndicatorService } from '../../../src/sdk/indicatorService';
import type { KlineService } from '../../../src/sdk/klineService';
import type { QuoteService } from '../../../src/sdk/quoteService';
import type { HistoryKline } from '../../../src/types';
import { makeHistoryKline, shiftDateISO } from './helpers';

/** V 形收盘序列：前 20 根 120→101 下行，后 20 根 102→140 上行 → 上行段必现 MA 金叉。 */
function makeSeries(): HistoryKline[] {
  // 单调递增的真实日期（不回绕），使 startDate 窗口过滤可被正确测试
  return Array.from({ length: 40 }, (_, i) => {
    const close = i < 20 ? 120 - i : 100 + (i - 19) * 2;
    return makeHistoryKline(shiftDateISO('2026-01-01', i), close);
  });
}

function makeService(klines: HistoryKline[]): IndicatorService {
  const klineService = {
    getHistoryKline: async () => klines,
    getHKHistoryKline: async () => klines,
    getUSHistoryKline: async () => klines,
  } as unknown as Pick<
    KlineService,
    'getHistoryKline' | 'getHKHistoryKline' | 'getUSHistoryKline'
  >;
  const quoteService = {
    getTradingCalendar: async () => [] as string[],
  } as unknown as Pick<QuoteService, 'getTradingCalendar'>;
  return new IndicatorService(klineService, quoteService);
}

describe('IndicatorService.getKlineSignals', () => {
  it('识别信号并补全 date/close（V 形序列产出 MA 金叉）', async () => {
    const svc = makeService(makeSeries());
    const signals = await svc.getKlineSignals('600519');

    expect(Array.isArray(signals)).toBe(true);
    // 每条信号形状正确
    for (const s of signals) {
      expect(typeof s.type).toBe('string');
      expect(typeof s.date).toBe('string');
      expect(typeof s.timestamp).toBe('number');
      expect(s.close === null || typeof s.close === 'number').toBe(true);
    }

    // 周期对齐验证：V 形上行段必现 MA 金叉（周期不匹配则此处为空或抛错）
    const golden = signals.find((s) => s.type === 'ma_golden_cross');
    expect(golden, 'V 形序列应识别出 MA 金叉').toBeDefined();
    // 补全字段：金叉这条带上了所在 K 线的日期与收盘价
    expect(golden!.date).toMatch(/^2026-01-/);
    expect(typeof golden!.close).toBe('number');
    expect(golden!.timestamp).toBeGreaterThan(0);
  });

  it('自定义 maFast/maSlow 也能对齐周期并识别金叉', async () => {
    const svc = makeService(makeSeries());
    const signals = await svc.getKlineSignals('600519', { maFast: 3, maSlow: 8 });
    // 更短的快慢线在 V 形上更早交叉，仍应识别到金叉（不因周期改变而抛错）
    expect(signals.some((s) => s.type === 'ma_golden_cross')).toBe(true);
  });

  it('超长停牌缺口后的 startDate 首日交叉仍产出（leadingBars 按下标锚定，不受缺口天数限制）', async () => {
    // 旧实现按「天数缓冲区」回推（daily 20 天）：缺口 > 缓冲区时窗口首日无前驱,
    // 交叉静默丢失。leadingBars 按下标保留前一根,90 天缺口同样成立。
    const bars = makeSeries();
    // 在金叉发生 bar 之前制造 90 天日期缺口（下标连续、日期跳跃）
    const all = await makeService(bars).getKlineSignals('600519', { maFast: 3, maSlow: 8 });
    const golden = all.find((s) => s.type === 'ma_golden_cross');
    expect(golden).toBeDefined();
    const gapIdx = bars.findIndex((b) => b.date === golden!.date);
    const gapped = bars.map((b, i) =>
      i >= gapIdx ? makeHistoryKline(shiftDateISO(b.date, 90), b.close!) : b
    );
    const svc = makeService(gapped);
    const startDate = gapped[gapIdx].date;
    const windowed = await svc.getKlineSignals('600519', {
      maFast: 3,
      maSlow: 8,
      startDate,
    });
    expect(
      windowed.some((s) => s.type === 'ma_golden_cross' && s.date === startDate),
      '90 天缺口后的窗口首日金叉必须仍被返回'
    ).toBe(true);
  });

  it('恰好落在 startDate 当天的金叉不被漏掉（边界修复）', async () => {
    const svc = makeService(makeSeries());
    // 先在全历史上定位金叉那天
    const all = await svc.getKlineSignals('600519', { maFast: 3, maSlow: 8 });
    const golden = all.find((s) => s.type === 'ma_golden_cross');
    expect(golden, '需要一个金叉作为边界样本').toBeDefined();

    // 以金叉那天作为 startDate 再查：修复前 getKlineWithIndicators 会先按 date>=startDate
    // 裁掉前一根，calcSignals 从 i=1 起就看不到当天的交叉 —— 修复后靠锚点缓冲区恢复。
    const windowed = await svc.getKlineSignals('600519', {
      maFast: 3,
      maSlow: 8,
      startDate: golden!.date,
    });
    expect(
      windowed.some((s) => s.type === 'ma_golden_cross' && s.date === golden!.date),
      'startDate 当天的金叉必须仍被返回'
    ).toBe(true);
    // 且不返回早于 startDate 的信号
    expect(windowed.every((s) => s.date >= golden!.date)).toBe(true);
  });

  it('maFast >= maSlow 抛 InvalidArgumentError', async () => {
    const svc = makeService(makeSeries());
    await expect(
      svc.getKlineSignals('600519', { maFast: 20, maSlow: 5 })
    ).rejects.toThrow(/maFast/);
    await expect(
      svc.getKlineSignals('600519', { maFast: 10, maSlow: 10 })
    ).rejects.toThrow(/maFast/);
  });

  it('非正整数周期抛 InvalidArgumentError', async () => {
    const svc = makeService(makeSeries());
    await expect(svc.getKlineSignals('600519', { maFast: 0 })).rejects.toThrow();
    await expect(svc.getKlineSignals('600519', { maFast: 2.5 })).rejects.toThrow();
    await expect(svc.getKlineSignals('600519', { maSlow: -1 })).rejects.toThrow();
  });
});
