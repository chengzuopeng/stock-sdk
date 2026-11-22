/**
 * R7-8 净值/排名历史脏行防御回归：
 * 此前一行非有限时间戳会让 Intl 抛 RangeError 毁掉整个几千行结果；
 * x 缺失（undefined）更隐蔽 —— timestampToDate 的默认参数落到 Date.now()，
 * 静默产出"今天"的幽灵行；accMap/percentMap 的裸 as number cast 会让
 * 上游字符串 y 以 string 运行时类型混进 number|null 字段。
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestClient } from '../../../../src/core';
import {
  getFundNavHistory,
  getFundRankHistory,
} from '../../../../src/providers/eastmoney/fund';

function fakeClient(jsText: string): RequestClient {
  return { get: vi.fn(async () => jsText) } as unknown as RequestClient;
}

const DAY = 24 * 60 * 60 * 1000;
const T1 = Date.UTC(2024, 0, 1, 16); // 北京时间 2024-01-02 00:00
const T2 = T1 + DAY;

describe('getFundNavHistory 脏行防御', () => {
  it('非有限 x 的行被跳过，其余行正常返回（不再整体 RangeError）', async () => {
    const js = `
      var fS_code = "110011";
      var fS_name = "测试基金";
      var Data_netWorthTrend = [
        {"x": ${T1}, "y": 1.5, "equityReturn": 0.5, "unitMoney": ""},
        {"y": 1.23},
        {"x": "abc", "y": 1.24},
        {"x": null, "y": 1.25},
        {"x": ${T2}, "y": 1.6, "equityReturn": -0.2, "unitMoney": ""}
      ];
      var Data_ACWorthTrend = [[${T1}, 2.5], [${T2}, 2.6]];
    `;
    const result = await getFundNavHistory(fakeClient(js), '110011');

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ timestamp: T1, nav: 1.5, accNav: 2.5 });
    expect(result.items[1]).toMatchObject({ timestamp: T2, nav: 1.6, accNav: 2.6 });
    // 幽灵"今天"行不存在（x 缺失的行没有以 Date.now() 混入）
    const dates = result.items.map((it) => it.date);
    expect(new Set(dates).size).toBe(2);
  });

  it('y 非数值时 nav 为 null（行保留，日期/accNav 正常）', async () => {
    const js = `
      var Data_netWorthTrend = [{"x": ${T1}, "y": "1.5x", "unitMoney": ""}];
      var Data_ACWorthTrend = [[${T1}, 2.5]];
    `;
    const result = await getFundNavHistory(fakeClient(js), '110011');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].nav).toBeNull();
    expect(result.items[0].accNav).toBe(2.5);
  });

  it('ACWorthTrend 脏行不再经裸 cast 直通：字符串 y → accNav null；脏 x 行跳过', async () => {
    const js = `
      var Data_netWorthTrend = [
        {"x": ${T1}, "y": 1.5, "unitMoney": ""},
        {"x": ${T2}, "y": 1.6, "unitMoney": ""}
      ];
      var Data_ACWorthTrend = [[${T1}, "2.5abc"], ["oops", 9.9], [${T2}, 2.6]];
    `;
    const result = await getFundNavHistory(fakeClient(js), '110011');
    expect(result.items[0].accNav).toBeNull(); // 字符串 y 归一为 null 而非 string 直通
    expect(result.items[1].accNav).toBe(2.6);
  });
});

describe('getFundRankHistory 脏行防御', () => {
  it('series 脏 x 行跳过；百分位序列脏行不建索引', async () => {
    const js = `
      var Data_rateInSimilarType = [
        {"x": ${T1}, "y": 12, "sc": "100"},
        {"y": 99},
        {"x": ${T2}, "y": 10, "sc": "100"}
      ];
      var Data_rateInSimilarPersent = [[${T1}, "88.5oops"], [${T2}, 90.1]];
    `;
    const result = await getFundRankHistory(fakeClient(js), '110011');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].percentile).toBeNull();
    expect(result.items[1].percentile).toBe(90.1);
  });
});
