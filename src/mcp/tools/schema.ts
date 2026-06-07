/**
 * 可复用的 JSON Schema 片段与构造助手。
 * 各领域 tools/*.ts 共享，减少重复与漂移（mcp.md §11）。
 */
import type { JsonSchema, JsonSchemaProp } from '../types';

/** 构造对象型 inputSchema */
export function obj(
  properties: Record<string, JsonSchemaProp>,
  required?: string[]
): JsonSchema {
  return { type: 'object', properties, required, additionalProperties: false };
}

/** 代码数组（带不带交易所前缀均可，SDK 内部 normalizeSymbol 容错） */
export const codesField: JsonSchemaProp = {
  type: 'array',
  items: { type: 'string' },
  description: "代码数组，带不带交易所前缀均可，如 ['sh600519','000001','600036']",
};

/** 单个标的代码 */
export function symbolField(description: string): JsonSchemaProp {
  return { type: 'string', description };
}

/** 历史 K 线周期 */
export const periodHistory: JsonSchemaProp = {
  type: 'string',
  enum: ['daily', 'weekly', 'monthly'],
  default: 'daily',
  description: '历史 K 线周期',
};

/** 分钟 K 线周期 */
export const periodMinute: JsonSchemaProp = {
  type: 'string',
  enum: ['1', '5', '15', '30', '60'],
  default: '1',
  description: '分钟周期；1=当日分时',
};

/** 复权方式 */
export const adjustField: JsonSchemaProp = {
  type: 'string',
  enum: ['', 'qfq', 'hfq'],
  default: 'qfq',
  description: "复权：qfq=前复权(默认,看走势) / hfq=后复权(算收益) / ''=不复权",
};

/** YYYYMMDD 起始日期 */
export const startDateYmd: JsonSchemaProp = { type: 'string', description: '起始日期 YYYYMMDD' };
/** YYYYMMDD 结束日期 */
export const endDateYmd: JsonSchemaProp = { type: 'string', description: '结束日期 YYYYMMDD' };
