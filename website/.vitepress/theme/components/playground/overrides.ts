/**
 * Overlay 层：spec 缺少的「演示性信息」集中在这里，按方法 id 索引。
 *
 * 三类内容：
 * 1. defaults —— 开箱即跑的默认参数值（spec 的 default 只做展示，不注入实参；
 *    playground 要让 85 个方法点开就能跑，必须给 codes/symbol 等填上真实示例）
 * 2. market —— 市场标签修正（derive.ts 的推断覆盖不到的少数方法）
 * 3. custom —— 全站唯一手写特例 kline.withIndicators（MCP 侧同样是手写工具，
 *    原因相同：指标参数是嵌套对象，与扁平表单的派生模型不匹配）
 *
 * 排除清单：batch.raw（原始直通接口，positional 是底层参数对象，不适合表单化；
 * MCP 同样未暴露它）。
 */
import type { MarketKey, PlaygroundMethod, RunContext } from './types';
import { recentRange, yesterdayISO, contractYYMM, monthISO } from './utils';

/** 不进 playground 的方法 id */
export const EXCLUDED_IDS = new Set(['batch.raw']);

/** 市场标签修正（推断不准的方法） */
export const MARKET_OVERRIDES: Record<string, MarketKey[]> = {
  'reference.dividendDetail': ['a'],
  'reference.tradingCalendar': ['all'],
  'kline.withIndicators': ['a', 'hk', 'us'],
  'kline.signals': ['a', 'hk', 'us'],
};

const dt7 = recentRange(7);

/**
 * 默认参数值：key 是表单字段键（codes / positional 名 / param 的 SDK 字段名）。
 * 没列出的方法要么无必填参数（开箱即跑），要么参数天然时效（期权合约等，
 * 用 placeholder 引导先查列表接口）。
 */
export const DEFAULT_VALUES: Record<string, Record<string, string>> = {
  // ===== quotes =====
  'quotes.cn': { codes: 'sh600519,sz000858,sh000001' },
  'quotes.cnSimple': { codes: 'sh600519,sz000858,sh000001' },
  'quotes.hk': { codes: '00700,09988' },
  'quotes.us': { codes: 'AAPL,TSLA' },
  'quotes.fund': { codes: '110011,510300' },
  'quotes.fundFlow': { codes: 'sh600519,sz000858' },
  'quotes.largeOrder': { codes: 'sh600519' },
  'quotes.timeline': { code: 'sh600519' },
  // ===== batch =====
  'batch.byCodes': { codes: 'sh600519,sz000858,sh601318' },
  // ===== kline =====
  'kline.cn': { symbol: '600519' },
  'kline.cnMinute': { symbol: '600519' },
  'kline.hk': { symbol: '00700' },
  'kline.hkMinute': { symbol: '00700' },
  'kline.us': { symbol: '105.AAPL' },
  'kline.usMinute': { symbol: '105.AAPL' },
  'kline.signals': { symbol: '600519' },
  // ===== chips =====
  'chips.cn': { symbol: '600519' },
  'chips.hk': { symbol: '00700' },
  'chips.us': { symbol: '105.AAPL' },
  // ===== board =====
  'board.industry.spot': { symbol: 'BK0475' },
  'board.industry.constituents': { symbol: 'BK0475' },
  'board.industry.kline': { symbol: 'BK0475' },
  'board.industry.minuteKline': { symbol: 'BK0475' },
  'board.concept.spot': { symbol: 'BK0815' },
  'board.concept.constituents': { symbol: 'BK0815' },
  'board.concept.kline': { symbol: 'BK0815' },
  'board.concept.minuteKline': { symbol: 'BK0815' },
  // ===== options（合约类参数有时效，月份动态生成；具体合约引导先查列表） =====
  'options.index.spot': { product: 'io', contract: contractYYMM(1) },
  'options.etf.months': { cate: '50ETF' },
  'options.etf.expireDay': { cate: '50ETF', month: monthISO(0) },
  'options.commodity.spot': { variety: 'au', contract: contractYYMM(2) },
  'options.lhb': { symbol: '510050', date: yesterdayISO() },
  // ===== futures =====
  'futures.kline': { symbol: `IF${contractYYMM(0)}` },
  'futures.globalKline': { symbol: 'GC00Y' },
  'futures.comexInventory': { symbol: 'gold' },
  // ===== fundFlow =====
  'fundFlow.individual': { symbol: '600519' },
  'fundFlow.sectorHistory': { symbol: 'BK0438' },
  // ===== northbound =====
  'northbound.individual': { symbol: '600519' },
  // ===== marketEvent =====
  'marketEvent.individualChanges': { symbol: '600519' },
  'marketEvent.individualChangesHistory': { symbol: '600519' },
  // ===== dragonTiger（detail/institution 必填日期区间 → 近 7 天） =====
  'dragonTiger.detail': { startDate: dt7.start, endDate: dt7.end },
  'dragonTiger.institution': { startDate: dt7.start, endDate: dt7.end },
  'dragonTiger.seatDetail': { symbol: '600519' },
  // ===== fund =====
  'fund.navHistory': { code: '110011' },
  'fund.estimate': { code: '005827' },
  'fund.rankHistory': { code: '110011' },
  'fund.profile': { code: '000001' },
  // ===== fund.theme（getThemeList 参数全可选，开箱即跑；getThemeFunds 必填主题代码；getHotThemes 暂下线）=====
  'fund.theme.getThemeFunds': { symbol: 'BK0438' },
  // ===== reference / search =====
  'reference.dividendDetail': { symbol: '600519' },
  search: { keyword: '茅台' },
};

/** 个别字段的 placeholder 增强（默认值留空、引导先查列表的时效性参数） */
export const PLACEHOLDER_OVERRIDES: Record<string, Record<string, string>> = {
  'options.index.kline': { symbol: '先查 T 型报价获取合约代码' },
  'options.etf.minute': { code: '先查 ETF期权月份/T型报价 获取合约代码' },
  'options.etf.dailyKline': { code: '先查 ETF期权月份/T型报价 获取合约代码' },
  'options.etf.fiveDayMinute': { code: '先查 ETF期权月份/T型报价 获取合约代码' },
  'options.commodity.kline': { symbol: '先查商品期权 T 型报价获取合约代码' },
  'futures.inventory': { symbol: '先跑「期货库存品种列表」查品种代码' },
  'dragonTiger.seatDetail': { date: '先查龙虎榜详情拿上榜日期，YYYYMMDD' },
};

// ===== 全站唯一手写特例：kline.withIndicators =====
// MCP 用嵌套 indicators 对象、CLI 用 14 个扁平 flag，两端都无法机械派生表单。
// Phase 1 提供常用 4 指标（ma 带周期、macd/boll/kdj 开关），其余指标 Phase 2 视需求补。

function buildIndicators(values: Record<string, string>): Record<string, unknown> {
  const indicators: Record<string, unknown> = {};
  if (values.ma === 'true') {
    const periods = (values.maPeriods || '5,10,20')
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    indicators.ma = periods.length > 0 ? { periods } : true;
  }
  for (const k of ['macd', 'boll', 'kdj'] as const) {
    if (values[k] === 'true') indicators[k] = true;
  }
  return indicators;
}

function buildWithIndicatorsOptions(values: Record<string, string>): Record<string, unknown> {
  const options: Record<string, unknown> = { indicators: buildIndicators(values) };
  if (values.period) options.period = values.period;
  if (values.adjust) options.adjust = values.adjust === 'none' ? '' : values.adjust;
  if (values.startDate) options.startDate = values.startDate;
  if (values.endDate) options.endDate = values.endDate;
  if (values.market) options.market = values.market.toUpperCase();
  return options;
}

export const WITH_INDICATORS_METHOD: PlaygroundMethod = {
  id: 'kline.withIndicators',
  path: ['kline', 'withIndicators'],
  label: 'kline.withIndicators',
  desc: '带技术指标的历史K线(A/HK/US)',
  category: 'kline',
  market: ['a', 'hk', 'us'],
  argShape: 'symbol+options',
  fields: [
    {
      key: 'symbol',
      kind: 'positional',
      label: 'symbol',
      type: 'text',
      required: true,
      placeholder: '600519 / 00700 / 105.AAPL',
      desc: '股票代码（A 股 / 港股 / 美股，market 不传自动识别）',
    },
    {
      key: 'market',
      kind: 'param',
      label: 'market',
      type: 'select',
      options: [
        { value: '', label: '自动识别' },
        { value: 'A', label: 'A 股' },
        { value: 'HK', label: '港股' },
        { value: 'US', label: '美股' },
      ],
    },
    {
      key: 'period',
      kind: 'param',
      label: 'period',
      type: 'select',
      options: [
        { value: '', label: 'daily（默认）' },
        { value: 'daily', label: 'daily' },
        { value: 'weekly', label: 'weekly' },
        { value: 'monthly', label: 'monthly' },
      ],
    },
    {
      key: 'adjust',
      kind: 'param',
      label: 'adjust',
      type: 'select',
      options: [
        { value: '', label: 'qfq（默认）' },
        { value: 'qfq', label: 'qfq 前复权' },
        { value: 'hfq', label: 'hfq 后复权' },
        { value: 'none', label: '不复权' },
      ],
    },
    { key: 'startDate', kind: 'param', label: 'start', type: 'text', placeholder: 'YYYYMMDD，可留空' },
    { key: 'endDate', kind: 'param', label: 'end', type: 'text', placeholder: 'YYYYMMDD，可留空' },
    { key: 'ma', kind: 'param', label: '启用 MA', type: 'checkbox' },
    { key: 'maPeriods', kind: 'param', label: 'MA 周期', type: 'text', placeholder: '5,10,20' },
    { key: 'macd', kind: 'param', label: '启用 MACD', type: 'checkbox' },
    { key: 'boll', kind: 'param', label: '启用 BOLL', type: 'checkbox' },
    { key: 'kdj', kind: 'param', label: '启用 KDJ', type: 'checkbox' },
  ],
  run: async (sdk: any, values: Record<string, string>, _ctx: RunContext) => {
    return sdk.kline.withIndicators(values.symbol, buildWithIndicatorsOptions(values));
  },
  code: (values) => {
    const opts = buildWithIndicatorsOptions(values);
    return `const data = await sdk.kline.withIndicators(${JSON.stringify(values.symbol || '600519')}, ${JSON.stringify(opts, null, 2)})`;
  },
};

/** withIndicators 的默认参数（让它开箱即跑：MA + MACD） */
DEFAULT_VALUES['kline.withIndicators'] = {
  symbol: '600519',
  ma: 'true',
  maPeriods: '5,10,20',
  macd: 'true',
};
