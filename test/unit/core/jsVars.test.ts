import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseJsVars, fetchJsVars } from '../../../src/core';
import { BROWSER_JSVARS_MUTEX_KEY } from '../../../src/core/jsVars';
import { __resetScriptMutex } from '../../../src/core/scriptMutex';

describe('parseJsVars (synchronous text extraction)', () => {
  it('extracts an array literal', () => {
    const text = 'var arr = [1, 2, 3];';
    expect(parseJsVars<{ arr: number[] }>(text, ['arr'])).toEqual({
      arr: [1, 2, 3],
    });
  });

  it('extracts a nested array literal', () => {
    const text = 'var data = [["a", 1], ["b", 2]];';
    expect(parseJsVars<{ data: unknown[] }>(text, ['data'])).toEqual({
      data: [
        ['a', 1],
        ['b', 2],
      ],
    });
  });

  it('extracts an object literal', () => {
    const text = 'var obj = {"k": "v", "n": 42};';
    expect(parseJsVars<{ obj: Record<string, unknown> }>(text, ['obj'])).toEqual({
      obj: { k: 'v', n: 42 },
    });
  });

  it('extracts string / number / boolean / null', () => {
    const text =
      'var s = "hello"; var n = 3.14; var b = true; var z = null;';
    expect(parseJsVars(text, ['s', 'n', 'b', 'z'])).toEqual({
      s: 'hello',
      n: 3.14,
      b: true,
      z: null,
    });
  });

  it('handles semicolons inside string values without splitting', () => {
    const text = 'var s = "a;b;c"; var n = 1;';
    expect(parseJsVars(text, ['s', 'n'])).toEqual({ s: 'a;b;c', n: 1 });
  });

  it('handles brackets inside string values without breaking nesting', () => {
    const text = 'var s = "][}{"; var arr = [1, 2];';
    expect(parseJsVars(text, ['s', 'arr'])).toEqual({
      s: '][}{',
      arr: [1, 2],
    });
  });

  it('accepts var / let / const declarations', () => {
    const text = 'var a = 1; let b = 2; const c = 3;';
    expect(parseJsVars(text, ['a', 'b', 'c'])).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('returns no key for variables that are not present', () => {
    const text = 'var a = 1;';
    const out = parseJsVars(text, ['a', 'missing'] as ('a' | 'missing')[]);
    expect(out).toEqual({ a: 1 });
    expect('missing' in out).toBe(false);
  });

  it('returns no key for variables whose value is not valid JSON', () => {
    // 未引号 key：单引号兜底也救不回来（归一后仍是非法 JSON）→ 丢弃
    const text = "var bad = {key: 'value'}; var good = [1];";
    const out = parseJsVars(text, ['bad', 'good']);
    expect(out).toEqual({ good: [1] });
    expect('bad' in out).toBe(false);
  });

  it('parses single-quoted string arrays via fallback (e.g. pingzhongdata swithSameType)', () => {
    // 东财 swithSameType：单引号字符串的嵌套数组，非严格 JSON；
    // 浏览器端 <script> 注入能直接拿到，这里验证 Node 端兜底对齐。
    const text =
      "var swithSameType = [['001480_财通成长优选混合A_472.06','021528_财通C_469.92'],['720001_财通价值动量混合A_407.75']];";
    const out = parseJsVars<{ swithSameType: string[][] }>(text, [
      'swithSameType',
    ]);
    expect(out.swithSameType).toEqual([
      ['001480_财通成长优选混合A_472.06', '021528_财通C_469.92'],
      ['720001_财通价值动量混合A_407.75'],
    ]);
  });

  it('is quote-aware when normalizing single quotes', () => {
    // 单引号串内含双引号、双引号串内含单引号——确保归一不串味
    const text = `var v = ['a"b', "it's ok"];`;
    const out = parseJsVars<{ v: string[] }>(text, ['v']);
    expect(out.v).toEqual(['a"b', "it's ok"]);
  });

  it('parses real funddataIndex_Interface-style payload', () => {
    const text =
      'var pageinfo = [67, 100, 1]; ' +
      'var jjfh_data = [' +
      '["508019","中金湖北科投光谷REIT","2024-12-31","2024-12-31","0.03033","2025-01-03","6"],' +
      '["110011","易方达优质精选混合","2024-12-30","2024-12-30","0.05","2024-12-31","1"]' +
      '];';
    const out = parseJsVars<{
      pageinfo: [number, number, number];
      jjfh_data: string[][];
    }>(text, ['pageinfo', 'jjfh_data']);
    expect(out.pageinfo).toEqual([67, 100, 1]);
    expect(out.jjfh_data).toHaveLength(2);
    expect(out.jjfh_data?.[1][0]).toBe('110011');
  });

  it('parses real pingzhongdata-style net worth trend', () => {
    const text =
      'var fS_name = "测试基金"; ' +
      'var Data_netWorthTrend = [{"x":1262620800000,"y":1.0,"equityReturn":0.0,"unitMoney":""},{"x":1262707200000,"y":1.0002,"equityReturn":0.02,"unitMoney":""}];';
    const out = parseJsVars<{
      fS_name: string;
      Data_netWorthTrend: Array<{ x: number; y: number; equityReturn: number }>;
    }>(text, ['fS_name', 'Data_netWorthTrend']);
    expect(out.fS_name).toBe('测试基金');
    expect(out.Data_netWorthTrend).toHaveLength(2);
    expect(out.Data_netWorthTrend?.[1].y).toBeCloseTo(1.0002);
  });
});

describe('fetchJsVars (Node fetch path)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('var a = [10, 20]; var b = "ok";', {
          status: 200,
          headers: { 'content-type': 'application/javascript' },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed variables when HTTP 200', async () => {
    const out = await fetchJsVars<{ a: number[]; b: string }>(
      'https://example.com/x.js',
      ['a', 'b']
    );
    expect(out).toEqual({ a: [10, 20], b: 'ok' });
  });

  it('throws on non-2xx HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    );
    await expect(
      fetchJsVars('https://example.com/x.js', ['a'])
    ).rejects.toThrow(/status: 500/);
  });

  it('throws on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError')
              );
            });
          })
      )
    );
    await expect(
      fetchJsVars('https://example.com/x.js', ['a'], { timeout: 50 })
    ).rejects.toThrow(/timed out after 50ms/);
  });
});

describe('fetchJsVars (browser concurrency safety with mutex)', () => {
  // 模拟浏览器环境：vi.stubGlobal 注入最小 document / window，让 fetchJsVars
  // 走 browserFetchJsVars 路径。这样可以验证 mutex 是否真的把"变量名集合不同
  // 但有交集"的并发请求串行化了（即 P1 修复点）。

  interface FakeScript {
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
    parentNode: { removeChild: (el: FakeScript) => void } | null;
  }

  let scripts: FakeScript[];
  let fakeWindow: Record<string, unknown>;

  // 等待 mutex 内部 promise 链多轮 microtask 全部推进
  async function flushMicrotasks() {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  beforeEach(() => {
    scripts = [];
    fakeWindow = {};
    __resetScriptMutex();

    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        if (tag !== 'script') {
          throw new Error(`unexpected createElement: ${tag}`);
        }
        const el: FakeScript = {
          src: '',
          onload: null,
          onerror: null,
          parentNode: null,
        };
        scripts.push(el);
        return el;
      },
      head: {
        appendChild: (el: FakeScript) => {
          el.parentNode = { removeChild: () => {} };
        },
      },
    });
    vi.stubGlobal('window', fakeWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetScriptMutex();
  });

  it('exposes a single global mutex key for the browser path', () => {
    expect(BROWSER_JSVARS_MUTEX_KEY).toBe('jsVars');
  });

  it('serializes two concurrent calls whose varName sets DIFFER but OVERLAP (regression for P1 cross-set leak)', async () => {
    // 关键场景：模拟 getFundNavHistory 与 getFundRankHistory 的真实交集：
    //   nav  → ['fS_code', 'fS_name', 'Data_netWorthTrend', 'Data_ACWorthTrend']
    //   rank → ['fS_code', 'fS_name', 'Data_rateInSimilarType', 'Data_rateInSimilarPersent']
    // 集合不同，但都写 fS_code / fS_name。旧实现按集合分组 mutex key，两者并发
    // 会进入不同队列 → 同时刻 onload → fS_code / fS_name 互相覆盖。
    // 修复后全部 fetchJsVars 共享单一 mutex key，必须严格串行。

    const p1 = fetchJsVars<{ fS_code: string; payload_nav: number }>(
      'http://x/nav.js',
      ['fS_code', 'payload_nav']
    );
    const p2 = fetchJsVars<{ fS_code: string; payload_rank: number }>(
      'http://x/rank.js',
      ['fS_code', 'payload_rank']
    );

    await flushMicrotasks();
    // 互斥生效：第 2 个 script 还未创建
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe('http://x/nav.js');

    // p1 模拟"基金 A"的脚本加载完成
    fakeWindow.fS_code = 'A';
    fakeWindow.payload_nav = 111;
    scripts[0].onload!();
    const r1 = await p1;

    await flushMicrotasks();
    // 现在 p2 才进入执行；如果不串行，两个 script 早就在第一次 flush 时都被创建了
    expect(scripts).toHaveLength(2);
    expect(scripts[1].src).toBe('http://x/rank.js');

    // p2 模拟"基金 B"的脚本加载完成
    fakeWindow.fS_code = 'B';
    fakeWindow.payload_rank = 222;
    scripts[1].onload!();
    const r2 = await p2;

    // 关键断言：fS_code 没被串
    expect(r1.fS_code).toBe('A');
    expect(r1.payload_nav).toBe(111);
    expect(r2.fS_code).toBe('B');
    expect(r2.payload_rank).toBe(222);
  });

  it('cleans up window keys after each call so subsequent reads do not leak', async () => {
    const p1 = fetchJsVars<{ x: number }>('http://x/1.js', ['x']);
    await flushMicrotasks();
    fakeWindow.x = 42;
    scripts[0].onload!();
    await p1;

    // 第 1 次读完应该已 delete window.x，避免污染下一次
    expect('x' in fakeWindow).toBe(false);

    // 第 2 次：什么都不设，应拿不到值（key 不出现在结果里）
    const p2 = fetchJsVars<{ x: number }>('http://x/2.js', ['x']);
    await flushMicrotasks();
    scripts[1].onload!();
    const r2 = await p2;
    expect('x' in r2).toBe(false);
  });
});
