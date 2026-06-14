/**
 * normalizeSymbol：把各种用户写法容错解析为统一的 NormalizedSymbol
 *
 * 解析优先级（命中即停）：
 *  1) 点分形式：东财 secid（1.600519 / 116.00700 / 105.AAPL）、后缀（600519.SH）、
 *     期货交易所（CFFEX.IF2412）、板块（90.BK0475）
 *  2) 字母前缀：sh / sz / bj / hk / us
 *  3) 纯数字：显式 market hint 优先（CN/HK/US 均可强制），无 hint 时
 *     6 位→CN（按首位推断交易所）、5/4 位→HK（补零到 5 位）
 *  4) 带 hint 的期货裸合约
 *  5) 纯字母→US
 *  6) 失败抛 InvalidSymbolError
 *
 * `hint` 与 `SymbolRef` 字段冲突时，显式入参（SymbolRef）优先；
 * 显式 hint（market/exchange）与符号本身的确定性解析结果矛盾时抛
 * InvalidSymbolError（纯数字等歧义输入上 hint 用于消歧而非校验），
 * 不静默选边产出 market/exchange 自相矛盾的结果。
 */
import { InvalidSymbolError } from '../core/errors';
import type {
  SymbolInput,
  SymbolRef,
  NormalizedSymbol,
  Market,
  AssetType,
  Exchange,
} from './types';
import { inferAShareExchange } from './infer';
import { FUTURES_EXCHANGES, extractVariety } from './futures';

/**
 * 市场字母标记 → { market, exchange }(F47: 单一来源)。
 * 前缀(sh600519)与后缀(600519.SH)共用同一组映射 —— 此前 PREFIX_MAP /
 * PREFIXES / SUFFIX_MAP 三处编码同一组数据,新增市场要三处同步。
 * 前缀查询用小写、后缀查询统一 toLowerCase 后查同一张表;
 * PREFIXES 由键派生(Object.keys 保插入序,stripRedundantPrefix 依赖该序)。
 */
const PREFIX_MAP: Record<string, { market: Market; exchange: Exchange }> = {
  sh: { market: 'CN', exchange: 'SSE' },
  sz: { market: 'CN', exchange: 'SZSE' },
  bj: { market: 'CN', exchange: 'BSE' },
  hk: { market: 'HK', exchange: 'HKEX' },
  us: { market: 'US', exchange: 'US' },
};
const PREFIXES = Object.keys(PREFIX_MAP);

/** 东财 secid 数字市场前缀 → { market, exchange } */
const SECID_MAP: Record<string, { market: Market; exchange: Exchange }> = {
  '0': { market: 'CN', exchange: 'SZSE' },
  '1': { market: 'CN', exchange: 'SSE' },
  '116': { market: 'HK', exchange: 'HKEX' },
  '105': { market: 'US', exchange: 'NASDAQ' },
  '106': { market: 'US', exchange: 'NYSE' },
  '107': { market: 'US', exchange: 'AMEX' },
};

/**
 * 有损 secid 前缀的可容交易所集(Review P2-9):东财 '0' 同时承载深交所与
 * 北交所(adapters 的 EXCHANGE_TO_SECID_PREFIX 即 BSE→'0'),
 * '0.bj430047' 是自洽输入 —— bj 前缀恰是该有损前缀需要的消歧信息,
 * 不应被 exchange 级精确比较误判为矛盾。
 */
const SECID_ADMISSIBLE_EXCHANGES: Record<string, Exchange[]> = {
  '0': ['SZSE', 'BSE'],
};

/** 交易所 → 所属市场（校验 exchange hint 与解析结果是否矛盾；未知交易所不校验） */
const EXCHANGE_MARKET: Partial<Record<Exchange, Market>> = {
  SSE: 'CN',
  SZSE: 'CN',
  BSE: 'CN',
  HKEX: 'HK',
  NASDAQ: 'US',
  NYSE: 'US',
  AMEX: 'US',
  US: 'US',
  ...Object.fromEntries(
    Object.values(FUTURES_EXCHANGES).map((fx) => [fx.exchange, fx.market])
  ),
};

/**
 * 点分形式中剥离与已解析市场冗余的字母前缀（'sh600519.SH' / '1.sh600519' → '600519'）。
 * 仅当前缀后是纯数字才视为前缀 —— 'SHW.US' / 'USB.US' 等真实字母 ticker 不受影响；
 * 前缀与解析结果矛盾时抛 InvalidSymbolError（如 'hk00700.SZ'、'1.sz000001'），
 * 不静默选边返回错误标的。
 *
 * `admissibleExchanges` 是解析侧允许的交易所集合(有损 secid 前缀如 '0'
 * 同时容纳 SZSE/BSE);命中集合内的前缀视为消歧信息,返回细化后的交易所
 * ('0.bj430047' → BSE,使 toTencentSymbol 拼出正确的 bj430047)。
 */
function stripRedundantPrefix(
  part: string,
  resolved: { market: Market; exchange: Exchange },
  rawInput: string,
  admissibleExchanges?: Exchange[]
): { code: string; exchange: Exchange } {
  const admissible = admissibleExchanges ?? [resolved.exchange];
  const lower = part.toLowerCase();
  for (const p of PREFIXES) {
    if (!lower.startsWith(p) || part.length <= p.length) continue;
    const rest = part.slice(p.length);
    if (!/^\d+$/.test(rest)) continue;
    const pm = PREFIX_MAP[p];
    if (pm.market !== resolved.market || !admissible.includes(pm.exchange)) {
      throw new InvalidSymbolError(
        `${rawInput} (prefix '${p}' conflicts with resolved ${resolved.market}/${resolved.exchange})`
      );
    }
    return { code: rest, exchange: pm.exchange };
  }
  return { code: part, exchange: resolved.exchange };
}

export function normalizeSymbol(
  input: SymbolInput,
  hint?: Partial<SymbolRef>
): NormalizedSymbol {
  const ref: SymbolRef =
    typeof input === 'string' ? { code: input } : { ...input };
  const rawInput = typeof input === 'string' ? input : input.code;
  const code0 = String(ref.code ?? '').trim();

  const hintMarket = ref.market ?? hint?.market;
  const hintAsset = ref.assetType ?? hint?.assetType;
  const hintExchange = ref.exchange ?? hint?.exchange;

  if (!code0) {
    throw new InvalidSymbolError(String(rawInput));
  }

  const finish = (
    market: Market,
    exchange: Exchange,
    code: string,
    assetType: AssetType,
    variety?: string
  ): NormalizedSymbol => {
    // market hint 与解析结果矛盾时拒绝(Review P1-3):此前仅纯数字分支尊重
    // market hint,字母/点分/前缀分支静默忽略 —— F39 把 kline.hk 接上
    // normalizeSymbol({market:'HK'}) 后,kline.hk('AAPL') 会拼出 105.AAPL
    // 拉回【真实美股数据】标注 HKD(此前是拼坏 secid 返回空数组的 fail-safe)。
    // 现在统一语义:hint 在可消歧分支用于消歧,与确定性解析结果矛盾即抛错。
    if (hintMarket && hintMarket !== market) {
      throw new InvalidSymbolError(
        `${rawInput} (market hint '${hintMarket}' conflicts with resolved market ${market})`
      );
    }
    // exchange hint 与解析出的 market 矛盾时拒绝（如 '600519' + {exchange:'HKEX'}）。
    // 否则会产出 market/exchange 自相矛盾的对象：toTencentSymbol 抛错而
    // toEastmoneySecid 拼出错误标的（116.600519）—— 与 N1 修 market 时同类问题。
    if (hintExchange) {
      const owner = EXCHANGE_MARKET[hintExchange];
      if (owner && owner !== market) {
        throw new InvalidSymbolError(
          `${rawInput} (exchange hint '${hintExchange}' belongs to market ${owner}, conflicts with resolved market ${market})`
        );
      }
    }
    return {
      market,
      exchange: hintExchange ?? exchange,
      assetType: hintAsset ?? assetType,
      code,
      variety,
      input: rawInput,
    };
  };

  // 点分分支的 code 归一(Review P2-10):HK 数字代码补零到 5 位、US 统一大写,
  // 与前缀/纯数字分支一致 —— 否则 '700.HK' 的行 code='700' 而 'hk700' 的
  // code='00700',code 字段随输入写法漂移,下游跨接口 join/对账静默丢行。
  const normalizeStockCode = (code: string, market: Market): string => {
    if (market === 'HK' && /^\d+$/.test(code)) return code.padStart(5, '0');
    if (market === 'US') return code.toUpperCase();
    return code;
  };

  // 1) 点分形式
  if (code0.includes('.')) {
    const dot = code0.indexOf('.');
    const left = code0.slice(0, dot);
    const right = code0.slice(dot + 1);
    const upperLeft = left.toUpperCase();
    const upperRight = right.toUpperCase();

    if (/^\d+$/.test(left) && SECID_MAP[left]) {
      const s = SECID_MAP[left];
      // secid 分支同样剥离冗余前缀：'1.sh600519' 的 code 应为 '600519'，
      // 否则 toTencentSymbol 拼成 'shsh600519'（与 SUFFIX 分支同款问题）。
      const stripped = stripRedundantPrefix(
        right,
        s,
        rawInput,
        SECID_ADMISSIBLE_EXCHANGES[left]
      );
      return finish(
        s.market,
        stripped.exchange,
        normalizeStockCode(stripped.code, s.market),
        'stock'
      );
    }
    // hasOwnProperty 守卫:小写键查找会命中 Object.prototype 继承属性
    // ('600519.constructor' 此前产出 market/exchange 均 undefined 的畸形对象)
    const suffixKey = right.toLowerCase();
    const suffix = Object.prototype.hasOwnProperty.call(PREFIX_MAP, suffixKey)
      ? PREFIX_MAP[suffixKey]
      : undefined;
    if (suffix) {
      const stripped = stripRedundantPrefix(left, suffix, rawInput);
      return finish(
        suffix.market,
        stripped.exchange,
        normalizeStockCode(stripped.code, suffix.market),
        'stock'
      );
    }
    if (FUTURES_EXCHANGES[upperLeft]) {
      const fx = FUTURES_EXCHANGES[upperLeft];
      return finish(fx.market, fx.exchange, upperRight, 'futures', extractVariety(right));
    }
    if (left === '90') {
      return finish('CN', 'SSE', right, 'board');
    }
  }

  // 2) 字母前缀
  const lower = code0.toLowerCase();
  for (const p of PREFIXES) {
    if (lower.startsWith(p) && code0.length > p.length) {
      const rest = code0.slice(p.length);
      const s = PREFIX_MAP[p];
      // A 股代码无字母：CN 系前缀(sh/sz/bj)要求 rest 全数字，否则不当作前缀
      // （如 'SHW'/'SHOP' 是美股 ticker，不应被 'sh' 前缀吞成 A 股）；hk/us 允许字母
      const restOk =
        s.market === 'CN' ? /^\d+$/.test(rest) : /^[0-9A-Za-z]+$/.test(rest);
      if (restOk) {
        const code =
          s.market === 'HK'
            ? rest.padStart(5, '0')
            : s.market === 'US'
              ? rest.toUpperCase()
              : rest;
        return finish(s.market, s.exchange, code, 'stock');
      }
    }
  }

  // 3) 纯数字：显式 market hint 优先于长度启发式 ——
  //    {market:'CN'} 时 4/5 位代码不再被强判为港股（修复前 aShareKline/fundFlow
  //    内部以 {market:'CN'} + 用户输入调用，传 '00700' 会静默拿到港股数据）。
  if (/^\d+$/.test(code0)) {
    if (hintMarket === 'US') {
      return finish('US', 'US', code0, 'stock');
    }
    if (hintMarket === 'CN') {
      return finish('CN', inferAShareExchange(code0), code0, 'stock');
    }
    if (hintMarket === 'HK' || code0.length === 5 || code0.length === 4) {
      return finish('HK', 'HKEX', code0.padStart(5, '0'), 'stock');
    }
    // 默认 6 位及其它 → A 股
    return finish('CN', inferAShareExchange(code0), code0, 'stock');
  }

  // 4) 带 hint 的期货裸合约（如 rb2510 + assetType:'futures'）
  if (
    (hintAsset === 'futures' || hintMarket === 'GLOBAL') &&
    /[A-Za-z]/.test(code0)
  ) {
    const futExchange = hintExchange as Exchange | undefined;
    if (!futExchange && hintMarket === 'GLOBAL') {
      // 海外期货必须显式 exchange(COMEX/NYMEX/CBOT/LME...)，不能默认国内 SHFE
      throw new InvalidSymbolError(
        `${rawInput} (GLOBAL futures require an explicit exchange, e.g. { exchange: 'COMEX' })`
      );
    }
    // exchange hint 可直接确定市场（COMEX→GLOBAL），无需用户重复传 market
    const exchangeMarket = futExchange
      ? FUTURES_EXCHANGES[String(futExchange).toUpperCase()]?.market
      : undefined;
    return finish(
      hintMarket ?? exchangeMarket ?? 'CN',
      futExchange ?? 'SHFE',
      code0.toUpperCase(),
      'futures',
      extractVariety(code0)
    );
  }

  // 5) 纯字母 → 美股
  if (/^[A-Za-z][A-Za-z.\-]*$/.test(code0)) {
    return finish('US', 'US', code0.toUpperCase(), 'stock');
  }

  throw new InvalidSymbolError(String(rawInput));
}

/**
 * 解析符号所属市场;解析失败返回 `undefined`,不抛错。
 *
 * F42: 收编 SDK(indicatorService.detectMarket)与 CLI(manifest.detectMarketTag)
 * 各自 wrap normalizeSymbol + catch 的双实现。本函数**不**替调用方决定解析失败
 * 时的兜底市场 —— "失败归 A 股"之类的 fallback 决策保留在各调用方(各一行),
 * 避免把上层策略埋进共享符号层。
 */
export function marketOf(input: SymbolInput): Market | undefined {
  try {
    return normalizeSymbol(input).market;
  } catch {
    return undefined;
  }
}
