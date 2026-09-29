/**
 * 涨停板 / 盘口异动 Service
 */
import { eastmoney } from '../providers';
import type {
  ZTPoolType,
  ZTPoolItem,
  StockChangeType,
  StockChangeItem,
  StockChangesOptions,
  BoardChangeItem,
  UnusualFluctuationItem,
  UnusualFluctuationOptions,
  IndividualStockChangeItem,
  IndividualChangesDay,
  IndividualChangesHistory,
  ChangeTypeCount,
} from '../types';
import type { RequestClient } from '../core';
import { asyncPool } from '../core/utils';
import { addDays, todayInTz, MARKET_TZ } from '../core/time';
import { InvalidArgumentError } from '../core/errors';
import { BaseService } from './baseService';
import type { QuoteService } from './quoteService';

/** `marketEvent.individualChanges` 的请求参数 */
export interface IndividualChangesOptions {
  /** 交易日 YYYYMMDD 或 YYYY-MM-DD;不传为北京时间今天 */
  date?: string;
}

/** `marketEvent.individualChangesHistory` 的请求参数 */
export interface IndividualChangesHistoryOptions {
  /**
   * 最近 N 个自然日(1~60)。内部按 A 股交易日历枚举其中的交易日逐日请求。
   * 注意服务端仅保留约最近数周(且可能存在个别日期空洞),
   * 无数据的日期返回 available: false。
   * @default 7
   */
  days?: number;
}

/** 逐日请求的并发上限(走 provider 限流策略,再叠一层温和的并发控制) */
const INDIVIDUAL_HISTORY_CONCURRENCY = 4;

export class MarketEventService extends BaseService {
  constructor(
    client: RequestClient,
    private readonly quoteService: Pick<QuoteService, 'getTradingCalendar'>
  ) {
    super(client);
  }

  /** 获取涨停股池（涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停） */
  getZTPool(type?: ZTPoolType, date?: string): Promise<ZTPoolItem[]> {
    return eastmoney.getZTPool(this.client, type, date);
  }

  /**
   * 获取全市场盘口异动。
   *
   * @param type 单类型 / 类型数组(一次请求多类型) / 'all'(全部 22 类);
   *             总量超单页 5000 时自动翻页收全
   * @param options `page` / `pageSize` 分页:任传其一只请求该页;都不传则翻页收全
   */
  getStockChanges(
    type?: StockChangeType | StockChangeType[] | 'all',
    options?: StockChangesOptions
  ): Promise<StockChangeItem[]> {
    return eastmoney.getStockChanges(this.client, type, options);
  }

  /** 获取板块异动详情 */
  getBoardChanges(): Promise<BoardChangeItem[]> {
    return eastmoney.getBoardChanges(this.client);
  }

  /** 获取监管异动（交易所股票交易异常波动）列表 */
  getUnusualFluctuation(
    options?: UnusualFluctuationOptions
  ): Promise<UnusualFluctuationItem[]> {
    return eastmoney.getUnusualFluctuation(this.client, options);
  }

  /**
   * 获取单只 A 股某个交易日的盘口异动事件流(全部类型,最新在前)。
   *
   * 服务端仅保留约最近数周的数据(且可能存在个别日期空洞):无数据日期与
   * "当日无异动"都返回空数组,需要区分请用 {@link getIndividualChangesHistory}
   * (其结果按日携带 available 标记)。
   *
   * @param symbol 股票代码,如 '600519' / 'sh600519'
   */
  async getIndividualChanges(
    symbol: string,
    options: IndividualChangesOptions = {}
  ): Promise<IndividualStockChangeItem[]> {
    const day = await eastmoney.getIndividualStockChanges(
      this.client,
      symbol,
      options.date
    );
    return day.changes;
  }

  /**
   * 聚合单只 A 股最近 N 个自然日的盘口异动(按交易日历枚举交易日,
   * 并发逐日请求后合并)。
   *
   * 服务端无数据的日期(超出保留范围或个别空洞日)以 `available: false`
   * 显式标注,整体覆盖情况见返回值的 `coverage`;`stats` 以原始类型码为键
   * 给出有数据日内各异动类型的出现次数(含中文标签)。
   *
   * 失败语义:任一交易日的请求在内置重试(provider 策略)后仍失败时,
   * 整个调用抛错、不返回部分结果(fail-fast,与 batch 系列一致);
   * `available: false` 只表示"服务端无该日数据",绝不用于掩盖请求失败。
   *
   * @param symbol 股票代码,如 '600519' / 'sh600519'
   */
  async getIndividualChangesHistory(
    symbol: string,
    options: IndividualChangesHistoryOptions = {}
  ): Promise<IndividualChangesHistory> {
    const { days = 7 } = options;
    if (!Number.isInteger(days) || days < 1 || days > 60) {
      throw new InvalidArgumentError(
        `days 应为 1~60 的整数,得到 ${JSON.stringify(days)}`,
        { argument: 'days', value: days }
      );
    }
    // 资产类型在取日历前校验:窗口内恰无交易日时逐日请求不会发生,
    // provider 层的守卫触达不到 —— 前移保证非法符号恒定零请求即拒
    // (守卫实现与文案在 provider 层单一来源)
    const ns = eastmoney.assertCnStockSymbol(symbol);

    const to = todayInTz(MARKET_TZ.CN);
    const from = addDays(to, -(days - 1));
    // 交易日历升序;asyncPool preserveOrder 保证 days 结果同为日期升序
    const calendar = await this.quoteService.getTradingCalendar();
    const tradingDays = calendar.filter((d) => d >= from && d <= to);

    const rawResults = await asyncPool(
      tradingDays.map(
        (date) => () =>
          eastmoney.getIndividualStockChanges(this.client, symbol, date)
      ),
      INDIVIDUAL_HISTORY_CONCURRENCY,
      true
    );
    // 回显对账:provider 的 date 取服务端回显 —— 若服务端对日历内某请求日
    // 回退到其它交易日(回显日 ≠ 请求日,如临时休市/该日数据缺失),携带的
    // 是别的交易日的事件,原样收录会造成 days[] 日期重复、stats 双重计数。
    // 按「服务端无请求日数据」处理,保持 days 与请求交易日一一对应、升序唯一
    const dayResults = rawResults.map((result, i) =>
      result.date === tradingDays[i]
        ? result
        : {
            date: tradingDays[i],
            available: false,
            code: result.code,
            name: '',
            changes: [],
          }
    );

    const availableDays = dayResults.filter((d) => d.available);
    // 键用原始类型码(稳定、可程序化比较),中文标签内联在值里供展示。
    // Object.create(null):键来自服务端(typeCode),空原型免疫
    // 'constructor' 等原型链键对 ??= 的干扰
    const stats: Record<string, ChangeTypeCount> = Object.create(null);
    for (const day of availableDays) {
      for (const change of day.changes) {
        const key = change.typeCode || 'unknown';
        const entry = (stats[key] ??= { count: 0, label: change.changeTypeLabel });
        entry.count += 1;
      }
    }

    // code/name 取窗口内任一有效日的回显;全超窗 / 无交易日时回退到符号归一结果
    const withName = availableDays.find((d) => d.name);
    const fallbackCode = dayResults[0]?.code ?? ns.code;

    return {
      code: withName?.code ?? fallbackCode,
      name: withName?.name ?? '',
      requestedDays: days,
      coverage: {
        from,
        to,
        availableFrom: availableDays[0]?.date ?? null,
      },
      days: dayResults,
      stats,
    };
  }
}
