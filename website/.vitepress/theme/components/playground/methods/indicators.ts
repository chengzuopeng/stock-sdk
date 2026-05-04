import type { MethodSpec } from '../types';
import {
  getDefaultDateRangeISO,
  KLINE_PERIOD_OPTIONS,
  ADJUST_OPTIONS,
  toCompactDate,
} from '../utils';

const dates = getDefaultDateRangeISO();

export const indicatorsMethods: MethodSpec[] = [
  {
    name: 'getKlineWithIndicators',
    desc: '获取带技术指标的 K 线',
    category: 'indicator',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '支持 A股/港股/美股' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'qfq', options: ADJUST_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
      {
        key: 'indicators',
        label: '技术指标',
        type: 'text',
        default: 'ma,macd,boll,kdj,rsi',
        placeholder: 'ma,macd,boll,kdj,rsi,wr,bias,cci,atr',
      },
    ],
    // 这里保留静态示例：把每个指标的可选配置完整列出来更适合作为参考文档，
    // 而非根据用户当前 indicators 字符串简单拼接。
    code: `// 获取带技术指标的 K 线数据
const data = await sdk.getKlineWithIndicators('sz000001', {
  period: 'daily',
  adjust: 'qfq',
  startDate: '2024-01-01',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
    rsi: { periods: [6, 12, 24] },
    wr: true,
    bias: { periods: [6, 12, 24] },
    cci: { period: 14 },
    atr: { period: 14 }
  }
});

// 访问指标数据
console.log(data[0].date);          // 日期
console.log(data[0].ma?.ma5);       // MA5
console.log(data[0].macd?.dif);     // MACD DIF
console.log(data[0].boll?.upper);   // 布林上轨
console.log(data[0].kdj?.k);        // KDJ K值
console.log(data[0].rsi?.rsi6);     // RSI6
console.log(data[0].atr?.atr);      // ATR`,
    run: (sdk, params) => {
      const options: any = { period: params.period, adjust: params.adjust };
      // getKlineWithIndicators 内部会调 getHistoryKline / getHKHistoryKline 等，
      // 这些方法对日期格式要求 YYYYMMDD（直传到东方财富 beg/end）
      const start = toCompactDate(params.startDate);
      const end = toCompactDate(params.endDate);
      if (start) options.startDate = start;
      if (end) options.endDate = end;
      const indicatorList = (params.indicators ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      options.indicators = {};
      for (const ind of indicatorList) {
        if (ind === 'ma') options.indicators.ma = { periods: [5, 10, 20, 60] };
        else if (ind === 'macd') options.indicators.macd = true;
        else if (ind === 'boll') options.indicators.boll = true;
        else if (ind === 'kdj') options.indicators.kdj = true;
        else if (ind === 'rsi') options.indicators.rsi = { periods: [6, 12, 24] };
        else if (ind === 'wr') options.indicators.wr = true;
        else if (ind === 'bias') options.indicators.bias = { periods: [6, 12, 24] };
        else if (ind === 'cci') options.indicators.cci = true;
        else if (ind === 'atr') options.indicators.atr = true;
      }
      return sdk.getKlineWithIndicators(params.symbol, options);
    },
  },
];
