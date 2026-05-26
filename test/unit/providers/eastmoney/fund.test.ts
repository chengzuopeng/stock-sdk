import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestClient } from '../../../../src/core';
import {
  getFundDividendList,
  getFundEstimate,
  getFundNavHistory,
  getFundRankHistory,
} from '../../../../src/providers/eastmoney/fund';

// 关掉重试避免 500 / 网络错误测试触发 backoff，拖慢测试套件
const client = new RequestClient({ retry: { maxRetries: 0 } });

/**
 * 用 stubGlobal('fetch') 做端到端测试：
 * - 验证 URL 拼接
 * - 验证 fetchJsVars → mapRow 整条链路
 * - 验证客户端 code 过滤与 page='all' 翻页聚合
 */

interface FetchMock {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const PAGE1 =
  'var pageinfo = [3, 2, 1]; ' +
  'var jjfh_data = [' +
  '["110011","易方达优质精选混合","2024-12-31","2024-12-31","0.05","2025-01-03","1"],' +
  '["508019","中金湖北科投光谷REIT","2024-12-31","2024-12-31","0.03033","2025-01-03","6"]' +
  ']; ' +
  'var jjfh_ftype = []; var jjfh_jjgs = []; var jjfh_year = [];';

const PAGE2 =
  'var pageinfo = [3, 2, 2]; ' +
  'var jjfh_data = [' +
  '["004517","南方安康混合A","2024-12-30","2024-12-30","0.0309","2025-01-02","1"],' +
  '["110011","易方达优质精选混合","2024-06-30","2024-06-30","0.03","2024-07-03","1"]' +
  '];';

const PAGE3 =
  'var pageinfo = [3, 2, 3]; ' +
  'var jjfh_data = [' +
  '["021247","兴证全球红利混合A","2024-03-31","2024-03-31","0.02788","2024-04-03","1"]' +
  '];';

const EMPTY_PAGE =
  'var pageinfo = [0, 0, 1]; var jjfh_data = [];';

function mockFetchByQueue(pages: string[]): FetchMock {
  let i = 0;
  return vi.fn(async () => {
    const body = pages[Math.min(i, pages.length - 1)];
    i++;
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/javascript' },
    });
  });
}

describe('getFundDividendList', () => {
  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  it('builds URL with default params and parses single page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(PAGE1, { status: 200 });
      })
    );
    const r = await getFundDividendList(client,{ year: 2024 });
    // 默认参数：dt=8 / rank=FSRQ / sort=desc / page=1 / gs= / ftype=
    expect(lastUrl).toContain(
      'fund.eastmoney.com/Data/funddataIndex_Interface.aspx'
    );
    expect(lastUrl).toContain('dt=8');
    expect(lastUrl).toContain('page=1');
    expect(lastUrl).toContain('rank=FSRQ');
    expect(lastUrl).toContain('sort=desc');
    expect(lastUrl).toContain('year=2024');

    expect(r.totalPages).toBe(3);
    expect(r.pageSize).toBe(2);
    expect(r.currentPage).toBe(1);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({
      code: '110011',
      name: '易方达优质精选混合',
      equityRecordDate: '2024-12-31',
      exDividendDate: '2024-12-31',
      dividendPerShare: 0.05,
      payDate: '2025-01-03',
    });
    expect(r.items[0].raw).toHaveLength(7);
    expect(r.items[0].raw[6]).toBe('1'); // 类型代码原样保留
  });

  it('honors custom rank / sort / fundType / page params', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(PAGE2, { status: 200 });
      })
    );
    await getFundDividendList(client,{
      year: 2024,
      page: 2,
      rank: 'FHFCZ',
      sort: 'asc',
      fundType: '股票型',
    });
    expect(lastUrl).toContain('page=2');
    expect(lastUrl).toContain('rank=FHFCZ');
    expect(lastUrl).toContain('sort=asc');
    expect(lastUrl).toContain('ftype=%E8%82%A1%E7%A5%A8%E5%9E%8B'); // urlencoded '股票型'
  });

  it("aggregates all pages when page is 'all'", async () => {
    vi.stubGlobal('fetch', mockFetchByQueue([PAGE1, PAGE2, PAGE3]));
    const r = await getFundDividendList(client,{ year: 2024, page: 'all' });
    expect(r.items).toHaveLength(5); // 2 + 2 + 1
    expect(r.currentPage).toBe(-1);
    expect(r.totalPages).toBe(3);
  });

  it('filters by code on single page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(PAGE1, { status: 200 }))
    );
    const r = await getFundDividendList(client,{ year: 2024, code: '110011' });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].code).toBe('110011');
  });

  it("filters by code across all pages when page='all'", async () => {
    vi.stubGlobal('fetch', mockFetchByQueue([PAGE1, PAGE2, PAGE3]));
    const r = await getFundDividendList(client,{
      year: 2024,
      page: 'all',
      code: '110011',
    });
    // 110011 在 PAGE1 和 PAGE2 各出现一次
    expect(r.items).toHaveLength(2);
    expect(r.items.every((it) => it.code === '110011')).toBe(true);
  });

  it('handles empty page gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(EMPTY_PAGE, { status: 200 }))
    );
    const r = await getFundDividendList(client,{ year: 2099 });
    expect(r.items).toEqual([]);
    expect(r.totalPages).toBe(0);
    expect(r.pageSize).toBe(0);
  });

  it('coerces missing / empty numeric and date fields to null', async () => {
    const payload =
      'var pageinfo = [1, 1, 1]; ' +
      'var jjfh_data = [["999999","测试基金","","","","",""]];';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(payload, { status: 200 }))
    );
    const r = await getFundDividendList(client,{ year: 2024 });
    expect(r.items[0]).toMatchObject({
      code: '999999',
      name: '测试基金',
      equityRecordDate: null,
      exDividendDate: null,
      dividendPerShare: null,
      payDate: null,
    });
  });
});

describe('getFundNavHistory', () => {
  // 三个交易日的 UTC midnight 时间戳
  const T1 = Date.UTC(2024, 0, 2); // 2024-01-02
  const T2 = Date.UTC(2024, 0, 3); // 2024-01-03
  const T3 = Date.UTC(2024, 0, 4); // 2024-01-04

  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  function stubPingzhongdata(body: string): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(body, {
          status: 200,
          headers: { 'content-type': 'application/javascript' },
        });
      })
    );
  }

  it('builds pingzhongdata URL and parses nav + accNav aligned by timestamp', async () => {
    const body =
      'var fS_code = "110011"; ' +
      'var fS_name = "易方达优质精选混合(QDII)"; ' +
      `var Data_netWorthTrend = [` +
      `{"x":${T1},"y":1.0,"equityReturn":0.0,"unitMoney":""},` +
      `{"x":${T2},"y":1.0050,"equityReturn":0.50,"unitMoney":""},` +
      `{"x":${T3},"y":1.0030,"equityReturn":-0.20,"unitMoney":""}` +
      `]; ` +
      `var Data_ACWorthTrend = [[${T1},1.5000],[${T2},1.5050],[${T3},1.5030]];`;
    stubPingzhongdata(body);

    const h = await getFundNavHistory(client,'110011');
    expect(lastUrl).toBe('https://fund.eastmoney.com/pingzhongdata/110011.js');
    expect(h.code).toBe('110011');
    expect(h.name).toBe('易方达优质精选混合(QDII)');
    expect(h.items).toHaveLength(3);
    expect(h.items[0]).toEqual({
      date: '2024-01-02',
      timestamp: T1,
      nav: 1.0,
      accNav: 1.5,
      dailyReturn: 0,
      unitMoney: '',
    });
    expect(h.items[1].dailyReturn).toBe(0.5);
    expect(h.items[2].nav).toBeCloseTo(1.003);
    expect(h.items[2].accNav).toBeCloseTo(1.503);
  });

  it('sets accNav to null when timestamp not in Data_ACWorthTrend', async () => {
    const body =
      `var Data_netWorthTrend = [` +
      `{"x":${T1},"y":1.0,"equityReturn":0,"unitMoney":""},` +
      `{"x":${T2},"y":1.01,"equityReturn":1,"unitMoney":""}` +
      `]; ` +
      `var Data_ACWorthTrend = [[${T1},1.50]];`; // T2 缺失
    stubPingzhongdata(body);
    const h = await getFundNavHistory(client,'110011');
    expect(h.items[0].accNav).toBe(1.5);
    expect(h.items[1].accNav).toBeNull();
  });

  it('sets all accNav to null when Data_ACWorthTrend is missing', async () => {
    const body =
      `var Data_netWorthTrend = [{"x":${T1},"y":1.0,"equityReturn":0,"unitMoney":""}];`;
    stubPingzhongdata(body);
    const h = await getFundNavHistory(client,'110011');
    expect(h.items).toHaveLength(1);
    expect(h.items[0].accNav).toBeNull();
  });

  it('returns empty items when Data_netWorthTrend is missing', async () => {
    const body = 'var fS_name = "X";';
    stubPingzhongdata(body);
    const h = await getFundNavHistory(client,'110011');
    expect(h.items).toEqual([]);
    expect(h.name).toBe('X');
    expect(h.code).toBe('110011'); // 回填入参
  });

  it('parses equityReturn as both number and string forms', async () => {
    const body =
      `var Data_netWorthTrend = [` +
      `{"x":${T1},"y":1.0,"equityReturn":"0.50","unitMoney":""},` +
      `{"x":${T2},"y":1.01,"equityReturn":1.25,"unitMoney":""},` +
      `{"x":${T3},"y":1.02,"equityReturn":"","unitMoney":""}` +
      `];`;
    stubPingzhongdata(body);
    const h = await getFundNavHistory(client,'110011');
    expect(h.items[0].dailyReturn).toBe(0.5);
    expect(h.items[1].dailyReturn).toBe(1.25);
    expect(h.items[2].dailyReturn).toBeNull();
  });

  it('preserves unitMoney for money-market funds', async () => {
    const body =
      `var Data_netWorthTrend = [{"x":${T1},"y":1.0,"equityReturn":0,"unitMoney":"0.5432"}];`;
    stubPingzhongdata(body);
    const h = await getFundNavHistory(client,'000001');
    expect(h.items[0].unitMoney).toBe('0.5432');
  });

  it('url-encodes special characters in fund code', async () => {
    stubPingzhongdata('var Data_netWorthTrend = [];');
    await getFundNavHistory(client,'110/011');
    expect(lastUrl).toContain('/pingzhongdata/110%2F011.js');
  });
});

describe('getFundEstimate', () => {
  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  function stubFundGz(jsonpBody: string): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(jsonpBody, {
          status: 200,
          headers: { 'content-type': 'application/javascript' },
        });
      })
    );
  }

  it('builds fundgz URL with rt cache-buster and parses full payload', async () => {
    stubFundGz(
      'jsonpgz({"fundcode":"005827","name":"易方达蓝筹精选混合","jzrq":"2026-05-25","dwjz":"1.6210","gsz":"1.6114","gszzl":"-0.59","gztime":"2026-05-26 15:00"});'
    );
    const r = await getFundEstimate(client,'005827');
    expect(lastUrl).toContain('https://fundgz.1234567.com.cn/js/005827.js?rt=');
    expect(r).toEqual({
      code: '005827',
      name: '易方达蓝筹精选混合',
      navDate: '2026-05-25',
      nav: 1.621,
      estimatedNav: 1.6114,
      estimatedChangePercent: -0.59,
      estimateTime: '2026-05-26 15:00',
    });
  });

  it('returns null estimates when fields are "--" or missing', async () => {
    stubFundGz(
      'jsonpgz({"fundcode":"005827","name":"X","jzrq":"2026-05-25","dwjz":"1.0000","gsz":"--","gszzl":"","gztime":""});'
    );
    const r = await getFundEstimate(client,'005827');
    expect(r.nav).toBe(1);
    expect(r.estimatedNav).toBeNull();
    expect(r.estimatedChangePercent).toBeNull();
    expect(r.estimateTime).toBeNull();
  });

  it('returns all-null payload when response body is empty', async () => {
    stubFundGz('');
    const r = await getFundEstimate(client,'999999');
    expect(r).toEqual({
      code: '999999',
      name: null,
      navDate: null,
      nav: null,
      estimatedNav: null,
      estimatedChangePercent: null,
      estimateTime: null,
    });
  });

  it('throws on non-2xx HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    );
    // 走 RequestClient 后错误由 SDK 统一 normalize 成 HttpError，message 含 status
    await expect(getFundEstimate(client, '005827')).rejects.toThrow(/500/);
  });

  it('encodes special characters in fund code', async () => {
    stubFundGz('jsonpgz({});');
    await getFundEstimate(client,'00/01');
    expect(lastUrl).toContain('/js/00%2F01.js?');
  });
});

describe('getFundRankHistory', () => {
  const T1 = Date.UTC(2024, 0, 2);
  const T2 = Date.UTC(2024, 0, 3);
  const T3 = Date.UTC(2024, 0, 4);

  let lastUrl: string | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    lastUrl = undefined;
  });

  function stubPingzhongdata(body: string): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(body, { status: 200 });
      })
    );
  }

  it('parses rank + total + percentile aligned by timestamp', async () => {
    const body =
      'var fS_code = "110011"; ' +
      'var fS_name = "易方达"; ' +
      `var Data_rateInSimilarType = [` +
      `{"x":${T1},"y":27,"sc":"59"},` +
      `{"x":${T2},"y":21,"sc":"59"},` +
      `{"x":${T3},"y":17,"sc":"60"}` +
      `]; ` +
      `var Data_rateInSimilarPersent = [[${T1},54.24],[${T2},64.41],[${T3},71.19]];`;
    stubPingzhongdata(body);

    const r = await getFundRankHistory(client,'110011');
    expect(lastUrl).toBe('https://fund.eastmoney.com/pingzhongdata/110011.js');
    expect(r.code).toBe('110011');
    expect(r.name).toBe('易方达');
    expect(r.items).toHaveLength(3);
    expect(r.items[0]).toEqual({
      date: '2024-01-02',
      timestamp: T1,
      rank: 27,
      total: 59, // "59" 字符串被转为数字
      percentile: 54.24,
    });
    expect(r.items[2].total).toBe(60);
  });

  it('falls back to null percentile when timestamp missing in percent series', async () => {
    const body =
      `var Data_rateInSimilarType = [{"x":${T1},"y":10,"sc":"100"},{"x":${T2},"y":11,"sc":"100"}]; ` +
      `var Data_rateInSimilarPersent = [[${T1},10.0]];`;
    stubPingzhongdata(body);
    const r = await getFundRankHistory(client,'110011');
    expect(r.items[0].percentile).toBe(10);
    expect(r.items[1].percentile).toBeNull();
  });

  it('returns empty items when Data_rateInSimilarType is missing', async () => {
    stubPingzhongdata('var fS_name = "X";');
    const r = await getFundRankHistory(client,'110011');
    expect(r.items).toEqual([]);
    expect(r.name).toBe('X');
    expect(r.code).toBe('110011');
  });
});
