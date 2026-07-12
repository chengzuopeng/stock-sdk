/**
 * MCP 工具：带技术指标的 K 线 —— 全库唯一保留手写 schema/invoke 的工具。
 *
 * 保留手写的原因：MCP 侧用嵌套 `indicators` 对象（14 个指标键，值为 true 或配置对象）
 * 表达指标配置，而 CLI 侧是 14 个扁平 flag（--ma 5,10 --macd ...），两端表面形态不同，
 * 无法由共享 spec 的扁平 ParamSpec 自动派生。
 *
 * 单一来源仍然成立：name/tier/description 取自 spec（kline.withIndicators 条目），
 * 共享参数（market/period/adjust/startDate/endDate）的枚举与文案经 `paramProp`
 * 取自 spec 片段，不在本文件重复定义。
 */
import type { KlineWithIndicatorsOptions, MarketType } from '../../sdk';
import type { ToolDef } from '../types';
import { ADJUST, END, MARKET_ENUM, PERIOD_DWM, START, findMethodSpec } from '../../spec/methods';
import { paramProp } from '../../spec/derive-mcp';

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

const SPEC = findMethodSpec('kline.withIndicators');

export const klineWithIndicatorsTool: ToolDef = {
  name: SPEC.toolName!,
  tier: SPEC.tier ?? 'full',
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
          '指标配置对象，键取自 ' +
          INDICATOR_KEYS.join(' / ') +
          '；值为 true（默认参数）或配置对象。舍入型指标可传 decimals 指定输出小数位（默认 3）',
        properties: {
          ma: { description: 'MA 均线，true 或配置对象 { periods: [5,10,20], type: sma|ema|wma, decimals }' },
          macd: { description: 'MACD，true 或配置对象 { short, long, signal, decimals }' },
          boll: { description: '布林带，true 或配置对象 { period, stdDev, decimals }' },
          kdj: { description: 'KDJ，true 或配置对象 { period, kPeriod, dPeriod, decimals }' },
          rsi: { description: 'RSI，true 或配置对象 { periods, decimals }' },
          wr: { description: '威廉指标 WR，true 或配置对象 { periods, decimals }' },
          bias: { description: 'BIAS 乖离率，true 或配置对象 { periods, decimals }' },
          cci: { description: 'CCI，true 或配置对象 { period, decimals }' },
          atr: { description: 'ATR 真实波幅，true 或配置对象 { period, decimals }' },
          obv: { description: 'OBV，true 或配置对象 { maPeriod }' },
          roc: { description: 'ROC，true 或配置对象 { period, signalPeriod }' },
          dmi: { description: 'DMI / ADX，true 或配置对象 { period, adxPeriod }' },
          sar: { description: 'SAR 抛物线，true 或配置对象 { afStart, afIncrement, afMax }' },
          kc: { description: 'Keltner 通道 KC，true 或配置对象 { emaPeriod, atrPeriod, multiplier }' },
        },
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
