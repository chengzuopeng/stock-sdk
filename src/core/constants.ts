/**
 * 常量定义
 */

// 腾讯财经 API
export const TENCENT_BASE_URL = 'https://qt.gtimg.cn';
export const TENCENT_MINUTE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/minute/query';

// 股票代码列表
export const A_SHARE_LIST_URL = 'https://assets.linkdiary.cn/shares/zh_a_list.json';
export const US_LIST_URL = 'https://assets.linkdiary.cn/shares/us_list.json';
export const HK_LIST_URL = 'https://assets.linkdiary.cn/shares/hk_list.json';
export const FUND_LIST_URL = 'https://assets.linkdiary.cn/shares/fund_list';

// A 股交易日历
export const TRADE_CALENDAR_URL = 'https://assets.linkdiary.cn/shares/trade-data-list.txt';

/** @deprecated 使用 A_SHARE_LIST_URL 代替 */
export const CODE_LIST_URL = A_SHARE_LIST_URL;

// 东方财富 API
export const EM_KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_TRENDS_URL = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';
export const EM_HK_KLINE_URL = 'https://33.push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_US_KLINE_URL = 'https://63.push2his.eastmoney.com/api/qt/stock/kline/get';

// 东方财富行业板块 API
export const EM_BOARD_LIST_URL = 'https://17.push2.eastmoney.com/api/qt/clist/get';
export const EM_BOARD_SPOT_URL = 'https://91.push2.eastmoney.com/api/qt/stock/get';
export const EM_BOARD_CONS_URL = 'https://29.push2.eastmoney.com/api/qt/clist/get';
export const EM_BOARD_KLINE_URL = 'https://7.push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_BOARD_TRENDS_URL = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';

// 东方财富概念板块 API
export const EM_CONCEPT_LIST_URL = 'https://79.push2.eastmoney.com/api/qt/clist/get';
export const EM_CONCEPT_SPOT_URL = 'https://91.push2.eastmoney.com/api/qt/stock/get';
export const EM_CONCEPT_CONS_URL = 'https://29.push2.eastmoney.com/api/qt/clist/get';
export const EM_CONCEPT_KLINE_URL = 'https://91.push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_CONCEPT_TRENDS_URL = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';

// 东方财富数据中心 API
export const EM_DATACENTER_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

// 东方财富资金流 API（push2his 日线资金流）
export const EM_FFLOW_URL = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';

// 东方财富个股/板块资金流排名 API（push2 通用 clist）
export const EM_CLIST_URL = 'https://push2.eastmoney.com/api/qt/clist/get';

// 东方财富北向资金分时 API
export const EM_NORTHBOUND_MINUTE_URL = 'https://push2.eastmoney.com/api/qt/kamtbs.rtmin/get';

// 东方财富涨停板 / 盘口异动 API 基地址（push2ex 提供 ZT pool 等专题接口）
export const EM_TOPIC_BASE_URL = 'https://push2ex.eastmoney.com';

// 东方财富期货 API
export const EM_FUTURES_KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_FUTURES_GLOBAL_SPOT_URL =
  'https://futsseapi.eastmoney.com/list/COMEX,NYMEX,COBOT,SGX,NYBOT,LME,MDEX,TOCOM,IPE';
export const EM_FUTURES_GLOBAL_SPOT_TOKEN = '58b2fa8f54638b60b87d69b31969089c';

/**
 * 国内期货交易所 market code 映射
 * 来源：futsse-static.eastmoney.com/redis?msgid=gnweb 验证
 */
export const FUTURES_EXCHANGE_MAP: Record<string, number> = {
  SHFE: 113,
  DCE: 114,
  CZCE: 115,
  INE: 142,
  CFFEX: 220,
  GFEX: 225,
};

/**
 * 品种代码 -> 交易所映射（内置，免去动态获取的 CORS 问题）
 */
export const FUTURES_VARIETY_EXCHANGE: Record<string, string> = {
  // SHFE 上海期货交易所
  cu: 'SHFE', al: 'SHFE', zn: 'SHFE', pb: 'SHFE', au: 'SHFE', ag: 'SHFE',
  rb: 'SHFE', wr: 'SHFE', fu: 'SHFE', ru: 'SHFE', bu: 'SHFE', hc: 'SHFE',
  ni: 'SHFE', sn: 'SHFE', sp: 'SHFE', ss: 'SHFE', ao: 'SHFE', br: 'SHFE',
  // DCE 大连商品交易所
  c: 'DCE', a: 'DCE', b: 'DCE', m: 'DCE', y: 'DCE', p: 'DCE',
  l: 'DCE', v: 'DCE', j: 'DCE', jm: 'DCE', i: 'DCE', jd: 'DCE',
  pp: 'DCE', cs: 'DCE', eg: 'DCE', eb: 'DCE', pg: 'DCE', lh: 'DCE',
  // CZCE 郑州商品交易所
  WH: 'CZCE', CF: 'CZCE', SR: 'CZCE', TA: 'CZCE', OI: 'CZCE', MA: 'CZCE',
  FG: 'CZCE', RM: 'CZCE', SF: 'CZCE', SM: 'CZCE', ZC: 'CZCE', AP: 'CZCE',
  CJ: 'CZCE', UR: 'CZCE', SA: 'CZCE', PF: 'CZCE', PK: 'CZCE', PX: 'CZCE',
  SH: 'CZCE',
  // INE 上海国际能源交易中心
  sc: 'INE', nr: 'INE', lu: 'INE', bc: 'INE', ec: 'INE',
  // CFFEX 中国金融期货交易所
  IF: 'CFFEX', IC: 'CFFEX', IH: 'CFFEX', IM: 'CFFEX',
  TS: 'CFFEX', TF: 'CFFEX', T: 'CFFEX', TL: 'CFFEX',
  // GFEX 广州期货交易所
  si: 'GFEX', lc: 'GFEX', ps: 'GFEX', pt: 'GFEX', pd: 'GFEX',
};

/**
 * 全球期货市场代码映射（来自 akshare futures_hf_em.py）
 */
export const GLOBAL_FUTURES_MARKET: Record<string, number> = {
  HG: 101, GC: 101, SI: 101, QI: 101, QO: 101, MGC: 101,
  CL: 102, NG: 102, RB: 102, HO: 102, PA: 102, PL: 102,
  ZW: 103, ZM: 103, ZS: 103, ZC: 103, ZL: 103, ZR: 103,
  YM: 103, NQ: 103, ES: 103,
  SB: 108, CT: 108,
  LCPT: 109, LZNT: 109, LALT: 109,
};

// 新浪期权 API
export const SINA_OPTION_API_URL =
  'https://stock.finance.sina.com.cn/futures/api/openapi.php/OptionService.getOptionData';
export const SINA_OPTION_DAYLINE_URL =
  'https://stock.finance.sina.com.cn/futures/api/jsonp.php/{callback}/FutureOptionAllService.getOptionDayline';
export const SINA_SSE_OPTION_LIST_URL =
  'https://stock.finance.sina.com.cn/futures/api/openapi.php/StockOptionService.getStockName';
export const SINA_SSE_OPTION_EXPIRE_URL =
  'https://stock.finance.sina.com.cn/futures/api/openapi.php/StockOptionService.getRemainderDay';
export const SINA_SSE_OPTION_MINUTE_URL =
  'https://stock.finance.sina.com.cn/futures/api/openapi.php/StockOptionDaylineService.getOptionMinline';
export const SINA_SSE_OPTION_DAILY_URL =
  'https://stock.finance.sina.com.cn/futures/api/jsonp_v2.php/{callback}/StockOptionDaylineService.getSymbolInfo';
export const SINA_SSE_OPTION_5DAY_URL =
  'https://stock.finance.sina.com.cn/futures/api/openapi.php/StockOptionDaylineService.getFiveDayLine';

// 东方财富期权 API
export const EM_OPTION_CFFEX_URL = 'https://futsseapi.eastmoney.com/list/option/221';
export const EM_OPTION_LHB_URL = 'https://datacenter-web.eastmoney.com/api/data/get';
export const EM_OPTION_LHB_TOKEN = 'b2884a393a59ad64002292a3e90d46a5';

/**
 * 中金所股指期权品种 -> product 代码映射
 */
export const CFFEX_OPTION_PRODUCT_MAP: Record<string, string> = {
  ho: '上证50',
  io: '沪深300',
  mo: '中证1000',
};

/**
 * 商品期权品种 -> { product, exchange } 映射
 */
export const COMMODITY_OPTION_MAP: Record<string, { product: string; exchange: string }> = {
  au: { product: 'au_o', exchange: 'shfe' },
  ag: { product: 'ag_o', exchange: 'shfe' },
  cu: { product: 'cu_o', exchange: 'shfe' },
  al: { product: 'al_o', exchange: 'shfe' },
  zn: { product: 'zn_o', exchange: 'shfe' },
  ru: { product: 'ru_o', exchange: 'shfe' },
  sc: { product: 'sc_o', exchange: 'ine' },
  m: { product: 'm_o', exchange: 'dce' },
  c: { product: 'c_o', exchange: 'dce' },
  i: { product: 'i_o', exchange: 'dce' },
  p: { product: 'p_o', exchange: 'dce' },
  pp: { product: 'pp_o', exchange: 'dce' },
  l: { product: 'l_o', exchange: 'dce' },
  v: { product: 'v_o', exchange: 'dce' },
  pg: { product: 'pg_o', exchange: 'dce' },
  y: { product: 'y_o', exchange: 'dce' },
  a: { product: 'a_o', exchange: 'dce' },
  b: { product: 'b_o', exchange: 'dce' },
  eg: { product: 'eg_o', exchange: 'dce' },
  eb: { product: 'eb_o', exchange: 'dce' },
  SR: { product: 'SR_o', exchange: 'czce' },
  CF: { product: 'CF_o', exchange: 'czce' },
  TA: { product: 'TA_o', exchange: 'czce' },
  MA: { product: 'MA_o', exchange: 'czce' },
  RM: { product: 'RM_o', exchange: 'czce' },
  OI: { product: 'OI_o', exchange: 'czce' },
  PK: { product: 'PK_o', exchange: 'czce' },
  PF: { product: 'PF_o', exchange: 'czce' },
  SA: { product: 'SA_o', exchange: 'czce' },
  UR: { product: 'UR_o', exchange: 'czce' },
};

// 默认配置
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_BATCH_SIZE = 500;
export const MAX_BATCH_SIZE = 500;
export const DEFAULT_CONCURRENCY = 7;

// 重试配置
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BASE_DELAY = 1000;
export const DEFAULT_MAX_DELAY = 30000;
export const DEFAULT_BACKOFF_MULTIPLIER = 2;
export const DEFAULT_RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
