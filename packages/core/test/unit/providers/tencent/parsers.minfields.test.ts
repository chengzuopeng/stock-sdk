/**
 * R7-9 阈值机制化：MIN_FIELDS 常量恰好覆盖各解析器的【关键 safeNumber 字段】。
 *
 * 本轮 review 修正：阈值不是"最高访问下标"（含 safeNumberOrNull 可空尾部字段，
 * 会误丢字段较少的合法行——指数无五档、ETF/盘前短行），而是"最后一个缺失即被
 * safeNumber(undefined)=0 伪造的关键字段的下标 + 1"。双向钉住：
 *  ① MIN 长度的行，所有关键字段都被真实读到（非 0 伪造）；
 *  ② MIN-1 长度的行，至少一个关键字段被伪造成 0（证明 MIN 是必要下界）。
 */
import { describe, it, expect } from 'vitest';
import {
  parseFullQuote,
  parseSimpleQuote,
  parseHKQuote,
  parseUSQuote,
  parseFundQuote,
  parseFundFlow,
  parsePanelLargeOrder,
  filterTencentRows,
  FULL_QUOTE_MIN_FIELDS,
  SIMPLE_QUOTE_MIN_FIELDS,
  HK_QUOTE_MIN_FIELDS,
  US_QUOTE_MIN_FIELDS,
  FUND_QUOTE_MIN_FIELDS,
  FUND_FLOW_MIN_FIELDS,
  PANEL_LARGE_ORDER_MIN_FIELDS,
} from '../../../../src/providers/tencent/parsers';

/** 用非零标记值填一行；关键字段读到即为该值，未读到（越界）则 safeNumber→0。 */
function markedRow(len: number, mark = '9'): string[] {
  return Array(len).fill(mark);
}

/**
 * 各解析器的关键字段抽取器：数值字段（safeNumber，缺失→0）+ 该解析器 MIN 覆盖到
 * 的最后一个展示字段（如 date/navDate，缺失→''）。返回值里出现 0 或 '' 即表示
 * 有字段未被真实读到。每个抽取器必须包含"下标 = MIN-1"的那个字段，以钉住下界。
 */
const CRITICAL: Record<string, { min: number; pick: (f: string[]) => Array<number | string> }> = {
  full: {
    min: FULL_QUOTE_MIN_FIELDS,
    pick: (f) => {
      const q = parseFullQuote(f);
      return [q.price, q.change, q.changePercent, q.high, q.low, q.amount, q.volume]; // amount f[37]=MIN-1
    },
  },
  simple: {
    min: SIMPLE_QUOTE_MIN_FIELDS,
    pick: (f) => {
      const q = parseSimpleQuote(f);
      return [q.price, q.change, q.changePercent, q.volume, q.amount]; // amount f[7]=MIN-1
    },
  },
  hk: {
    min: HK_QUOTE_MIN_FIELDS,
    pick: (f) => {
      const q = parseHKQuote(f);
      return [q.price, q.change, q.changePercent, q.high, q.low, q.amount]; // amount f[37]=MIN-1
    },
  },
  us: {
    min: US_QUOTE_MIN_FIELDS,
    pick: (f) => {
      const q = parseUSQuote(f);
      return [q.price, q.change, q.changePercent, q.high, q.low, q.amount]; // amount f[37]=MIN-1
    },
  },
  fundQuote: {
    min: FUND_QUOTE_MIN_FIELDS,
    pick: (f) => {
      const q = parseFundQuote(f);
      return [q.nav, q.accNav, q.change, q.navDate]; // navDate f[8]=MIN-1（字符串，缺失→''）
    },
  },
  fundFlow: {
    min: FUND_FLOW_MIN_FIELDS,
    pick: (f) => {
      const q = parseFundFlow(f);
      return [q.mainNet, q.retailNet, q.totalFlow, q.date]; // date f[13]=MIN-1（字符串，缺失→''）
    },
  },
  panel: {
    min: PANEL_LARGE_ORDER_MIN_FIELDS,
    pick: (f) => {
      const q = parsePanelLargeOrder(f);
      return [q.buyLargeRatio, q.sellLargeRatio, q.sellSmallRatio]; // sellSmallRatio f[3]=MIN-1
    },
  },
};

const missing = (v: number | string) => v === 0 || v === '';

describe('MIN_FIELDS 恰好覆盖关键字段（下界钉住，防阈值上下漂移）', () => {
  for (const [name, { min, pick }] of Object.entries(CRITICAL)) {
    it(`${name}: MIN=${min} 长度行的全部关键字段都被真实读到`, () => {
      for (const v of pick(markedRow(min))) {
        expect(missing(v), `${name} 关键字段在 MIN 长度下应被读到`).toBe(false);
      }
    });

    it(`${name}: MIN-1 长度行至少一个关键字段缺失（MIN 是必要下界）`, () => {
      const vals = pick(markedRow(min - 1));
      expect(vals.some(missing), `${name} 的 MIN 若可再减则漏掉关键字段`).toBe(true);
    });
  }
});

describe('filterTencentRows 边界与 HK currency 语义校验', () => {
  const row = (key: string, n: number, first = '9') => ({
    key,
    fields: [first, ...Array(Math.max(0, n - 1)).fill('9')] as string[],
  });

  it('长度门：达到阈值放行，差一拦截；none_match / 空首字段被拦截', () => {
    const wanted = new Set(['sh600519']);
    expect(filterTencentRows([row('sh600519', 38)], wanted, 38)).toHaveLength(1);
    expect(filterTencentRows([row('sh600519', 37)], wanted, 38)).toHaveLength(0);
    expect(filterTencentRows([{ key: 'pv_none_match', fields: ['1'] }], wanted, 38)).toHaveLength(0);
    expect(filterTencentRows([row('sh600519', 38, '')], wanted, 38)).toHaveLength(0);
  });

  it('合法短行（关键字段齐、缺尾部可空字段）保留，尾部字段为 null（指数场景）', () => {
    // 38 字段：价格/涨跌幅/高低/成交额齐全，但无 f[73] 股本等
    const idx = markedRow(38);
    const q = parseFullQuote(idx);
    expect(q.amount).toBe(9); // 关键字段读到
    expect(q.totalShares).toBeNull(); // 尾部可空字段缺失 → null，不伪造
  });

  it('HK currency 尾部相对下标：截断行不再把数值列当币种', () => {
    const truncated = Array(38).fill('123.45') as string[];
    expect(parseHKQuote(truncated).currency).toBe('');
    const normal = Array(50).fill('1') as string[];
    normal[47] = 'HKD';
    expect(parseHKQuote(normal).currency).toBe('HKD');
  });
});
