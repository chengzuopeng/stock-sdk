/**
 * MCP 工具：K 线 / 分时（A 股 / 港股 / 美股）+ 带技术指标的 K 线。
 * 历史 K 线复用 periodHistory / adjustField / startDateYmd / endDateYmd；
 * 分钟 K 线复用 periodMinute（1=当日分时）。
 */
import type { KlineWithIndicatorsOptions, MarketType } from '../../sdk';
import type { ToolDef } from '../types';
import {
  symbolField,
  periodHistory,
  periodMinute,
  adjustField,
  startDateYmd,
  endDateYmd,
  obj,
} from './schema';

/** 带指标 K 线的市场类型（不传则由 symbol 自动识别） */
const INDICATOR_MARKET = ['A', 'HK', 'US'] as const;

/** withIndicators 支持的 14 个技术指标键（每个布尔开启或传配置对象） */
const INDICATOR_KEYS = [
  'ma',
  'macd',
  'boll',
  'kdj',
  'rsi',
  'wr',
  'bias',
  'cci',
  'atr',
  'obv',
  'roc',
  'dmi',
  'sar',
  'kc',
] as const;

export const klineTools: ToolDef[] = [
  {
    name: 'get_history_kline',
    tier: 'core',
    description:
      'A 股 / 指数历史 K 线（日 / 周 / 月，含复权）：开高低收、成交量额、振幅、涨跌幅等。' +
      "复权默认 qfq（前复权，看走势）；做回测 / 收益计算请显式传 hfq（后复权）或 ''（不复权）。" +
      '日期格式 YYYYMMDD。',
    inputSchema: obj(
      {
        symbol: symbolField('股票 / 指数代码，如 600519 / sh600519'),
        period: periodHistory,
        adjust: adjustField,
        startDate: startDateYmd,
        endDate: endDateYmd,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.cn(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_minute_kline',
    tier: 'core',
    description:
      'A 股分钟 K 线 / 当日分时。period=1 返回最近约 5 个交易日的分时' +
      '（不支持复权，可用 startDate/endDate 收窄到当日）；' +
      'period=5/15/30/60 返回分钟 K 线（adjust 仅此时有效，默认 qfq）。',
    inputSchema: obj(
      {
        symbol: symbolField('股票 / 指数代码，如 600519 / sh600519'),
        period: periodMinute,
        adjust: adjustField,
        startDate: { type: 'string', description: '开始时间' },
        endDate: { type: 'string', description: '结束时间' },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.cnMinute(a.symbol as string, {
        period: a.period as '1' | '5' | '15' | '30' | '60' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_hk_history_kline',
    tier: 'core',
    description:
      '港股历史 K 线（日 / 周 / 月，含复权，币种 HKD）。代码 5 位数字，带不带 hk 前缀均可' +
      '（如 00700 / hk00700）。复权默认 qfq；日期格式 YYYYMMDD。',
    inputSchema: obj(
      {
        symbol: symbolField('港股代码，如 00700 / hk00700'),
        period: periodHistory,
        adjust: adjustField,
        startDate: startDateYmd,
        endDate: endDateYmd,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.hk(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_hk_minute_kline',
    tier: 'full',
    description:
      '港股分钟 K 线 / 当日分时。period=1 返回当日分时（不支持复权，可用 recentDays 取近 N 日）；' +
      'period=5/15/30/60 返回分钟 K 线（adjust 仅此时有效，默认 qfq）。' +
      '时间格式 YYYY-MM-DD HH:mm（港股本地时区 Asia/Hong_Kong）。',
    inputSchema: obj(
      {
        symbol: symbolField('港股代码，如 00700 / hk00700'),
        period: periodMinute,
        adjust: adjustField,
        startDate: { type: 'string', description: '开始时间 YYYY-MM-DD HH:mm（港股本地时区）' },
        endDate: { type: 'string', description: '结束时间 YYYY-MM-DD HH:mm（港股本地时区）' },
        recentDays: {
          type: 'integer',
          description: '仅 period=1 生效：返回最近 N 个交易日的分时，默认 1（当日）',
        },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.hkMinute(a.symbol as string, {
        period: a.period as '1' | '5' | '15' | '30' | '60' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
        ndays: a.recentDays as number | undefined,
      }),
  },
  {
    name: 'get_us_history_kline',
    tier: 'core',
    description:
      '美股历史 K 线（日 / 周 / 月，含复权，币种 USD）。代码格式 {market}.{ticker}' +
      '（如 105.AAPL / 106.BABA）。复权默认 qfq；日期格式 YYYYMMDD。',
    inputSchema: obj(
      {
        symbol: symbolField('美股代码，格式 {market}.{ticker}，如 105.AAPL / 106.BABA'),
        period: periodHistory,
        adjust: adjustField,
        startDate: startDateYmd,
        endDate: endDateYmd,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.us(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_us_minute_kline',
    tier: 'full',
    description:
      '美股分钟 K 线 / 当日分时（仅常规交易时段，不含盘前 / 盘后）。period=1 返回当日分时' +
      '（不支持复权，可用 recentDays 取近 N 日）；period=5/15/30/60 返回分钟 K 线' +
      '（adjust 仅此时有效，默认 qfq）。代码格式 {market}.{ticker}，如 105.AAPL。',
    inputSchema: obj(
      {
        symbol: symbolField('美股代码，格式 {market}.{ticker}，如 105.AAPL / 106.BABA'),
        period: periodMinute,
        adjust: adjustField,
        recentDays: {
          type: 'integer',
          description: '仅 period=1 生效：返回最近 N 个交易日的分时，默认 1（当日）',
        },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.usMinute(a.symbol as string, {
        period: a.period as '1' | '5' | '15' | '30' | '60' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        ndays: a.recentDays as number | undefined,
      }),
  },
  {
    name: 'get_kline_with_indicators',
    tier: 'core',
    description:
      '带技术指标的历史 K 线（A 股 / 港股 / 美股，market 不传自动按 symbol 识别）。' +
      '周期默认 daily，复权默认按 SDK 默认（qfq）；日期支持 YYYYMMDD 或 YYYY-MM-DD。' +
      'indicators 为对象，键取自 14 个指标：ma / macd / boll / kdj / rsi / wr / bias / cci / ' +
      'atr / obv / roc / dmi / sar / kc，每个键传 true 即用默认参数开启，或传配置对象' +
      '（如 { ma: { periods: [5,10,20] }, macd: { short: 12, long: 26, signal: 9 } }）。' +
      'SDK 会按指标依赖自动向前多取若干 bar 保证首日有效。',
    inputSchema: obj(
      {
        symbol: symbolField('股票代码（A 股 / 港股 / 美股）'),
        market: {
          type: 'string',
          enum: INDICATOR_MARKET,
          description: '市场类型 A / HK / US；不传则由 symbol 自动识别',
        },
        period: periodHistory,
        adjust: adjustField,
        startDate: { type: 'string', description: '起始日期 YYYYMMDD 或 YYYY-MM-DD' },
        endDate: { type: 'string', description: '结束日期 YYYYMMDD 或 YYYY-MM-DD' },
        indicators: {
          type: 'object',
          description:
            '指标配置对象，键取自 ' +
            INDICATOR_KEYS.join(' / ') +
            '；值为 true（默认参数）或配置对象',
          properties: {
            ma: { description: 'MA 均线，true 或配置对象 { periods: [5,10,20], type: sma|ema|wma }' },
            macd: { description: 'MACD，true 或配置对象 { short, long, signal }' },
            boll: { description: '布林带，true 或配置对象 { period, stdDev }' },
            kdj: { description: 'KDJ，true 或配置对象 { period, kPeriod, dPeriod }' },
            rsi: { description: 'RSI，true 或配置对象 { periods }' },
            wr: { description: '威廉指标 WR，true 或配置对象 { periods }' },
            bias: { description: 'BIAS 乖离率，true 或配置对象 { periods }' },
            cci: { description: 'CCI，true 或配置对象 { period }' },
            atr: { description: 'ATR 真实波幅，true 或配置对象 { period }' },
            obv: { description: 'OBV，true 或配置对象 { maPeriod }' },
            roc: { description: 'ROC，true 或配置对象 { period, signalPeriod }' },
            dmi: { description: 'DMI / ADX，true 或配置对象 { period, adxPeriod }' },
            sar: { description: 'SAR 抛物线，true 或配置对象 { afStart, afIncrement, afMax }' },
            kc: { description: 'Keltner 通道 KC，true 或配置对象 { emaPeriod, atrPeriod, multiplier }' },
          },
        },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.kline.withIndicators(a.symbol as string, {
        market: a.market as MarketType | undefined,
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
        adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
        indicators: a.indicators as KlineWithIndicatorsOptions['indicators'],
      } satisfies KlineWithIndicatorsOptions),
  },
];
