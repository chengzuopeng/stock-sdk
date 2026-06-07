/**
 * MCP 工具：板块（行业 / 概念）列表 / 成分 / 行情 / K 线 / 分时。
 * 行业、概念两套结构对称，各 5 个工具，数据源为东方财富。
 */
import type { ToolDef } from '../types';
import type { JsonSchemaProp } from '../types';
import { obj, symbolField, periodHistory, startDateYmd, endDateYmd } from './schema';

/** 板块历史 K 线周期字面量（与 BoardKlineOptions.period 对齐） */
type BoardKlinePeriod = 'daily' | 'weekly' | 'monthly';
/** 板块复权字面量（与 BoardKlineOptions.adjust 对齐） */
type BoardKlineAdjust = '' | 'qfq' | 'hfq';
/** 板块分钟周期字面量（与 BoardMinuteKlineOptions.period 对齐） */
type BoardMinutePeriod = '1' | '5' | '15' | '30' | '60';

/**
 * 板块复权方式：board provider 默认 ''（不复权），与个股的 qfq 默认不同，
 * 故不复用共享 adjustField，本文件内单独定义。
 */
const boardAdjustField: JsonSchemaProp = {
  type: 'string',
  enum: ['', 'qfq', 'hfq'],
  default: '',
  description:
    "复权方式，默认不复权（''）；需前复权传 qfq（看走势），后复权传 hfq（算收益）",
};

/**
 * 板块分钟周期：board provider 默认 '5'（5 分钟 K 线），与共享 periodMinute 的
 * 默认 '1' 不同，故不复用共享 periodMinute，本文件内单独定义。
 */
const boardPeriodMinute: JsonSchemaProp = {
  type: 'string',
  enum: ['1', '5', '15', '30', '60'],
  default: '5',
  description: '分钟周期；默认 5（5 分钟 K 线），当日分时请传 period=1',
};

export const boardTools: ToolDef[] = [
  // ===== 行业板块 =====
  {
    name: 'get_industry_list',
    tier: 'core',
    description:
      '获取行业板块列表（东方财富）：板块代码、名称、最新价、涨跌幅、成交额、领涨股等。无参。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.board.industry.list(),
  },
  {
    name: 'get_industry_spot',
    tier: 'full',
    description:
      '获取指定行业板块的成分股实时行情列表（最新价、涨跌幅、成交量额等）。symbol 为行业板块代码（如 BK0475）或名称。',
    inputSchema: obj(
      { symbol: symbolField('行业板块代码（如 BK0475）或板块名称') },
      ['symbol']
    ),
    invoke: (sdk, a) => sdk.board.industry.spot(a.symbol as string),
  },
  {
    name: 'get_industry_constituents',
    tier: 'core',
    description:
      '获取指定行业板块的成分股列表（代码、名称等基础信息）。symbol 为行业板块代码（如 BK0475）或名称。',
    inputSchema: obj(
      { symbol: symbolField('行业板块代码（如 BK0475）或板块名称') },
      ['symbol']
    ),
    invoke: (sdk, a) => sdk.board.industry.constituents(a.symbol as string),
  },
  {
    name: 'get_industry_kline',
    tier: 'full',
    description:
      '获取行业板块历史 K 线（日/周/月）：日期、开高低收、成交量额、涨跌幅。价格单位为元。复权默认不复权，需前/后复权请显式传 adjust。',
    inputSchema: obj(
      {
        symbol: symbolField('行业板块代码（如 BK0475）或板块名称'),
        period: periodHistory,
        adjust: boardAdjustField,
        startDate: startDateYmd,
        endDate: endDateYmd,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.board.industry.kline(a.symbol as string, {
        period: a.period as BoardKlinePeriod | undefined,
        adjust: a.adjust as BoardKlineAdjust | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_industry_minute_kline',
    tier: 'full',
    description:
      '获取行业板块分时/分钟 K 线。period=1 返回当日分时；5/15/30/60 返回对应分钟 K 线。默认 5（5 分钟 K 线），当日分时请传 period=1。',
    inputSchema: obj(
      {
        symbol: symbolField('行业板块代码（如 BK0475）或板块名称'),
        period: boardPeriodMinute,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.board.industry.minuteKline(a.symbol as string, {
        period: a.period as BoardMinutePeriod | undefined,
      }),
  },

  // ===== 概念板块 =====
  {
    name: 'get_concept_list',
    tier: 'core',
    description:
      '获取概念板块列表（东方财富）：板块代码、名称、最新价、涨跌幅、成交额、领涨股等。无参。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.board.concept.list(),
  },
  {
    name: 'get_concept_spot',
    tier: 'full',
    description:
      '获取指定概念板块的成分股实时行情列表（最新价、涨跌幅、成交量额等）。symbol 为概念板块代码（如 BK0815）或名称。',
    inputSchema: obj(
      { symbol: symbolField('概念板块代码（如 BK0815）或板块名称') },
      ['symbol']
    ),
    invoke: (sdk, a) => sdk.board.concept.spot(a.symbol as string),
  },
  {
    name: 'get_concept_constituents',
    tier: 'core',
    description:
      '获取指定概念板块的成分股列表（代码、名称等基础信息）。symbol 为概念板块代码（如 BK0815）或名称。',
    inputSchema: obj(
      { symbol: symbolField('概念板块代码（如 BK0815）或板块名称') },
      ['symbol']
    ),
    invoke: (sdk, a) => sdk.board.concept.constituents(a.symbol as string),
  },
  {
    name: 'get_concept_kline',
    tier: 'full',
    description:
      '获取概念板块历史 K 线（日/周/月）：日期、开高低收、成交量额、涨跌幅。价格单位为元。复权默认不复权，需前/后复权请显式传 adjust。',
    inputSchema: obj(
      {
        symbol: symbolField('概念板块代码（如 BK0815）或板块名称'),
        period: periodHistory,
        adjust: boardAdjustField,
        startDate: startDateYmd,
        endDate: endDateYmd,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.board.concept.kline(a.symbol as string, {
        period: a.period as BoardKlinePeriod | undefined,
        adjust: a.adjust as BoardKlineAdjust | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_concept_minute_kline',
    tier: 'full',
    description:
      '获取概念板块分时/分钟 K 线。period=1 返回当日分时；5/15/30/60 返回对应分钟 K 线。默认 5（5 分钟 K 线），当日分时请传 period=1。',
    inputSchema: obj(
      {
        symbol: symbolField('概念板块代码（如 BK0815）或板块名称'),
        period: boardPeriodMinute,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.board.concept.minuteKline(a.symbol as string, {
        period: a.period as BoardMinutePeriod | undefined,
      }),
  },
];
