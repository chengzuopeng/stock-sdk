/**
 * marketEvent.individualChangesHistory 聚合测试:
 * 交易日历枚举 → 并发逐日请求 → 升序合并 + coverage/available 标注 + stats 计数。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import StockSDK from '../../../src/index';
import { addDays, todayInTz, MARKET_TZ } from '../../../src/core/time';

const ZT_BASE = 'https://push2ex.eastmoney.com';
const CALENDAR_URL = 'https://assets.linkdiary.cn/shares/trade-data-list.txt';

const sdk = new StockSDK();

// 固定时钟到北京时间正午,消除「handler 构建与 service 内部各自取 today」
// 跨北京午夜时漂移一天的窄窗 flake(F43 同款做法,只 fake Date 保留真实 timer)
beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 2, 3, 4, 0), toFake: ['Date'] });
  // R7-11: 交易日历等已是实例级缓存,setup 的 clearSharedCaches 清不到 ——
  // 模块级共享 sdk 需自行强刷,否则前一用例的日历 mock 泄漏到后一用例
  sdk.clearCaches();
});
afterEach(() => {
  vi.useRealTimers();
});

/** 最近 4 个自然日(升序,与真实"今天"挂钩,保证落入 days 窗口) */
function recentDays(): string[] {
  const today = todayInTz(MARKET_TZ.CN);
  return [-3, -2, -1, 0].map((offset) => addDays(today, offset));
}

/** 把 'YYYY-MM-DD' 转成接口的 YYYYMMDD */
const compact = (iso: string) => iso.replace(/-/g, '');

describe('marketEvent.individualChangesHistory', () => {
  it('按交易日升序聚合:超窗日 available=false,coverage 与 stats 正确', async () => {
    const [d3, d2, d1, d0] = recentDays();
    server.use(
      // 交易日历:窗口内 4 个"交易日"
      http.get(CALENDAR_URL, () => HttpResponse.text([d3, d2, d1, d0].join(','))),
      http.get(`${ZT_BASE}/getStockChanges`, ({ request }) => {
        const date = new URL(request.url).searchParams.get('date');
        if (date === compact(d3)) {
          // 最早一天:超出服务端保留窗口
          return HttpResponse.json({ data: null });
        }
        if (date === compact(d2)) {
          return HttpResponse.json({
            data: {
              c: '603087',
              m: 1,
              n: '甘李药业',
              data: [
                { tm: 145605, t: 4, p: 67090, i: '', u: '10.00', v: 1 },
              ],
            },
          });
        }
        if (date === compact(d1)) {
          // 窗口内但当日无异动
          return HttpResponse.json({
            data: { c: '603087', m: 1, n: '甘李药业', data: [] },
          });
        }
        return HttpResponse.json({
          data: {
            c: '603087',
            m: 1,
            n: '甘李药业',
            data: [
              { tm: 93000, t: 8201, p: 60000, i: '', u: '3.00', v: 2 },
              { tm: 93100, t: 4, p: 61000, i: '', u: '10.00', v: 3 },
              { tm: 93200, t: 8219, p: 62000, i: '', u: '5.00', v: 4 },
            ],
          },
        });
      })
    );

    const res = await sdk.marketEvent.individualChangesHistory('603087', {
      days: 4,
    });

    expect(res.code).toBe('603087');
    expect(res.name).toBe('甘李药业');
    expect(res.requestedDays).toBe(4);
    // 逐日升序,与交易日历一致
    expect(res.days.map((d) => d.date)).toEqual([d3, d2, d1, d0]);
    // 超窗 vs 无异动 vs 有异动 的区分
    expect(res.days[0].available).toBe(false);
    expect(res.days[1].available).toBe(true);
    expect(res.days[1].changes).toHaveLength(1);
    expect(res.days[2].available).toBe(true);
    expect(res.days[2].changes).toEqual([]);
    expect(res.days[3].changes).toHaveLength(3);
    // coverage:窗口起止 + 实际可得起点
    expect(res.coverage.from).toBe(d3);
    expect(res.coverage.to).toBe(todayInTz(MARKET_TZ.CN));
    expect(res.coverage.availableFrom).toBe(d2);
    // stats:仅 available 日;键为原始类型码(稳定),中文标签内联在值里
    expect(res.stats).toEqual({
      '4': { count: 2, label: '封涨停板' },
      '8201': { count: 1, label: '火箭发射' },
      '8219': { count: 1, label: '' },
    });
  });

  it('回显对账:服务端对某请求日回退到其它交易日 → 该日标 available=false,无重复日期、stats 不双计', async () => {
    const [d3, d2, d1, d0] = recentDays();
    server.use(
      http.get(CALENDAR_URL, () => HttpResponse.text([d2, d1, d0].join(','))),
      http.get(`${ZT_BASE}/getStockChanges`, ({ request }) => {
        const date = new URL(request.url).searchParams.get('date');
        if (date === compact(d1)) {
          // 服务端对请求日 d1 回退到 d2 并回显 d=d2(携带 d2 的事件)
          return HttpResponse.json({
            data: {
              d: Number(compact(d2)),
              c: '603087',
              m: 1,
              n: '甘李药业',
              data: [{ tm: 145605, t: 4, p: 67090, i: '', u: '10.00', v: 1 }],
            },
          });
        }
        // d2 与 d0 正常回显自身日期(date 参数即 YYYYMMDD),各 1 条封涨停事件
        return HttpResponse.json({
          data: {
            d: Number(date),
            c: '603087',
            m: 1,
            n: '甘李药业',
            data: [{ tm: 93000, t: 4, p: 67090, i: '', u: '10.00', v: 1 }],
          },
        });
      })
    );

    const res = await sdk.marketEvent.individualChangesHistory('603087', {
      days: 3,
    });
    // 日期与请求交易日一一对应,升序且唯一
    expect(res.days.map((d) => d.date)).toEqual([d2, d1, d0]);
    // 回退日被对账为 available=false,不携带别日事件
    expect(res.days[1].available).toBe(false);
    expect(res.days[1].changes).toEqual([]);
    // stats 只计 d2 与 d0 的各 1 条,不被 d1 的回退响应双计
    expect(res.stats).toEqual({ '4': { count: 2, label: '封涨停板' } });
    void d3;
  });

  it('全部超窗:availableFrom 为 null,stats 为空,code 回退符号归一结果', async () => {
    const [d3, d2] = recentDays();
    server.use(
      http.get(CALENDAR_URL, () => HttpResponse.text([d3, d2].join(','))),
      http.get(`${ZT_BASE}/getStockChanges`, () =>
        HttpResponse.json({ data: null })
      )
    );

    const res = await sdk.marketEvent.individualChangesHistory('sh600519', {
      days: 4,
    });
    expect(res.days.every((d) => d.available === false)).toBe(true);
    expect(res.coverage.availableFrom).toBeNull();
    expect(res.stats).toEqual({});
    expect(res.code).toBe('600519');
    expect(res.name).toBe('');
  });

  it('窗口内无交易日(如仅休市日):days 为空数组,不发个股请求', async () => {
    let changesCalled = 0;
    server.use(
      // 日历只有远古日期,均不落入窗口
      http.get(CALENDAR_URL, () => HttpResponse.text('1990-12-19,1990-12-20')),
      http.get(`${ZT_BASE}/getStockChanges`, () => {
        changesCalled++;
        return HttpResponse.json({ data: null });
      })
    );

    const res = await sdk.marketEvent.individualChangesHistory('600519', {
      days: 3,
    });
    expect(res.days).toEqual([]);
    expect(res.coverage.availableFrom).toBeNull();
    expect(changesCalled).toBe(0);
    expect(res.code).toBe('600519');
  });

  it('days 参数校验:非整数 / 越界零上游请求即拒', async () => {
    let called = 0;
    server.use(
      http.get(CALENDAR_URL, () => {
        called++;
        return HttpResponse.text('2024-01-02');
      })
    );

    await expect(
      sdk.marketEvent.individualChangesHistory('600519', { days: 0 })
    ).rejects.toThrow(/days/);
    await expect(
      sdk.marketEvent.individualChangesHistory('600519', { days: 61 })
    ).rejects.toThrow(/days/);
    await expect(
      sdk.marketEvent.individualChangesHistory('600519', { days: 7.5 })
    ).rejects.toThrow(/days/);
    expect(called).toBe(0);
  });

  it('days 默认 7', async () => {
    const [, , , d0] = recentDays();
    server.use(
      http.get(CALENDAR_URL, () => HttpResponse.text(d0)),
      http.get(`${ZT_BASE}/getStockChanges`, () =>
        HttpResponse.json({ data: { c: '600519', m: 1, n: '贵州茅台', data: [] } })
      )
    );

    const res = await sdk.marketEvent.individualChangesHistory('600519');
    expect(res.requestedDays).toBe(7);
    expect(res.days).toHaveLength(1);
  });
});
