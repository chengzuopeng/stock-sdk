/**
 * 东方财富分钟 K 线 / 分时 provider 工厂(F45)
 *
 * 分钟K线流程此前在 4 处复制(aShareKline.getMinuteKline / hkKline.getHKMinuteKline /
 * usKline.getUSMinuteKline / boardCommon.fetchBoardMinuteKline):每处都是
 * 「period='1' → trends2/get + 行解析」/「5/15/30/60 → kline/get + parseEmKlineCsv」
 * 双分支;历史上 '23:59'(end 仅日期补尾)、F9(窗口归一)、F34(beg/end 下推)
 * 等修复都要手工同步多份。本工厂参照 historyKlineFactory 的范式收编共同流程
 * (URL 组装、trends/klines 解析循环、normalizeMinuteWindow 过滤、
 * resolveMinuteBegEnd 下推),市场差异以 config 注入。
 */
import {
  RequestClient,
  EM_PUSH_TOKEN,
  MARKET_TZ,
  assertMinutePeriod,
  assertAdjustType,
  getAdjustCode,
  parseMarketTime,
  toNullableEpoch,
  formatInTz,
  toNumber,
  type MarketTz,
} from '../../core';
import type { MinuteTimeline, MinuteKline } from '../../types';
import {
  fetchEmHistoryKline,
  parseEmKlineCsv,
  normalizeMinuteWindow,
  resolveMinuteBegEnd,
  type EmKlineItem,
} from './utils';

/** 分钟 K 线周期 */
export type MinutePeriod = '1' | '5' | '15' | '30' | '60';

/**
 * 工厂可消化的请求选项合集。各市场公开的 Options 接口均为其子集;
 * 工厂只读取 config 声明启用的字段(如板块 window='full' 不读 startDate/endDate、
 * A 股 ndays 固定不读 options.ndays),未声明的字段被悄悄传入时与收编前一样被忽略。
 */
export interface MinuteKlineRequestOptions {
  period?: MinutePeriod;
  adjust?: '' | 'qfq' | 'hfq';
  startDate?: string;
  endDate?: string;
  ndays?: number;
}

/** 归一化后的请求标的:请求用 secid + 行映射可消费的纯代码(HK/US 行携带 code 字段) */
export interface MinuteKlineTarget {
  secid: string;
  code: string;
}

/**
 * trends2/get 行的解析结果(与 parseEmKlineCsv 对应的分时版)。
 * 各市场 CSV 列一致;板块的最后一列语义为最新价,由其 mapper 改名 price。
 */
export interface EmTrendItem {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  avgPrice: number | null;
}

/** trends2/get 行 CSV 解析 */
export function parseEmTrendCsv(line: string): EmTrendItem {
  const [time, open, close, high, low, volume, amount, avgPrice] =
    line.split(',');
  return {
    time,
    open: toNumber(open),
    close: toNumber(close),
    high: toNumber(high),
    low: toNumber(low),
    volume: toNumber(volume),
    amount: toNumber(amount),
    avgPrice: toNumber(avgPrice),
  };
}

/**
 * 分钟 K 线 provider 工厂配置
 *
 * @template TTimeline period='1' 时的行类型(分时)
 * @template TKline period='5'|'15'|'30'|'60' 时的行类型(分钟 K 线)
 */
export interface MinuteKlineProviderConfig<
  TTimeline extends { time: string },
  TKline extends { time: string },
> {
  /** 1 分钟分时接口(trends2/get) */
  trendsUrl: string;
  /** 5/15/30/60 分钟 K 线接口(kline/get) */
  klineUrl: string;
  /** symbol → secid(+行映射用纯代码) */
  resolveTarget: (symbol: string) => MinuteKlineTarget;
  /** trends 行(已 parseEmTrendCsv)→ 输出对象 */
  mapTrendRow: (item: EmTrendItem, target: MinuteKlineTarget) => TTimeline;
  /** kline CSV 行(已 parseEmKlineCsv)→ 输出对象 */
  mapKlineRow: (item: EmKlineItem, target: MinuteKlineTarget) => TKline;
  /** 默认周期(股票 '1';板块保持现状 '5') */
  defaultPeriod: MinutePeriod;
  /** trends 分支 ndays:固定值(A 股 '5'/板块 '1')或读 options.ndays 缺省 1(HK/US) */
  ndays: { fixed: string } | 'option';
  /** kline 分支 fqt:'option' 断言并解析 options.adjust(缺省 'qfq');板块固定 '1' 且不做 assert */
  fqt: 'option' | { fixed: string };
  /** 请求是否携带 ut token(板块接口不带) */
  includeUt: boolean;
  /**
   * startDate/endDate 窗口策略:
   * - `filter`:支持窗口 —— kline 分支把日期部分下推为 beg/end(F34 服务端按天
   *   裁剪),两分支均做 normalizeMinuteWindow 本地过滤;`endExtraDays` 为 end
   *   下推时额外加的天数(美股 +1,详见 usKline.ts)
   * - `full`:无窗口选项(板块)—— kline 分支固定 beg/end 全量拉取,不做本地过滤
   */
  window:
    | { mode: 'filter'; endExtraDays?: number }
    | { mode: 'full'; beg: string; end: string };
  /** kline 分支额外参数(板块的 smplmt/lmt) */
  extraKlineParams?: Record<string, string>;
}

type OverseasRow<T, C extends string> = Omit<T, 'tz'> & {
  tz: MarketTz;
  currency: C;
  code: string;
};

/**
 * 港股/美股共用的行映射:东方财富 trends2 / kline 返回的 time 字符串以
 * +08:00(北京时间)表示,必须先按 Asia/Shanghai 解出 epoch,再 format 到
 * 市场本地时区 —— 若直接用 buildTimeMeta(rawTime, 本地tz) 会把北京时间当
 * 本地时间(美股 NYC 与北京差 12-13 小时,timestamp 与窗口过滤都会错;
 * 港股 HKT 与 CST 同为 UTC+8,数值上无偏移,但统一走该流程保持风格一致)。
 *
 * F21:这里是全库仅有的绕过 buildTimeMeta 直落 timestamp 的路径,
 * parseMarketTime 解析失败的 NaN 必须经 toNullableEpoch 归一为 null,
 * 否则违反 `number | null` 的 v2 契约。
 */
export function createOverseasMinuteRowMappers<C extends string>(
  tz: MarketTz,
  currency: C
): {
  mapTrendRow: (
    item: EmTrendItem,
    target: MinuteKlineTarget
  ) => OverseasRow<MinuteTimeline, C>;
  mapKlineRow: (
    item: EmKlineItem,
    target: MinuteKlineTarget
  ) => OverseasRow<MinuteKline, C>;
} {
  const toLocal = (timeStr: string) => {
    const epoch = parseMarketTime(timeStr, MARKET_TZ.CN);
    return {
      time: formatInTz(epoch, tz) || timeStr,
      timestamp: toNullableEpoch(epoch),
    };
  };

  return {
    mapTrendRow: ({ time: rawTime, ...nums }, target) => ({
      ...toLocal(rawTime),
      tz,
      ...nums,
      currency,
      code: target.code,
    }),
    mapKlineRow: ({ date, ...rest }, target) => ({
      ...toLocal(date),
      tz,
      ...rest,
      currency,
      code: target.code,
    }),
  };
}

/**
 * 创建分钟 K 线 / 分时 provider。
 *
 * `period='1'` 走 trends2/get(分时),其余走 kline/get(分钟 K 线);
 * 行为细节(参数、过滤、空数据返回 [])与收编前各市场实现一致。
 */
export function createMinuteKlineProvider<
  TTimeline extends { time: string },
  TKline extends { time: string },
>(config: MinuteKlineProviderConfig<TTimeline, TKline>) {
  return async function getMinuteKline(
    client: RequestClient,
    symbol: string,
    options: MinuteKlineRequestOptions = {}
  ): Promise<TTimeline[] | TKline[]> {
    const period = options.period ?? config.defaultPeriod;
    assertMinutePeriod(period);
    if (config.fqt === 'option') {
      assertAdjustType(options.adjust ?? 'qfq');
    }

    const target = config.resolveTarget(symbol);
    const win = config.window;

    /** filter 模式:窗口过滤(哨兵默认值与收编前一致);full 模式原样返回 */
    const finish = <R extends { time: string }>(rows: R[]): R[] => {
      if (win.mode === 'full') return rows;
      const { start, end } = normalizeMinuteWindow(
        options.startDate ?? '1979-09-01 09:32:00',
        options.endDate ?? '2222-01-01 09:32:00'
      );
      return rows.filter((row) => row.time >= start && row.time <= end);
    };

    if (period === '1') {
      // 1 分钟分时:trends2/get
      const params = new URLSearchParams({
        fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
        ...(config.includeUt ? { ut: EM_PUSH_TOKEN } : {}),
        ndays:
          config.ndays === 'option'
            ? String(options.ndays ?? 1)
            : config.ndays.fixed,
        iscr: '0',
        secid: target.secid,
      });
      const url = `${config.trendsUrl}?${params.toString()}`;
      const json = await client.get<{ data?: { trends?: string[] } }>(url, {
        responseType: 'json',
      });
      const trends = json?.data?.trends;
      if (!Array.isArray(trends) || trends.length === 0) {
        return [];
      }
      return finish(
        trends.map((line) => config.mapTrendRow(parseEmTrendCsv(line), target))
      );
    }

    // 5/15/30/60 分钟 K 线:kline/get
    // F34:filter 模式把 startDate/endDate 日期部分下推为 beg/end 做服务端
    // 裁剪(注意取 options.* 原始值 —— 哨兵默认时间不应推给上游);
    // full 模式(板块)无窗口选项,维持固定全量 beg/end。
    const serverWindow =
      win.mode === 'filter'
        ? resolveMinuteBegEnd(
            options.startDate,
            options.endDate,
            win.endExtraDays ?? 0
          )
        : { beg: win.beg, end: win.end };

    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      ...(config.includeUt ? { ut: EM_PUSH_TOKEN } : {}),
      klt: period,
      fqt:
        config.fqt === 'option'
          ? getAdjustCode(options.adjust ?? 'qfq')
          : config.fqt.fixed,
      secid: target.secid,
      beg: serverWindow.beg,
      end: serverWindow.end,
      ...(config.extraKlineParams ?? {}),
    });
    const { klines } = await fetchEmHistoryKline(client, config.klineUrl, params);
    if (!Array.isArray(klines) || klines.length === 0) {
      return [];
    }
    return finish(
      klines.map((line) => config.mapKlineRow(parseEmKlineCsv(line), target))
    );
  };
}
