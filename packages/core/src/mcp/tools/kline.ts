/**
 * MCP 工具：带技术指标的 K 线 —— 全库唯一保留手写 schema/invoke 的工具。
 *
 * 保留手写的原因：MCP 侧用嵌套 `indicators` 对象
 * 表达指标配置，而 CLI 侧是 14 个扁平 flag（--ma 5,10 --macd ...），两端表面形态不同，
 * 无法由共享 spec 的扁平 ParamSpec 自动派生。
 *
 * 单一来源仍然成立：name/tier/description 取自 spec（kline.withIndicators 条目），
 * 共享参数（market/period/adjust/startDate/endDate）的枚举与文案经 `paramProp`
 * 取自 spec 片段，不在本文件重复定义。
 */
import type { KlineWithIndicatorsOptions, MarketType } from '../../sdk';
import type { JsonSchemaProp, ToolDef } from '../types';
import { ADJUST, END, MARKET_ENUM, PERIOD_DWM, START, findMethodSpec } from '../../spec/methods';
import { paramProp } from '../../spec/derive-mcp';

const NUMBER = { type: 'number' } as const;
const PERIODS = { type: 'array', items: NUMBER } as const;
const ROUNDED_PERIOD = { period: NUMBER, decimals: NUMBER };
const PERIOD_LIST = { ...ROUNDED_PERIOD, periods: PERIODS };

function indicator(
  description: string,
  properties: Record<string, JsonSchemaProp>,
  acceptsPeriodList = false
): JsonSchemaProp {
  const anyOf: JsonSchemaProp[] = [
    { type: 'boolean' },
    { type: 'object', properties, additionalProperties: false },
  ];
  if (acceptsPeriodList) anyOf.push(PERIODS);
  return { description, anyOf };
}

const INDICATOR_PROPERTIES = {
  ma: indicator('MA 均线', { ...PERIOD_LIST, type: { type: 'string', enum: ['sma', 'ema', 'wma'] } }, true),
  macd: indicator('MACD', { short: NUMBER, long: NUMBER, signal: NUMBER, decimals: NUMBER }),
  boll: indicator('布林带', { ...ROUNDED_PERIOD, stdDev: NUMBER }),
  kdj: indicator('KDJ', { ...ROUNDED_PERIOD, kPeriod: NUMBER, dPeriod: NUMBER }),
  rsi: indicator('RSI', PERIOD_LIST, true),
  wr: indicator('威廉指标 WR', PERIOD_LIST, true),
  bias: indicator('BIAS 乖离率', PERIOD_LIST, true),
  cci: indicator('CCI', ROUNDED_PERIOD),
  atr: indicator('ATR 真实波幅', ROUNDED_PERIOD),
  obv: indicator('OBV', { maPeriod: NUMBER }),
  roc: indicator('ROC', { period: NUMBER, signalPeriod: NUMBER }),
  dmi: indicator('DMI / ADX', { period: NUMBER, adxPeriod: NUMBER }),
  sar: indicator('SAR 抛物线', { afStart: NUMBER, afIncrement: NUMBER, afMax: NUMBER }),
  kc: indicator('Keltner 通道 KC', { emaPeriod: NUMBER, atrPeriod: NUMBER, multiplier: NUMBER }),
} satisfies Record<keyof NonNullable<KlineWithIndicatorsOptions['indicators']>, JsonSchemaProp>;

const SPEC = findMethodSpec('kline.withIndicators');

export const klineWithIndicatorsTool: ToolDef = {
  name: SPEC.toolName!,
  tier: SPEC.tier ?? 'full',
  output: SPEC.mcpOutput,
  description: SPEC.mcpDesc ?? SPEC.summary,
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description:
          '股票代码。A 股 / 港股裸码即可（600519 / 00700）；美股支持裸 ticker（AAPL）或 secid（105.AAPL）',
      },
      market: paramProp(MARKET_ENUM),
      period: paramProp(PERIOD_DWM),
      adjust: paramProp(ADJUST),
      // 与历史 K 线共享 spec 片段，仅本工具的日期格式额外支持 YYYY-MM-DD
      startDate: { ...paramProp(START), description: '起始日期 YYYYMMDD 或 YYYY-MM-DD' },
      endDate: { ...paramProp(END), description: '结束日期 YYYYMMDD 或 YYYY-MM-DD' },
      indicators: {
        type: 'object',
        description:
          '用 true 启用默认参数，false 关闭，或传入指标配置对象。' +
          'MA、RSI、WR、BIAS 也接受周期数组或 { period }。舍入型指标默认保留 3 位小数。',
        properties: INDICATOR_PROPERTIES,
        additionalProperties: false,
      },
    },
    required: ['symbol'],
    additionalProperties: false,
  },
  invoke: (sdk, a) =>
    sdk.kline.withIndicators(a.symbol as string, {
      market: a.market as MarketType | undefined,
      period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
      adjust: a.adjust as '' | 'qfq' | 'hfq' | undefined,
      startDate: a.startDate as string | undefined,
      endDate: a.endDate as string | undefined,
      indicators: a.indicators as KlineWithIndicatorsOptions['indicators'],
    } satisfies KlineWithIndicatorsOptions),
};
