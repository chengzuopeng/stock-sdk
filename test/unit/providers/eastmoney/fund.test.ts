import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestClient } from '../../../../src/core';
import {
  getFundDividendList,
  getFundEstimate,
  getFundNavHistory,
  getFundProfile,
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
    vi.useRealTimers();
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

  it('F43: 默认 year 按北京时间取年,本地时区跨年不漂移(修 ±1 bug)', async () => {
    // UTC 2025-12-31 20:00 = 北京 2026-01-01 04:00 —— 北京已跨年。
    // 修复前用本地时区 getFullYear():凡本地时区落后于 UTC+8 且本地尚未跨年
    // (如 UTC/美西机器),默认 year 会取 2025;修复后恒按北京年取 2026。
    // 只 fake Date、保留真实 timer,避免干扰 RequestClient 内部异步。
    vi.useFakeTimers({ now: Date.UTC(2025, 11, 31, 20, 0), toFake: ['Date'] });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        lastUrl = String(input);
        return new Response(EMPTY_PAGE, { status: 200 });
      })
    );

    await getFundDividendList(client, {}); // 不传 year

    expect(lastUrl).toContain('year=2026');
  });

  it('F44: 分红金额是严格数字解析(带尾缀的串 → null,不取前缀)', async () => {
    // toFiniteNumberOrNull 保持原局部 parseNumber 的 Number 严格语义:
    // '0.05元' 不能被 parseFloat 式地解析成 0.05
    const payload =
      'var pageinfo = [1, 1, 1]; ' +
      'var jjfh_data = [["999999","测试基金","2024-12-31","2024-12-31","0.05元","2025-01-03","1"]];';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(payload, { status: 200 }))
    );
    const r = await getFundDividendList(client, { year: 2024 });
    expect(r.items[0].dividendPerShare).toBeNull();
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

describe('getFundProfile', () => {
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

  // 合成 pingzhongdata：只含 getFundProfile 读取的变量，格式照搬线上真实结构
  // （manager 真实字段、buySedemption 用「总份额」、swithSameType 单引号二维数组）。
  const PROFILE_BODY = [
    'var fS_code = "000001";',
    'var fS_name = "测试成长混合";',
    'var fund_sourceRate = "1.50";',
    'var fund_Rate = "0.15";',
    'var fund_minsg = "10";',
    'var stockCodesNew = ["0.300308","1.688012","1.600519"];',
    'var zqCodesNew = "1.019827,0.524462";',
    'var Data_assetAllocation = {"series":[' +
      '{"name":"股票占净比","data":[78.32,75.44]},' +
      '{"name":"债券占净比","data":[20.71,20.42]},' +
      '{"name":"现金占净比","data":[1.63,4.92]},' +
      '{"name":"净资产","data":[258.1,260.3]}' +
      '],"categories":["2025-09-30","2025-12-31"]};',
    'var Data_fundSharesPositions = [[1779120000000,84.44],[1779206400000,85.1]];',
    'var Data_currentFundManager = [{"id":"30040527","pic":"https://e.com/p.jpg",' +
      '"name":"郑晓辉","star":5,"workTime":"14年又192天","fundSize":"78.91亿(4只基金)",' +
      '"power":{"avr":"85.35","categories":["经验值","收益率"],"dsc":["d1","d2"],' +
      '"data":[99.5,90.4],"jzrq":"2026-06-18"}}];',
    'var Data_performanceEvaluation = {"avr":"77.00","categories":["选证能力","收益率"],' +
      '"dsc":["d1","d2"],"data":[70,80]};',
    'var Data_holderStructure = {"categories":["2024-06-30","2024-12-31"],"series":[' +
      '{"name":"机构持有比例","data":[30.5,32.1]},' +
      '{"name":"个人持有比例","data":[69.0,67.5]},' +
      '{"name":"内部持有比例","data":[0.5,0.4]}]};',
    'var Data_fluctuationScale = {"categories":["2025-09-30","2025-12-31"],"series":[' +
      '{"y":26.04,"mom":"3.67%"},{"y":25.7,"mom":"-1.31%"}]};',
    'var Data_buySedemption = {"categories":["2025-09-30","2025-12-31"],"series":[' +
      '{"name":"期间申购","data":[12.3,10.1]},' +
      '{"name":"期间赎回","data":[8.2,9.0]},' +
      '{"name":"总份额","data":[100.5,101.6]}]};',
    'var syl_1y="15.67";var syl_3y="33.61";var syl_6y="39.54";var syl_1n="75.93";',
    "var swithSameType = [['001480_财通成长优选混合A_472.06','021528_财通成长优选混合C_469.92']," +
      "['720001_财通价值动量混合A_407.75']];",
  ].join(' ');

  it('builds pingzhongdata URL and parses scalar fields', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(lastUrl).toBe('https://fund.eastmoney.com/pingzhongdata/000001.js');
    expect(p.code).toBe('000001');
    expect(p.name).toBe('测试成长混合');
    expect(p.sourceRate).toBe(1.5);
    expect(p.rate).toBe(0.15);
    expect(p.minSubscription).toBe(10);
  });

  it('parses stock / bond holdings with new market id', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.holdings).toEqual([
      { marketId: '0', code: '300308' },
      { marketId: '1', code: '688012' },
      { marketId: '1', code: '600519' },
    ]);
    expect(p.bondHoldings).toEqual([
      { marketId: '1', code: '019827' },
      { marketId: '0', code: '524462' },
    ]);
  });

  it('skips empty/whitespace segments in bond holdings (no {code:"",marketId:""})', async () => {
    // 上游尾随逗号 / 空格段不应产出畸形持仓
    stubPingzhongdata('var zqCodesNew = "1.019827, 0.524462,";');
    const p = await getFundProfile(client, '000001');
    expect(p.bondHoldings).toEqual([
      { marketId: '1', code: '019827' },
      { marketId: '0', code: '524462' },
    ]);
  });

  it('parses asset allocation; otherRatio defaults to 0 when its series is absent', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.assetAllocation).toHaveLength(2);
    expect(p.assetAllocation[0]).toEqual({
      date: '2025-09-30',
      timestamp: Date.parse('2025-09-30T00:00:00+08:00'),
      stockRatio: 78.32,
      bondRatio: 20.71,
      cashRatio: 1.63,
      otherRatio: 0, // 上游无「其他占净比」series → 默认 0
      netAsset: 258.1,
    });
  });

  it('parses managers with the real schema (regression: was all-zero/null)', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.managers).toHaveLength(1);
    const m = p.managers[0];
    expect(m).toMatchObject({
      id: '30040527',
      name: '郑晓辉',
      avatarUrl: 'https://e.com/p.jpg',
      star: 5,
      workTime: '14年又192天',
      fundSize: '78.91亿(4只基金)',
    });
    // power 复用业绩评价结构（avr/categories/dsc/data）
    expect(m.power).toEqual({
      overall: 85.35,
      categories: ['经验值', '收益率'],
      scores: [99.5, 90.4],
      descriptions: ['d1', 'd2'],
    });
    // 旧实现臆造的字段已彻底移除
    expect(m).not.toHaveProperty('daysInOffice');
    expect(m).not.toHaveProperty('currentFundScale');
  });

  it('parses performance evaluation', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.performance).toEqual({
      overall: 77,
      categories: ['选证能力', '收益率'],
      scores: [70, 80],
      descriptions: ['d1', 'd2'],
    });
  });

  it('parses holder structure and daily positions', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.holderStructure[0]).toEqual({
      date: '2024-06-30',
      timestamp: Date.parse('2024-06-30T00:00:00+08:00'),
      institutionRatio: 30.5,
      individualRatio: 69.0,
      internalRatio: 0.5,
    });
    // pingzhongdata 的 x 是「北京时间当日 00:00」(= 16:00 UTC)，date 取北京日历日：
    // 1779120000000 = 2026-05-18T16:00Z = 北京 2026-05-19（按 UTC 切片会偏早一天）
    expect(p.positions).toEqual([
      { date: '2026-05-19', timestamp: 1779120000000, position: 84.44 },
      { date: '2026-05-20', timestamp: 1779206400000, position: 85.1 },
    ]);
  });

  it('drops positions with non-finite timestamps instead of throwing', async () => {
    // 上游若塞入 null/NaN 时间戳，timestampToDate 内部 Intl 会抛 RangeError；应被过滤
    stubPingzhongdata(
      'var Data_fundSharesPositions = [[1779120000000,84.44],[null,9],[1779206400000,85.1]];'
    );
    const p = await getFundProfile(client, '000001');
    expect(p.positions).toEqual([
      { date: '2026-05-19', timestamp: 1779120000000, position: 84.44 },
      { date: '2026-05-20', timestamp: 1779206400000, position: 85.1 },
    ]);
  });

  it('parses buy/redemption via the 总份额 series (regression: total was always 0)', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.buySedemption).toHaveLength(2);
    expect(p.buySedemption[0]).toMatchObject({ buy: 12.3, sell: 8.2, total: 100.5 });
    expect(p.buySedemption[1].total).toBe(101.6);
  });

  it('parses scale changes (mom without leading +) and stage returns', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.scaleChanges[0]).toEqual({ date: '2025-09-30', scale: 26.04, mom: '3.67%' });
    // 负向环比：保留前导 '-'，但正向不带 '+'
    expect(p.scaleChanges[1]).toEqual({ date: '2025-12-31', scale: 25.7, mom: '-1.31%' });
    // syl_1y=近一月 / syl_3y=近三月 / syl_6y=近6月 / syl_1n=近一年
    expect(p.stageReturns).toEqual({
      oneMonth: 15.67,
      threeMonth: 33.61,
      sixMonth: 39.54,
      oneYear: 75.93,
    });
  });

  it('parses sameType from single-quoted nested arrays (regression: was null on Node)', async () => {
    stubPingzhongdata(PROFILE_BODY);
    const p = await getFundProfile(client, '000001');
    expect(p.sameType).not.toBeNull();
    expect(p.sameType!.groups).toEqual([
      [
        { code: '001480', name: '财通成长优选混合A', value: 472.06 },
        { code: '021528', name: '财通成长优选混合C', value: 469.92 },
      ],
      [{ code: '720001', name: '财通价值动量混合A', value: 407.75 }],
    ]);
  });

  it('degrades to empty/null on missing variables without throwing', async () => {
    stubPingzhongdata('var fS_code = "000002";');
    const p = await getFundProfile(client, '000002');
    expect(p.code).toBe('000002');
    expect(p.holdings).toEqual([]);
    expect(p.managers).toEqual([]);
    expect(p.performance).toBeNull();
    expect(p.sameType).toBeNull();
    expect(p.assetAllocation).toEqual([]);
    expect(p.buySedemption).toEqual([]);
    expect(p.stageReturns).toEqual({
      oneMonth: null,
      threeMonth: null,
      sixMonth: null,
      oneYear: null,
    });
  });
});
