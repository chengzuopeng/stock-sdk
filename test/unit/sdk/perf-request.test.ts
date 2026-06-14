/**
 * 请求级性能优化回归测试(F34 / F35 / F37)
 *
 * - F34:5/15/30/60 分钟 K 线把 startDate/endDate 日期部分下推为
 *        kline/get 的 beg/end,服务端先按天裁剪(不再全量下载数年历史)
 * - F35:withIndicators 短上市标的双请求短路(首根晚于 actualStartDate
 *        时跳过全量 refetch)
 * - F37:withIndicators 仅在全量 refetch 后裁剪(暖机下限
 *   max(500, 15×maxLookback);常规路径不切片,见终审 408404d 与 P2-7)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestClient } from '../../../src/core';
import {
  getMinuteKline,
  getHKMinuteKline,
  getUSMinuteKline,
} from '../../../src/providers/eastmoney';
import { resolveMinuteBegEnd } from '../../../src/providers/eastmoney/utils';
import { IndicatorService } from '../../../src/sdk/indicatorService';
import { addIndicators } from '../../../src/indicators';
import type { IndicatorOptions } from '../../../src/indicators';
import type { HistoryKline } from '../../../src/types';

// 把 addIndicators 包成可观测的 passthrough spy(行为不变),
// 用于 F37 断言"指标计算只收到裁剪后的切片,而不是全量历史"
vi.mock('../../../src/indicators', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/indicators')>();
  return {
    ...actual,
    addIndicators: vi.fn(actual.addIndicators),
  };
});

// ============================================================
// F34:分钟 K 线 beg/end 服务端裁剪
// ============================================================

// 关掉 retry,避免异常分支触发 backoff 拖慢测试
const client = new RequestClient({ retry: { maxRetries: 0 } });

// kline/get 的 CSV 行:date,open,close,high,low,volume,amount,amplitude,changePercent,change,turnoverRate
const k = (time: string) => `${time},100,101,102,99,1000,100000,2,1,1,0.5`;
// trends2/get 的行:time,open,close,high,low,volume,amount,avgPrice
const t = (time: string) => `${time},100,100.1,100.5,99.9,5000,500000,100.05`;

describe('F34: minute kline pushes startDate/endDate down as beg/end', () => {
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

  describe('A-share getMinuteKline', () => {
    it('pushes date part of "YYYY-MM-DD HH:mm" startDate/endDate as beg/end', async () => {
      stub({ data: { klines: [k('2025-06-01 09:35')] } });
      await getMinuteKline(client, '600519', {
        period: '5',
        startDate: '2025-06-01 09:30',
        endDate: '2025-06-03',
      });
      expect(lastUrl).toContain('beg=20250601');
      expect(lastUrl).toContain('end=20250603');
    });

    it('keeps full window beg=0&end=20500000 when start/end not provided', async () => {
      stub({ data: { klines: [k('2025-06-01 09:35')] } });
      await getMinuteKline(client, '600519', { period: '5' });
      expect(lastUrl).toContain('beg=0');
      expect(lastUrl).toContain('end=20500000');
    });

    it('accepts compact YYYYMMDD and ISO-T datetime forms', async () => {
      stub({ data: { klines: [k('2025-06-01 09:35')] } });
      await getMinuteKline(client, '600519', { period: '15', startDate: '20250601' });
      expect(lastUrl).toContain('beg=20250601');
      // 没传 endDate 时 end 维持全量上界
      expect(lastUrl).toContain('end=20500000');

      stub({ data: { klines: [k('2025-06-01 09:35')] } });
      await getMinuteKline(client, '600519', {
        period: '30',
        startDate: '2025-06-01T09:30',
        endDate: '2025-06-02T15:00',
      });
      expect(lastUrl).toContain('beg=20250601');
      expect(lastUrl).toContain('end=20250602');
    });

    it("does not touch the 1-minute trends2 branch (no beg/end there)", async () => {
      stub({ data: { trends: [t('2025-06-01 09:31')] } });
      await getMinuteKline(client, '600519', {
        period: '1',
        startDate: '2025-06-01 09:30',
      });
      expect(lastUrl).toContain('/api/qt/stock/trends2/get');
      expect(lastUrl).not.toContain('beg=');
      expect(lastUrl).not.toContain('end=');
    });

    it('still applies local HH:mm filtering on top of the day-level server window', async () => {
      // 服务端只能按天裁剪;同一天里早于 09:30 的行必须仍被本地过滤掉
      stub({
        data: {
          klines: [k('2025-06-01 09:25'), k('2025-06-01 09:35')],
        },
      });
      const rows = await getMinuteKline(client, '600519', {
        period: '5',
        startDate: '2025-06-01 09:30',
        endDate: '2025-06-01',
      });
      expect(rows).toHaveLength(1);
      expect((rows[0] as { time: string }).time).toBe('2025-06-01 09:35');
    });
  });

  describe('HK getHKMinuteKline', () => {
    it('pushes beg/end (HKT == Beijing time, same-day pushdown)', async () => {
      stub({ data: { klines: [k('2025-06-02 10:00')] } });
      await getHKMinuteKline(client, '00700', {
        period: '15',
        startDate: '2025-06-02',
        endDate: '2025-06-03',
      });
      expect(lastUrl).toContain('beg=20250602');
      expect(lastUrl).toContain('end=20250603');
    });

    it('keeps full window when start/end not provided', async () => {
      stub({ data: { klines: [k('2025-06-02 10:00')] } });
      await getHKMinuteKline(client, '00700', { period: '60' });
      expect(lastUrl).toContain('beg=0');
      expect(lastUrl).toContain('end=20500000');
    });
  });

  describe('US getUSMinuteKline', () => {
    it('pushes beg as-is but widens end by +1 day (NY afternoon == Beijing next morning)', async () => {
      stub({ data: { klines: [k('2025-06-02 21:35')] } });
      await getUSMinuteKline(client, '105.AAPL', {
        period: '5',
        startDate: '2025-06-02 09:30',
        endDate: '2025-06-03',
      });
      expect(lastUrl).toContain('beg=20250602');
      // end 必须 +1 天:NY 2025-06-03 的下午盘对应北京时间 2025-06-04 凌晨
      expect(lastUrl).toContain('end=20250604');
    });

    it('keeps full window when start/end not provided', async () => {
      stub({ data: { klines: [k('2025-06-02 21:35')] } });
      await getUSMinuteKline(client, '105.AAPL', { period: '5' });
      expect(lastUrl).toContain('beg=0');
      expect(lastUrl).toContain('end=20500000');
    });

    it('handles month rollover for the +1 day end padding', async () => {
      stub({ data: { klines: [k('2025-06-30 21:35')] } });
      await getUSMinuteKline(client, '105.AAPL', {
        period: '5',
        endDate: '2025-06-30',
      });
      expect(lastUrl).toContain('end=20250701');
    });

    it('still returns NY-afternoon rows of endDate (Beijing next-morning rows survive)', async () => {
      // 北京 2025-06-04 04:00 == NY 2025-06-03 16:00 (EDT) → 属于 endDate 当天,必须保留
      // 北京 2025-06-04 21:30 == NY 2025-06-04 09:30 → 超出 endDate,本地过滤掉
      stub({
        data: {
          klines: [k('2025-06-04 04:00'), k('2025-06-04 21:30')],
        },
      });
      const rows = await getUSMinuteKline(client, '105.AAPL', {
        period: '5',
        startDate: '2025-06-03 09:30',
        endDate: '2025-06-03',
      });
      expect(rows).toHaveLength(1);
      expect((rows[0] as { time: string }).time).toBe('2025-06-03 16:00');
    });
  });

  describe('resolveMinuteBegEnd helper', () => {
    it('falls back to the full window on unrecognized formats', () => {
      expect(resolveMinuteBegEnd(undefined, undefined)).toEqual({
        beg: '0',
        end: '20500000',
      });
      expect(resolveMinuteBegEnd('recently', 'whenever')).toEqual({
        beg: '0',
        end: '20500000',
      });
    });

    it('handles year rollover when padding end', () => {
      expect(resolveMinuteBegEnd(undefined, '2025-12-31', 1)).toEqual({
        beg: '0',
        end: '20260101',
      });
    });
  });
});

// ============================================================
// F35 / F37:IndicatorService 请求与计算裁剪
// ============================================================

function makeKline(date: string, close: number): HistoryKline {
  return {
    date,
    timestamp: Date.parse(`${date}T00:00:00+08:00`),
    tz: 'Asia/Shanghai',
    code: '600519',
    open: close,
    close,
    high: close + 1,
    low: close - 1,
    volume: 1000,
    amount: 100000,
    amplitude: 1,
    changePercent: 0,
    change: 0,
    turnoverRate: 1,
  };
}

/** 从 2023-01-01 起按自然日生成 count 根确定性的合成日 K */
function genKlines(count: number): HistoryKline[] {
  const base = Date.UTC(2023, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
    const close = Math.round((100 + 10 * Math.sin(i / 7) + (i % 5) * 0.3) * 100) / 100;
    return makeKline(date, close);
  });
}

function makeService(klines: {
  A?: HistoryKline[] | HistoryKline[][];
  HK?: HistoryKline[] | HistoryKline[][];
}) {
  const asImpl = (data?: HistoryKline[] | HistoryKline[][]) => {
    const fn = vi.fn();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      // 数组的数组 → 第 N 次调用返回第 N 份(模拟首次 + refetch 不同响应)
      for (const batch of data as HistoryKline[][]) {
        fn.mockResolvedValueOnce(batch);
      }
      fn.mockResolvedValue((data as HistoryKline[][])[data.length - 1]);
    } else {
      fn.mockResolvedValue(data ?? []);
    }
    return fn;
  };
  const klineService = {
    getHistoryKline: asImpl(klines.A),
    getHKHistoryKline: asImpl(klines.HK),
    getUSHistoryKline: asImpl(undefined),
  };
  // 拒绝交易日历 → IndicatorService 走确定性的 ratio 兜底路径计算 actualStartDate
  const quoteService = {
    getTradingCalendar: vi.fn().mockRejectedValue(new Error('calendar unavailable')),
  };
  return {
    service: new IndicatorService(klineService, quoteService),
    klineService,
  };
}

describe('F35: skip the full-history refetch for short-listed symbols', () => {
  // { ma: { periods: [5] } } → maxLookback 5,无 EMA → requiredBars = ceil(5*1.2) = 6
  // startDate '2024-06-03'、ratio 1.5 → actualStartDate = 2024-06-03 - 9 天 = '20240525'
  const indicators: IndicatorOptions = { ma: { periods: [5] } };

  it('does NOT refetch when the first bar is far later than actualStartDate (true IPO)', async () => {
    // P1-4 后日线容差为 30 个自然日:首根晚于 actualStartDate 30 天以上
    // 才认定'上市晚、无更早数据'(真 IPO 场景 gap 通常以月计)
    const short = ['2024-06-03', '2024-06-04', '2024-06-05', '2024-06-06', '2024-06-07'].map(
      (d, i) => makeKline(d, 100 + i)
    );
    const { service, klineService } = makeService({ A: short });

    const rows = await service.getKlineWithIndicators('600519', {
      // startDate 2024-04-28,ratio 路径 actualStartDate ≈ 2024-04-19;
      // 首根 2024-06-03 距其 45 天 > 30 → 判定上市晚,跳过 refetch
      startDate: '2024-04-28',
      indicators,
    });

    expect(klineService.getHistoryKline).toHaveBeenCalledTimes(1);
    // 5 根全部在窗口内(均 >= startDate)
    expect(rows).toHaveLength(5);
    expect(rows[4].ma?.ma5).not.toBeNull();
  });

  it('P1-4: 30 天内的间隙(假期/停牌)仍然 refetch', async () => {
    // 首根距 actualStartDate 9 个自然日(黄金周/短停牌量级)→ 可能是
    // 被 beg 截断,保守 refetch(旧 7 天容差下这里也 refetch;30 天容差
    // 把更长的停牌一并覆盖)
    const short = ['2024-06-03', '2024-06-04', '2024-06-05', '2024-06-06', '2024-06-07'].map(
      (d, i) => makeKline(d, 100 + i)
    );
    const { service, klineService } = makeService({ A: [short, short] });
    await service.getKlineWithIndicators('600519', {
      startDate: '2024-06-03',
      indicators,
    });
    expect(klineService.getHistoryKline).toHaveBeenCalledTimes(2);
  });

  it('P1-4: 周/月线一律保守 refetch(标签在期末,间距判定不适用)', async () => {
    // 月线首根标签是月末,距 actualStartDate 常 8~30 天 —— 任何固定容差
    // 都会误判;period 非 daily 时无条件 refetch(实测此前月线窗口首段
    // kdj 全 null)
    const monthly = ['2024-02-29', '2024-03-29', '2024-04-30'].map((d, i) =>
      makeKline(d, 100 + i)
    );
    const { service, klineService } = makeService({ A: [monthly, monthly] });
    await service.getKlineWithIndicators('600519', {
      period: 'monthly',
      startDate: '2024-03-01',
      indicators,
    });
    expect(klineService.getHistoryKline).toHaveBeenCalledTimes(2);
  });

  it('still refetches when the first bar is at/before actualStartDate but bars are insufficient', async () => {
    // 首根 == actualStartDate(2024-05-25)且只有 4 根 → 可能是被 beg 截断,保留 refetch
    const truncated = ['2024-05-25', '2024-05-28', '2024-05-30', '2024-06-03'].map((d, i) =>
      makeKline(d, 100 + i)
    );
    const full = [
      '2024-05-15',
      '2024-05-17',
      '2024-05-21',
      '2024-05-23',
      '2024-05-25',
      '2024-05-28',
      '2024-05-30',
      '2024-06-03',
      '2024-06-04',
    ].map((d, i) => makeKline(d, 100 + i));
    const { service, klineService } = makeService({ A: [truncated, full] });

    const rows = await service.getKlineWithIndicators('600519', {
      startDate: '2024-06-03',
      indicators,
    });

    expect(klineService.getHistoryKline).toHaveBeenCalledTimes(2);
    // refetch 必须是去掉 startDate 的全量请求
    expect(klineService.getHistoryKline).toHaveBeenLastCalledWith(
      '600519',
      expect.objectContaining({ startDate: undefined })
    );
    expect(rows.map((r) => r.date)).toEqual(['2024-06-03', '2024-06-04']);
  });

  it('still refetches when the first response is empty', async () => {
    const { service, klineService } = makeService({ A: [[], []] });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate: '2024-06-03',
      indicators,
    });
    expect(klineService.getHistoryKline).toHaveBeenCalledTimes(2);
    expect(rows).toEqual([]);
  });

  it('applies the short-circuit on the HK path too', async () => {
    const short = ['2024-06-03', '2024-06-04', '2024-06-05'].map((d, i) =>
      makeKline(d, 100 + i)
    );
    const { service, klineService } = makeService({ HK: short });
    // P1-4 后日线容差 30 天:起点早于首根 40+ 天构造真 IPO 间距
    await service.getKlineWithIndicators('00700', {
      market: 'HK',
      startDate: '2024-04-20',
      indicators,
    });
    expect(klineService.getHKHistoryKline).toHaveBeenCalledTimes(1);
    expect(klineService.getHistoryKline).not.toHaveBeenCalled();
  });
});

describe('P2-7: 暖机下限随最大周期成比例放大 + 累计型由 registry 标记', () => {
  it('rsi periods:[100] 的 refetch 切片与全量计算逐值一致(10×maxLookback 暖机)', async () => {
    const rsiBig: IndicatorOptions = { rsi: { periods: [100] } };
    const longHistory = genKlines(2500);
    const startIdx = 2400;
    const startDate = longHistory[startIdx].date;
    const legacy = addIndicators(longHistory, rsiBig).filter(
      (item) => item.date >= startDate
    );
    vi.mocked(addIndicators).mockClear();

    const { service } = makeService({ A: [[], longHistory] });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate,
      indicators: rsiBig,
    });

    // rsi 的 estimateLookback bars = max(periods)+1 = 101 →
    // 暖机 = max(requiredBars≈122, 500, 15×101=1515) → 切到 2400-1515=885 起
    const computed = vi.mocked(addIndicators).mock.calls[
      vi.mocked(addIndicators).mock.calls.length - 1
    ][0];
    expect(computed).toHaveLength(longHistory.length - (startIdx - 1515)); // 1615
    // 旧实现(固定 500)在此场景 Wilder-100 仅衰减 ~1.8%,round(2) 可见漂移
    expect(rows).toEqual(legacy);
  });

  it('OBV 由 registry cumulative 标记驱动跳过切片(不再依赖 service 白名单)', async () => {
    const withObv: IndicatorOptions = { obv: true };
    const longHistory = genKlines(800);
    const startDate = longHistory[700].date;
    vi.mocked(addIndicators).mockClear();
    const { service } = makeService({ A: [[], longHistory] });
    await service.getKlineWithIndicators('600519', { startDate, indicators: withObv });
    const computed = vi.mocked(addIndicators).mock.calls[
      vi.mocked(addIndicators).mock.calls.length - 1
    ][0];
    expect(computed).toHaveLength(longHistory.length);
  });
});

describe('P1-6: 非法日期格式干净报错(不再裸 RangeError / 静默空窗)', () => {
  it.each(['2024-1-5', '2024/01/05', '2024-6-3', 'not-a-date'])(
    "startDate '%s' → InvalidArgumentError",
    async (startDate) => {
      const { service } = makeService({ A: genKlines(30) });
      await expect(
        service.getKlineWithIndicators('600519', {
          startDate,
          indicators: { ma: { periods: [5] } },
        })
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    }
  );

  it('合法格式(YYYY-MM-DD / YYYYMMDD / 含时间)照常工作', async () => {
    const bars = genKlines(30);
    const { service } = makeService({ A: bars });
    const a = await service.getKlineWithIndicators('600519', {
      startDate: bars[20].date,
      indicators: {},
    });
    const b = await service.getKlineWithIndicators('600519', {
      startDate: bars[20].date.replace(/-/g, ''),
      indicators: {},
    });
    expect(a).toEqual(b);
  });
});

describe('F37: slice before computing indicators', () => {
  const fullKlines = genKlines(500);
  // 终审(408404d)后的语义:常规路径【不切片】(与旧实现逐值一致);
  // 切片只发生在全量 refetch 后,且暖机下限 max(requiredBars, 500, 15×maxLookback)。
  // 特意混入 MACD/KDJ/RSI 这类带递推状态的指标做对拍。
  const indicators: IndicatorOptions = {
    ma: { periods: [5, 250] },
    macd: {},
    kdj: {},
    rsi: { periods: [14] },
    boll: {},
  };

  afterEach(() => {
    vi.mocked(addIndicators).mockClear();
  });

  it('matches the legacy full-history computation value-for-value inside the window', async () => {
    const startIdx = 450;
    const endIdx = 480;
    const startDate = fullKlines[startIdx].date;
    const endDate = fullKlines[endIdx].date;

    // 旧路径:全量算指标 → 逐 bar 过滤
    const legacy = addIndicators(fullKlines, indicators).filter(
      (item) => item.date >= startDate && item.date <= endDate
    );
    vi.mocked(addIndicators).mockClear();

    const { service } = makeService({ A: fullKlines });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate,
      endDate,
      indicators,
    });

    // (a) 窗口内逐值与旧路径完全一致
    expect(rows).toHaveLength(endIdx - startIdx + 1);
    expect(rows).toEqual(legacy);

    // (b) 终审修复:常规路径(未 refetch)【不再切片】—— fetched 本就从
    // actualStartDate 起,切片会削掉递归型指标的暖机历史产生数值漂移;
    // 不切片即与旧实现逐值一致
    expect(addIndicators).toHaveBeenCalledTimes(1);
    const computed = vi.mocked(addIndicators).mock.calls[0][0];
    expect(computed).toHaveLength(fullKlines.length);
  });

  it('Review F1 回归:kdj 小 lookback 常规路径与旧实现逐值一致(不切片)', async () => {
    // requiredBars = ceil(9*1.2) = 11,远低于 KDJ 平滑暖机需求 ——
    // 修复前切片会让窗口内 k/d 漂移(实测 |Δd| 最大 9.4)
    const kdjOnly: IndicatorOptions = { kdj: {} };
    const bars = genKlines(60);
    const startDate = bars[40].date;
    const legacy = addIndicators(bars, kdjOnly).filter((item) => item.date >= startDate);
    vi.mocked(addIndicators).mockClear();

    const { service } = makeService({ A: bars });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate,
      indicators: kdjOnly,
    });
    expect(rows).toEqual(legacy);
  });

  it('Review F1 回归:全量 refetch 后切片带 RECURSIVE_WARMUP 下限,与全量计算逐值一致', async () => {
    const kdjOnly: IndicatorOptions = { kdj: {} }; // requiredBars=11 → floor 到 500
    const longHistory = genKlines(2000);
    const startIdx = 1900;
    const startDate = longHistory[startIdx].date;
    const legacy = addIndicators(longHistory, kdjOnly).filter(
      (item) => item.date >= startDate
    );
    vi.mocked(addIndicators).mockClear();

    // 首次返回空 → 触发全量 refetch
    const { service, klineService } = makeService({ A: [[], longHistory] });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate,
      indicators: kdjOnly,
    });

    expect(klineService.getHistoryKline).toHaveBeenCalledTimes(2);
    // 切片生效:2000 根只算 startIdx-500 起的 600 根
    const computed = vi.mocked(addIndicators).mock.calls[
      vi.mocked(addIndicators).mock.calls.length - 1
    ][0];
    expect(computed).toHaveLength(longHistory.length - (startIdx - 500)); // 600
    // 暖机下限保证窗口内与全量计算逐值一致(KDJ 状态差在 500 根下衰减殆尽)
    expect(rows).toEqual(legacy);
  });

  it('Review F1 回归:OBV(全量累计型)启用时 refetch 后不切片', async () => {
    const withObv: IndicatorOptions = { obv: {} };
    const longHistory = genKlines(800);
    const startDate = longHistory[700].date;
    const legacy = addIndicators(longHistory, withObv).filter(
      (item) => item.date >= startDate
    );
    vi.mocked(addIndicators).mockClear();

    const { service } = makeService({ A: [[], longHistory] });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate,
      indicators: withObv,
    });

    const computed = vi.mocked(addIndicators).mock.calls[
      vi.mocked(addIndicators).mock.calls.length - 1
    ][0];
    expect(computed).toHaveLength(longHistory.length); // 不切片
    expect(rows).toEqual(legacy);
  });

  it('supports compact YYYYMMDD startDate and open-ended endDate', async () => {
    const startIdx = 460;
    const startDate = fullKlines[startIdx].date; // 'YYYY-MM-DD'
    const legacy = addIndicators(fullKlines, indicators).filter(
      (item) => item.date >= startDate
    );
    vi.mocked(addIndicators).mockClear();

    const { service } = makeService({ A: fullKlines });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate: startDate.replace(/-/g, ''),
      indicators,
    });

    expect(rows).toHaveLength(fullKlines.length - startIdx);
    expect(rows).toEqual(legacy);
  });

  it('no-indicator queries return the plain window unchanged', async () => {
    // 无指标 → requiredBars=0,refetch 永不触发(切片分支不可达),
    // 常规路径整组透传 addIndicators(注册表循环为空,逐 bar 仅 clone)
    const startIdx = 490;
    const { service } = makeService({ A: fullKlines });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate: fullKlines[startIdx].date,
      indicators: {},
    });
    expect(rows).toEqual(fullKlines.slice(startIdx));
  });

  it('returns [] without computing indicators when all bars are before startDate', async () => {
    const { service } = makeService({ A: fullKlines });
    const rows = await service.getKlineWithIndicators('600519', {
      startDate: '2031-01-01',
      indicators: {},
    });
    expect(rows).toEqual([]);
    expect(addIndicators).not.toHaveBeenCalled();
  });

  it('keeps the no-startDate path unchanged (full computation)', async () => {
    const { service } = makeService({ A: fullKlines });
    const rows = await service.getKlineWithIndicators('600519', { indicators });
    expect(rows).toHaveLength(fullKlines.length);
    expect(vi.mocked(addIndicators).mock.calls[0][0]).toHaveLength(fullKlines.length);
  });
});
