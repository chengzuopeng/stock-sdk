/**
 * 东方财富 - 公募基金扩展数据
 *
 * 数据源：https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx
 *
 * 该接口返回一段 JS 变量声明（`var pageinfo = ...; var jjfh_data = ...;`），
 * 通过 fetchJsVars 双端解析。
 */
import { fetchJsVars } from '../../core/jsVars';
import { extractJsonFromJsonp } from '../../core/jsonp';
import { SdkError } from '../../core/errors';
import { withScriptMutex } from '../../core/scriptMutex';
import { toFiniteNumberOrNull } from '../../core/parser';
import { todayInTz, MARKET_TZ } from '../../core/time';
import type { RequestClient } from '../../core/request';
import type {
  FundDividend,
  FundDividendListOptions,
  FundDividendListResult,
  FundEstimate,
  FundNavHistory,
  FundNavPoint,
  FundRankHistory,
  FundRankPoint,
  FundProfile,
  FundHolding,
  FundBondHolding,
  FundAssetAllocation,
  FundPositionPoint,
  FundManager,
  FundPerformanceEvaluation,
  FundHolderStructure,
  FundScaleChange,
  FundBuySedemption,
  FundStageReturns,
  FundSameType,
} from '../../types';

const FUND_DATA_INDEX_URL =
  'https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx';

const FUND_PINGZHONGDATA_URL = 'https://fund.eastmoney.com/pingzhongdata';

/** 天天基金实时估值接口（JSONP，callback 名固定为 `jsonpgz`） */
const FUND_GZ_URL = 'https://fundgz.1234567.com.cn/js';

/**
 * 运行时检查是否在浏览器环境。
 * 写成函数（而非 module-level const）是为了让单测能通过 `vi.stubGlobal` 动态切换环境。
 */
function isBrowserEnv(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

const DEFAULT_FUNDGZ_TIMEOUT_MS = 10000;

interface FundDividendRaw {
  /** `[总页数, 每页条数, 当前页]` */
  pageinfo?: [number, number, number];
  /** 每条 7 个字段：`[code, name, 登记日, 除息日, 分红, 发放日, 类型]` */
  jjfh_data?: string[][];
}

function currentYearShanghai(): number {
  // F43: 按北京时间(Asia/Shanghai)取年份。此前用本地时区 getFullYear(),
  // 跨年瞬间在非 UTC+8 时区会差 ±1 年(如美西 12-31 晚已是北京 1-1)。
  return Number(todayInTz(MARKET_TZ.CN).slice(0, 4));
}

function buildUrl(opts: FundDividendListOptions, page: number): string {
  const params = new URLSearchParams({
    dt: '8',
    page: String(page),
    rank: opts.rank ?? 'FSRQ',
    sort: opts.sort ?? 'desc',
    gs: '',
    ftype: opts.fundType ?? '',
    year: String(opts.year ?? currentYearShanghai()),
  });
  return `${FUND_DATA_INDEX_URL}?${params.toString()}`;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// F44: 本文件原有 parseNumber / toNullableNumber / toDailyReturn / toNullableInt
// 四个语义完全一致的局部数字解析器(undefined/''/'--' → null,Number 严格解析,
// 拒绝 Infinity),统一收编为 core/parser 的 toFiniteNumberOrNull。

function mapRow(row: string[]): FundDividend {
  return {
    code: row[0] ?? '',
    name: row[1] ?? '',
    equityRecordDate: parseDate(row[2]),
    exDividendDate: parseDate(row[3]),
    dividendPerShare: toFiniteNumberOrNull(row[4]),
    payDate: parseDate(row[5]),
    // v1 时代该列只能通过 raw[6] 获取;v2 删除 raw 后必须显式映射,否则数据不可达
    dividendType: row[6]?.trim() ? row[6].trim() : null,
  };
}

/** 拉取单页（不做客户端过滤、不做翻页聚合） */
async function fetchOnePage(
  client: RequestClient,
  opts: FundDividendListOptions,
  page: number
): Promise<FundDividendListResult> {
  const url = buildUrl(opts, page);
  const vars = await fetchJsVars<FundDividendRaw>(
    url,
    ['pageinfo', 'jjfh_data'],
    { client }
  );
  const info = vars.pageinfo ?? [0, 0, page];
  const [totalPages = 0, pageSize = 0, currentPage = page] = info;
  const rawRows = vars.jjfh_data ?? [];
  return {
    items: rawRows.map(mapRow),
    totalPages,
    pageSize,
    currentPage,
  };
}

/**
 * 获取基金分红明细列表（来自东方财富 / 天天基金分红送配频道）。
 *
 * 接口本身只支持「年份 + 全市场 + 翻页」查询，不能服务端按基金代码精确查。
 * SDK 提供 `code` 选项在客户端过滤；若要拿到某只基金该年完整分红记录，
 * 应搭配 `page: 'all'` 一起使用。
 *
 * @example
 * // 拉 2024 年第 1 页（默认按除息日倒序）
 * await sdk.fund.dividendList({ year: 2024 });
 *
 * @example
 * // 拉 2024 年 110011 的全部分红
 * await sdk.fund.dividendList({ year: 2024, page: 'all', code: '110011' });
 */
export async function getFundDividendList(
  client: RequestClient,
  options: FundDividendListOptions = {}
): Promise<FundDividendListResult> {
  if (options.page === 'all') {
    const first = await fetchOnePage(client, options, 1);
    let items = first.items;
    for (let p = 2; p <= first.totalPages; p++) {
      const next = await fetchOnePage(client, options, p);
      items = items.concat(next.items);
    }
    if (options.code) {
      items = items.filter((it) => it.code === options.code);
    }
    return {
      items,
      totalPages: first.totalPages,
      pageSize: first.pageSize,
      currentPage: -1,
    };
  }

  const page = options.page ?? 1;
  const result = await fetchOnePage(client, options, page);
  if (options.code) {
    return {
      ...result,
      items: result.items.filter((it) => it.code === options.code),
    };
  }
  return result;
}

// ============================================================
// 历史净值（pingzhongdata.js）
// ============================================================

interface FundNavRaw {
  fS_code?: string;
  fS_name?: string;
  /** `[{x, y, equityReturn, unitMoney}, ...]` —— 单位净值走势 */
  Data_netWorthTrend?: Array<{
    x: number;
    y: number;
    equityReturn: number | string;
    unitMoney: string;
  }>;
  /** `[[x, accNav], ...]` —— 累计净值走势 */
  Data_ACWorthTrend?: Array<[number, number]>;
}

function timestampToDate(ts: number): string {
  // pingzhongdata 的 x 是 UTC 当日 00:00 的毫秒数（每条对应 A 股一个交易日）
  // 直接用 ISO 字符串切前 10 位即可得到 YYYY-MM-DD
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * 获取基金历史净值（单位净值 + 累计净值，按 timestamp 对齐合并）。
 *
 * 数据源：`https://fund.eastmoney.com/pingzhongdata/{code}.js`
 *
 * 一次请求拿到该基金从成立日到最新交易日的全部净值（数千条），
 * 无需翻页。开放式基金、ETF、LOF、货币、QDII 均通用。
 *
 * @param code 基金代码（纯数字，如 `'110011'`）
 *
 * @example
 * const h = await sdk.fund.navHistory('110011');
 * console.log(h.name, h.items.length, h.items[h.items.length - 1]);
 */
export async function getFundNavHistory(
  client: RequestClient,
  code: string
): Promise<FundNavHistory> {
  const url = `${FUND_PINGZHONGDATA_URL}/${encodeURIComponent(code)}.js`;
  const vars = await fetchJsVars<FundNavRaw>(
    url,
    ['fS_code', 'fS_name', 'Data_netWorthTrend', 'Data_ACWorthTrend'],
    { client }
  );

  const trend = vars.Data_netWorthTrend ?? [];
  // 把累计净值按 timestamp 建索引，O(1) 对齐
  const accMap = new Map<number, number>();
  for (const row of vars.Data_ACWorthTrend ?? []) {
    if (Array.isArray(row) && row.length >= 2) {
      accMap.set(row[0], row[1]);
    }
  }

  const items: FundNavPoint[] = trend.map((p) => ({
    date: timestampToDate(p.x),
    timestamp: p.x,
    nav: p.y,
    accNav: accMap.has(p.x) ? (accMap.get(p.x) as number) : null,
    dailyReturn: toFiniteNumberOrNull(p.equityReturn),
    unitMoney: p.unitMoney ?? '',
  }));

  return {
    code: vars.fS_code ?? code,
    name: vars.fS_name ?? null,
    items,
  };
}

// ============================================================
// 实时估值（fundgz.1234567.com.cn）
// ============================================================

interface FundGzPayload {
  fundcode?: string;
  name?: string;
  jzrq?: string; // 净值日期
  dwjz?: string; // 单位净值
  gsz?: string; // 估算净值
  gszzl?: string; // 估算涨跌幅 %
  gztime?: string; // 估算时间
}

/**
 * 双端拉取并解析 fundgz JSONP（固定 callback 名 `jsonpgz`）。
 *
 * 浏览器端：因 fundgz.1234567.com.cn 无 CORS 头，必须走 `<script>` 注入；
 * 利用其固定 callback 名 `jsonpgz`，临时挂在 window 上读返回。
 *
 * Node 端：直接 fetch 文本 + `extractJsonFromJsonp` 剥离包装。
 */
function fetchFundGz(
  client: RequestClient,
  code: string,
  timeout = DEFAULT_FUNDGZ_TIMEOUT_MS
): Promise<FundGzPayload> {
  const url = `${FUND_GZ_URL}/${encodeURIComponent(code)}.js?rt=${Date.now()}`;
  if (isBrowserEnv()) {
    // 浏览器：必须串行（fundgz 强制返回 `jsonpgz(...)`，callback 名无法动态化，
    // 同时刻多请求会互相覆盖 window.jsonpgz）。
    return withScriptMutex('fundgz:jsonpgz', () =>
      browserFetchFundGz(url, timeout)
    );
  }
  // Node：超时 / 重试 / 限流交给 client 治理，不再透传本地 timeout
  return nodeFetchFundGz(client, url);
}

function browserFetchFundGz(
  url: string,
  timeout: number
): Promise<FundGzPayload> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const win = window as unknown as Record<string, unknown>;
    const prevCb = win.jsonpgz;
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // 恢复 jsonpgz 原值，避免污染用户的全局空间
      if (prevCb === undefined) {
        try {
          delete win.jsonpgz;
        } catch {
          /* ignore */
        }
      } else {
        win.jsonpgz = prevCb;
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new SdkError({
          code: 'TIMEOUT',
          message: `fundgz JSONP timed out after ${timeout}ms: ${url}`,
          url,
          details: { timeout },
        })
      );
    }, timeout);

    win.jsonpgz = (data: FundGzPayload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(data ?? {});
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(
        new SdkError({
          code: 'NETWORK_ERROR',
          message: `fundgz JSONP script load failed: ${url}`,
          url,
        })
      );
    };

    script.src = url;
    document.head.appendChild(script);
  });
}

async function nodeFetchFundGz(
  client: RequestClient,
  url: string
): Promise<FundGzPayload> {
  // 走 SDK RequestClient：享受 retry / rateLimit / circuitBreaker / fallback host
  // fundgz.1234567.com.cn 不在 inferProviderFromUrl 名单，需显式归为 eastmoney
  // 以应用 providerPolicies.eastmoney 的策略
  const text = await client.get<string>(url, {
    responseType: 'text',
    provider: 'eastmoney',
  });
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return extractJsonFromJsonp(trimmed) as FundGzPayload;
  } catch {
    return {};
  }
}

/**
 * 获取基金当日实时估值（来自天天基金 fundgz 接口）。
 *
 * 同时返回最新已结算的单位净值（`nav` + `navDate`）和盘中估算
 * （`estimatedNav` + `estimatedChangePercent` + `estimateTime`），
 * 方便对比当日表现。
 *
 * QDII / 非交易日 / 部分小众基金的盘中估算字段可能为空，将返回 `null`。
 *
 * @param code 基金代码（纯数字，如 `'005827'`）
 */
export async function getFundEstimate(
  client: RequestClient,
  code: string
): Promise<FundEstimate> {
  const raw = await fetchFundGz(client, code);
  return {
    code: raw.fundcode ?? code,
    name: raw.name ?? null,
    navDate: raw.jzrq?.trim() ? raw.jzrq.trim() : null,
    nav: toFiniteNumberOrNull(raw.dwjz),
    estimatedNav: toFiniteNumberOrNull(raw.gsz),
    estimatedChangePercent: toFiniteNumberOrNull(raw.gszzl),
    estimateTime: raw.gztime?.trim() ? raw.gztime.trim() : null,
  };
}

// ============================================================
// 同类排名走势（pingzhongdata.js 的 rank 字段）
// ============================================================

interface FundRankRaw {
  fS_code?: string;
  fS_name?: string;
  /** `[{x: ms, y: 排名, sc: 同类总数}, ...]` */
  Data_rateInSimilarType?: Array<{
    x: number;
    y: number | string;
    sc: number | string;
  }>;
  /** `[[ms, 百分位], ...]` */
  Data_rateInSimilarPersent?: Array<[number, number]>;
}

/**
 * 获取基金同类排名走势（每日近三月排名 + 百分位）。
 *
 * 数据源：与 `getFundNavHistory` 相同的 `pingzhongdata/{code}.js`，
 * 取 `Data_rateInSimilarType`（排名 + 同类总数）和
 * `Data_rateInSimilarPersent`（百分位），按 timestamp 对齐合并。
 *
 * @param code 基金代码
 */
export async function getFundRankHistory(
  client: RequestClient,
  code: string
): Promise<FundRankHistory> {
  const url = `${FUND_PINGZHONGDATA_URL}/${encodeURIComponent(code)}.js`;
  const vars = await fetchJsVars<FundRankRaw>(
    url,
    [
      'fS_code',
      'fS_name',
      'Data_rateInSimilarType',
      'Data_rateInSimilarPersent',
    ],
    { client }
  );

  const series = vars.Data_rateInSimilarType ?? [];
  const percentMap = new Map<number, number>();
  for (const row of vars.Data_rateInSimilarPersent ?? []) {
    if (Array.isArray(row) && row.length >= 2) {
      percentMap.set(row[0], row[1]);
    }
  }

  const items: FundRankPoint[] = series.map((p) => ({
    date: timestampToDate(p.x),
    timestamp: p.x,
    rank: toFiniteNumberOrNull(p.y),
    total: toFiniteNumberOrNull(p.sc),
    percentile: percentMap.has(p.x) ? (percentMap.get(p.x) as number) : null,
  }));

  return {
    code: vars.fS_code ?? code,
    name: vars.fS_name ?? null,
    items,
  };
}

// ============================================================
// 基金深度资料（pingzhongdata 全量字段，一次请求）
// ============================================================

interface FundProfileRaw {
  fS_code?: string;
  fS_name?: string;
  fund_sourceRate?: string;
  fund_Rate?: string;
  fund_minsg?: string;
  /** 前十大重仓股代码（新市场号编码：`"0.300308"`, `"1.688012"`, ...） */
  stockCodesNew?: string[];
  /** 前五大债券持仓代码（新市场号编码） */
  zqCodesNew?: string;
  /** 资产配置 */
  Data_assetAllocation?: {
    series?: Array<{
      name?: string;
      data?: (number | null)[];
    }>;
    categories?: string[];
  };
  /** 股票仓位测算（每日） */
  Data_fundSharesPositions?: Array<[number, number]>;
  /** 基金经理 */
  Data_currentFundManager?: Array<{
    id?: string;
    name?: string;
    startDate?: string;
    days?: number;
    experience?: number;
    fundCount?: number;
    fundScale?: number;
    resume?: string;
  }>;
  /** 业绩评价 */
  Data_performanceEvaluation?: {
    avr?: string;
    categories?: string[];
    dsc?: string[];
    data?: number[];
  };
  /** 持有人结构 */
  Data_holderStructure?: {
    categories?: string[];
    series?: Array<{ name?: string; data?: (number | null)[] }>;
  };
  /** 规模变动 */
  Data_fluctuationScale?: {
    categories?: string[];
    series?: Array<{ y?: number; mom?: string }>;
  };
  /** 申购赎回 */
  Data_buySedemption?: {
    categories?: string[];
    series?: Array<{
      name?: string;
      data?: (number | null)[];
    }>;
  };
  /** 阶段收益率 */
  syl_1y?: string;
  syl_3y?: string;
  syl_6y?: string;
  syl_1n?: string;
  /** 同类基金 */
  swithSameType?: Array<{ code?: string; name?: string }>;
}

function parseHoldings(raw: string[] | undefined): FundHolding[] {
  if (!raw) return [];
  return raw.map((s) => {
    const dot = s.indexOf('.');
    if (dot < 0) return { code: s, marketId: '' };
    return {
      marketId: s.slice(0, dot),
      code: s.slice(dot + 1),
    };
  });
}

function parseBondHoldings(raw: string | undefined): FundBondHolding[] {
  if (!raw) return [];
  return raw.split(',').map((s) => {
    const dot = s.indexOf('.');
    if (dot < 0) return { code: s, marketId: '' };
    return {
      marketId: s.slice(0, dot),
      code: s.slice(dot + 1),
    };
  });
}

function parseAssetAllocation(raw: FundProfileRaw['Data_assetAllocation']): FundAssetAllocation[] {
  if (!raw?.categories?.length || !raw?.series) return [];
  const categories = raw.categories;
  const series = raw.series;
  const result: FundAssetAllocation[] = [];

  const getData = (name: string): (number | null)[] => {
    const s = series.find((s) => s.name === name);
    return s?.data ?? [];
  };
  const stockData = getData('股票占净比');
  const bondData = getData('债券占净比');
  const cashData = getData('现金占净比');
  const otherData = getData('其他占净比');
  const netAssetData = getData('净资产');

  for (let i = 0; i < categories.length; i++) {
    const date = categories[i];
    const ts = new Date(date + 'T00:00:00+08:00').getTime();
    result.push({
      date,
      timestamp: ts,
      stockRatio: stockData[i] ?? 0,
      bondRatio: bondData[i] ?? 0,
      cashRatio: cashData[i] ?? 0,
      otherRatio: otherData[i] ?? 0,
      netAsset: netAssetData[i] ?? 0,
    });
  }
  return result;
}

function parsePositions(raw: Array<[number, number]> | undefined): FundPositionPoint[] {
  if (!raw) return [];
  return raw.map(([ts, pos]) => ({
    date: timestampToDate(ts),
    timestamp: ts,
    position: pos,
  }));
}

function parseManagers(raw: FundProfileRaw['Data_currentFundManager']): FundManager[] {
  if (!raw) return [];
  return raw.map((m) => ({
    id: m.id ?? '',
    name: m.name ?? '',
    startDate: m.startDate?.trim() ? m.startDate.trim() : null,
    daysInOffice: m.days ?? 0,
    experienceYears: m.experience ?? 0,
    currentFundCount: m.fundCount ?? 0,
    currentFundScale: m.fundScale ?? 0,
    resume: m.resume?.trim() ? m.resume.trim() : null,
  }));
}

function parsePerformance(raw: FundProfileRaw['Data_performanceEvaluation']): FundPerformanceEvaluation | null {
  if (!raw?.categories?.length) return null;
  return {
    overall: toFiniteNumberOrNull(raw.avr) ?? 0,
    categories: raw.categories,
    scores: raw.data ?? [],
    descriptions: raw.dsc ?? [],
  };
}

function parseHolderStructure(raw: FundProfileRaw['Data_holderStructure']): FundHolderStructure[] {
  if (!raw?.categories?.length || !raw?.series) return [];
  const result: FundHolderStructure[] = [];
  const getData = (name: string) => {
    const s = raw.series!.find((s) => s.name === name);
    return s?.data ?? [];
  };
  const instData = getData('机构持有比例');
  const indvData = getData('个人持有比例');
  const internalData = getData('内部持有比例');

  for (let i = 0; i < raw.categories.length; i++) {
    const date = raw.categories[i];
    const ts = new Date(date + 'T00:00:00+08:00').getTime();
    result.push({
      date,
      timestamp: ts,
      institutionRatio: instData[i] ?? 0,
      individualRatio: indvData[i] ?? 0,
      internalRatio: internalData[i] ?? 0,
    });
  }
  return result;
}

function parseScaleChanges(raw: FundProfileRaw['Data_fluctuationScale']): FundScaleChange[] {
  if (!raw?.categories?.length || !raw?.series) return [];
  return raw.categories.map((date, i) => ({
    date,
    scale: raw.series![i]?.y ?? 0,
    mom: raw.series![i]?.mom ?? '',
  }));
}

function parseBuySedemption(raw: FundProfileRaw['Data_buySedemption']): FundBuySedemption[] {
  if (!raw?.categories?.length || !raw?.series) return [];
  const getData = (name: string) => {
    const s = raw.series!.find((s) => s.name === name);
    return s?.data ?? [];
  };
  const buyData = getData('期间申购');
  const sellData = getData('期间赎回');
  const totalData = getData('期末总份额');

  return raw.categories.map((date, i) => {
    const ts = new Date(date + 'T00:00:00+08:00').getTime();
    return {
      date,
      timestamp: ts,
      buy: buyData[i] ?? 0,
      sell: sellData[i] ?? 0,
      total: totalData[i] ?? 0,
    };
  });
}

function parseStageReturns(raw: FundProfileRaw): FundStageReturns {
  return {
    oneMonth: toFiniteNumberOrNull(raw.syl_1y),
    threeMonth: toFiniteNumberOrNull(raw.syl_3y),
    sixMonth: toFiniteNumberOrNull(raw.syl_6y),
    oneYear: toFiniteNumberOrNull(raw.syl_1n),
  };
}

function parseSameType(raw: FundProfileRaw['swithSameType']): FundSameType | null {
  if (!raw?.length) return null;
  return {
    codes: raw.map((s) => s.code ?? ''),
    names: raw.map((s) => s.name ?? ''),
  };
}

/**
 * 获取基金深度资料（pingzhongdata 全量字段，一次请求）。
 *
 * 包含：前十大重仓股、资产配置、仓位测算、基金经理、业绩评价、
 * 持有人结构、规模变动、申购赎回、阶段收益率、同类基金等。
 *
 * 数据源：`https://fund.eastmoney.com/pingzhongdata/{code}.js`
 *
 * @param code 基金代码（纯数字，如 `'000001'`）
 *
 * @example
 * const profile = await sdk.fund.profile('000001');
 * console.log(profile.holdings[0].code);    // "300308"
 * console.log(profile.assetAllocation[0]);   // { date, stockRatio, bondRatio, ... }
 * console.log(profile.performance.overall);  // 77.0
 */
export async function getFundProfile(
  client: RequestClient,
  code: string
): Promise<FundProfile> {
  const url = `${FUND_PINGZHONGDATA_URL}/${encodeURIComponent(code)}.js`;
  const vars = await fetchJsVars<FundProfileRaw>(
    url,
    [
      'fS_code',
      'fS_name',
      'fund_sourceRate',
      'fund_Rate',
      'fund_minsg',
      'stockCodesNew',
      'zqCodesNew',
      'Data_assetAllocation',
      'Data_fundSharesPositions',
      'Data_currentFundManager',
      'Data_performanceEvaluation',
      'Data_holderStructure',
      'Data_fluctuationScale',
      'Data_buySedemption',
      'syl_1y',
      'syl_3y',
      'syl_6y',
      'syl_1n',
      'swithSameType',
    ],
    { client }
  );

  return {
    code: vars.fS_code ?? code,
    name: vars.fS_name ?? null,
    sourceRate: toFiniteNumberOrNull(vars.fund_sourceRate),
    rate: toFiniteNumberOrNull(vars.fund_Rate),
    minSubscription: toFiniteNumberOrNull(vars.fund_minsg),
    holdings: parseHoldings(vars.stockCodesNew),
    bondHoldings: parseBondHoldings(vars.zqCodesNew),
    assetAllocation: parseAssetAllocation(vars.Data_assetAllocation),
    positions: parsePositions(vars.Data_fundSharesPositions),
    managers: parseManagers(vars.Data_currentFundManager),
    performance: parsePerformance(vars.Data_performanceEvaluation),
    holderStructure: parseHolderStructure(vars.Data_holderStructure),
    scaleChanges: parseScaleChanges(vars.Data_fluctuationScale),
    buySedemption: parseBuySedemption(vars.Data_buySedemption),
    stageReturns: parseStageReturns(vars),
    sameType: parseSameType(vars.swithSameType),
  };
}
