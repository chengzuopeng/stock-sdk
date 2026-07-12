/**
 * 命令清单（cli.md §4）。
 *
 * 两部分：
 * 1. NAMESPACE_COMMANDS —— 全部 84 个命名空间方法（`sdk.<ns>.<method>`）+ 顶层 `search`，
 *    自 `src/spec/methods.ts` 的共享方法 spec 派生（CLI 与 MCP 单一事实来源），
 *    个别方法在本文件挂自定义 invoke（northbound 方向参数 / withIndicators 指标组装）。
 * 2. ALIAS_COMMANDS —— 第 1 层高频快捷命令（带自定义 `invoke`，如 `quote` 的市场识别），
 *    保持手写，可复用 option 片段经 `toOptionSpec` 取自 spec。
 */
import { marketOf, normalizeSymbol, toTencentSymbol } from '../symbols';
import { lookupSpecialIndex } from '../symbols/specialIndex';
import { toNumberArray, invokeMethod } from './dispatch';
import type { StockSDK } from '../sdk';
import { CliUsageError } from './errors';
import { InvalidSymbolError } from '../core/errors';
import type { CommandSpec, InvokeContext, OptionSpec, PositionalSpec } from './types';
import {
  METHOD_SPECS,
  ADJUST,
  START,
  END,
  PERIOD_DWM,
  PERIOD_MIN,
  NDAYS,
  PERIOD_INDICATORS,
  BOOL_INDICATORS,
  ZT_POOL_TYPES,
  SUPPORTED_MARKETS,
} from '../spec/methods';
import { toCommandSpec, toOptionSpec } from '../spec/derive-cli';

// ---------- 自 spec 取用的可复用 option 片段（枚举/文案单一来源） ----------
const PERIOD_DWM_OPT: OptionSpec = toOptionSpec(PERIOD_DWM);
const PERIOD_MIN_OPT: OptionSpec = toOptionSpec(PERIOD_MIN);
const ADJUST_OPT: OptionSpec = toOptionSpec(ADJUST);
const START_OPT: OptionSpec = toOptionSpec(START);
const END_OPT: OptionSpec = toOptionSpec(END);
const NDAYS_OPT: OptionSpec = toOptionSpec(NDAYS);
const SYMBOL: PositionalSpec[] = [{ name: 'symbol', required: true }];
const CODE: PositionalSpec[] = [{ name: 'code', required: true }];

// ---------- 个别命名空间方法的自定义 invoke（覆盖「path + argShape」默认派生） ----------
const CLI_INVOKE_OVERRIDES: Record<string, CommandSpec['invoke']> = {
  'kline.withIndicators': (sdk, ctx) => invokeWithIndicators(sdk, ctx),
  // northbound 的 direction 支持 --direction flag 或首位置参数（spec 两者都声明，此处消化）
  'northbound.minute': (sdk, ctx) => invokeMethod(sdk, ['northbound', 'minute'], [readDirection(ctx)]),
  'northbound.history': (sdk, ctx) => {
    const opts: Record<string, unknown> = {};
    if (ctx.options.start !== undefined) opts.startDate = ctx.options.start;
    if (ctx.options.end !== undefined) opts.endDate = ctx.options.end;
    return invokeMethod(sdk, ['northbound', 'history'], [readDirection(ctx), opts]);
  },
};

// 装载期对账(Review P3-14):override 键拼错 / spec 路径改名时此前会【静默】
// 落回默认派生 invoke(northbound 的 --direction 会进 options 而非首实参,
// 返回错方向数据)。镜像 MCP 侧 CUSTOM_TOOLS 的 throw 对账,装载即失败。
{
  const knownPaths = new Set(METHOD_SPECS.map((spec) => spec.path.join('.')));
  for (const key of Object.keys(CLI_INVOKE_OVERRIDES)) {
    if (!knownPaths.has(key)) {
      throw new Error(
        `CLI_INVOKE_OVERRIDES 引用了 spec 中不存在的方法路径: ${key}`
      );
    }
  }
}

/** 全部命名空间方法 + 顶层 search 的 CommandSpec（自共享 spec 派生）。 */
export const NAMESPACE_COMMANDS: CommandSpec[] = METHOD_SPECS.map((spec) =>
  toCommandSpec(spec, CLI_INVOKE_OVERRIDES[spec.path.join('.')])
);

/** 取某个派生命令的 options（别名与命名空间共用同一组声明）。 */
function nsOptions(path: string): OptionSpec[] {
  return NAMESPACE_COMMANDS.find((c) => c.path.join('.') === path)?.options ?? [];
}

/** kline withIndicators 的全部选项（period/adjust/start/end/market + 14 个指标 flag）。 */
const WITH_INDICATORS_OPTS: OptionSpec[] = nsOptions('kline.withIndicators');

// ---------- 高频别名命令（带自定义 invoke）----------
const MARKET_ALIAS_OPT: OptionSpec = {
  flag: 'market',
  type: 'enum',
  enum: ['a', 'hk', 'us'],
  desc: '市场 a/hk/us(默认按代码自动识别)',
};
const QUOTE_MARKET_OPT: OptionSpec = {
  flag: 'market',
  type: 'enum',
  enum: ['a', 'hk', 'us', 'fund'],
  desc: '市场 a/hk/us/fund(默认按代码自动识别；基金须显式 --market fund)',
};
const LIMIT_OPT: OptionSpec = { flag: 'limit', type: 'number', desc: '只取前 N 条(CLI 输出层裁剪)' };

/**
 * symbol 智能识别市场 → 'a'|'hk'|'us'（CLI 别名层用）。
 * F42: 解析收编到 symbols/marketOf(与 SDK indicatorService.detectMarket 共享);
 * 解析失败(undefined)归 'a' 的 fallback 决策保留在 CLI 层。
 */
function detectMarketTag(symbol: string): 'a' | 'hk' | 'us' {
  const market = marketOf(symbol);
  // GLOBAL(GDAXI 等)无自动路由标签:直接给出 raw-secid 指引
  if (market === 'GLOBAL') {
    throw new CliUsageError(
      `暂不支持自动路由 GLOBAL 市场符号: ${symbol}`,
      `海外特殊指数暂无正式 K 线入口,可用 raw-secid 直通: stock-sdk kline 100.GDAXI --market us`
    );
  }
  return market === 'HK' ? 'hk' : market === 'US' ? 'us' : 'a';
}

/** CLI 市场标签 → SDK Market。 */
function tagToMarket(tag: 'a' | 'hk' | 'us'): 'CN' | 'HK' | 'US' {
  return tag === 'hk' ? 'HK' : tag === 'us' ? 'US' : 'CN';
}

/** 校验并归一 `--market` 取值；非法值（含 parser 把无值 flag 置成的 `true`）抛 CliUsageError。 */
function resolveForcedMarket(raw: unknown): 'a' | 'hk' | 'us' | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'a' || raw === 'hk' || raw === 'us') return raw;
  throw new CliUsageError('--market 非法值', '可选: a / hk / us');
}

/** quote 命令额外支持 fund（基金行情走 quotes.fund）。 */
function resolveQuoteMarket(raw: unknown): 'a' | 'hk' | 'us' | 'fund' | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'a' || raw === 'hk' || raw === 'us' || raw === 'fund') return raw;
  throw new CliUsageError('--market 非法值', '可选: a / hk / us / fund');
}

/** northbound 的 direction：支持 --direction flag 或首位置参数，校验 north/south。 */
function readDirection(ctx: InvokeContext): 'north' | 'south' | undefined {
  const raw = ctx.options.direction ?? ctx.positional[0];
  if (raw === undefined) return undefined;
  if (raw === 'north' || raw === 'south') return raw;
  throw new CliUsageError('direction 非法值', '可选: north / south');
}

function klineOptsFromCtx(ctx: InvokeContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (ctx.options.period !== undefined) out.period = ctx.options.period;
  if (ctx.options.adjust !== undefined) {
    out.adjust = ctx.options.adjust === 'none' ? '' : ctx.options.adjust;
  }
  if (ctx.options.start !== undefined) out.startDate = ctx.options.start;
  if (ctx.options.end !== undefined) out.endDate = ctx.options.end;
  return out;
}

/** indicators 命令：把 --ma/--macd/... 组装成 KlineWithIndicatorsOptions.indicators（cli.md §4.1）。 */
function buildIndicatorOptions(opts: Record<string, unknown>): Record<string, unknown> {
  const indicators: Record<string, unknown> = {};
  for (const key of PERIOD_INDICATORS) {
    const v = opts[key];
    if (v === undefined) continue;
    if (v === true) {
      indicators[key] = {}; // 仅 --ma → 用指标默认周期
      continue;
    }
    const nums = toNumberArray(v);
    if (nums.length > 0) indicators[key] = { periods: nums };
    // v 为 'false'/'0'/'no' 等非数字串 → toNumberArray 为空 → 不启用(修 --ma=false 误启用)
  }
  for (const key of BOOL_INDICATORS) {
    const v = opts[key];
    if (v === undefined) continue;
    // 布尔语义：--macd / --macd true → 启用；--macd=false / =0 / =no → 不启用(修 =false 反而启用)
    if (v === true || v === 'true' || v === '1' || v === 'yes') indicators[key] = true;
  }
  return indicators;
}

/** kline.withIndicators 的统一 invoke(别名 `indicators` 与命名空间直达 `kline withIndicators` 共用)。 */
function invokeWithIndicators(sdk: StockSDK, ctx: InvokeContext): Promise<unknown> {
  const symbol = requireSymbol(ctx, 'indicators');
  const opts: Record<string, unknown> = {};
  if (ctx.options.period !== undefined) opts.period = ctx.options.period;
  if (ctx.options.adjust !== undefined) opts.adjust = ctx.options.adjust === 'none' ? '' : ctx.options.adjust;
  if (ctx.options.start !== undefined) opts.startDate = ctx.options.start;
  if (ctx.options.end !== undefined) opts.endDate = ctx.options.end;
  if (ctx.options.market !== undefined) opts.market = ctx.options.market;
  opts.indicators = buildIndicatorOptions(ctx.options);
  return invokeMethod(sdk, ['kline', 'withIndicators'], [symbol, opts]);
}

export const ALIAS_COMMANDS: CommandSpec[] = [
  {
    path: ['quotes', 'cnSimple'],
    alias: ['quote'],
    summary: '行情(自动识别市场；--full 全量五档；--market 强制市场)',
    argShape: 'codes[]',
    positional: [{ name: 'code', required: true, variadic: true }],
    options: [QUOTE_MARKET_OPT, { flag: 'full', type: 'boolean', desc: 'A股全量五档行情' }],
    invoke: async (sdk, ctx) => {
      const codes = ctx.positional;
      if (codes.length === 0) throw new CliUsageError('缺少股票代码', '用法: stock-sdk quote <code...>');
      const forced = resolveQuoteMarket(ctx.options.market);
      const full = ctx.options.full === true;
      // 按市场分组(显式优先，否则按代码识别；基金不参与自动识别，须显式 --market fund)
      const groups: Record<'a' | 'hk' | 'us' | 'fund', string[]> = { a: [], hk: [], us: [], fund: [] };
      for (const c of codes) {
        if (forced === 'fund') {
          groups.fund.push(c); // 基金代码直接透传(quotes.fund 接受纯代码)
          continue;
        }
        // F38: 自动识别此前是 detectMarketTag(内部 normalizeSymbol)+ 按市场再
        // normalizeSymbol 的双重解析；改为每 code 单次 normalizeSymbol,市场标签
        // 直接从解析结果派生(HK→hk / US→us / 其它→a)。forced 时仍按指定市场
        // 单次解析(该路径本来就只解析一次)。分组与代码格式行为不变：
        // A股 push 腾讯前缀格式(sh600519)，港/美 push 纯代码，解析失败原样透传
        // (自动识别失败归入 'a'，与旧 detectMarketTag 的 catch → 'a' 一致)。
        let tag: 'a' | 'hk' | 'us' = forced ?? 'a';
        try {
          const ns = forced
            ? normalizeSymbol(c, { market: tagToMarket(forced) })
            : normalizeSymbol(c);
          if (!forced) tag = ns.market === 'HK' ? 'hk' : ns.market === 'US' ? 'us' : 'a';
          // 特殊指数拦截仅限【腾讯无行情映射】的注册项(CSI/HSHCI/GDAXI:a 组会
          // 抛错被吞、hk 组会拼 hkHSHCI)。带腾讯码的(HSI/HSCEI/HSTECH/DJI/INX/
          // IXIC)行情可用,放行走正常分组 —— 此前一刀切拦截,前缀形回读修复后
          // `quotes hkHSI` 会收到与事实相反的报错(HSTECH 还与 kline 侧指引循环)。
          const specialIdx =
            ns.assetType === 'index' ? lookupSpecialIndex(ns.code) : undefined;
          if (specialIdx && !specialIdx.tencent) {
            throw new CliUsageError(
              `特殊指数 ${ns.code} 无行情接口`,
              `行情源(腾讯)不覆盖该特殊指数;K 线请用: stock-sdk kline ${ns.code}`
            );
          }
          groups[tag].push(tag === 'a' ? toTencentSymbol(ns) : ns.code);
        } catch (e) {
          // CLI 层主动抛出的用法错误(如上方特殊指数拦截)直接浮出,不参与透传兜底
          if (e instanceof CliUsageError) {
            throw e;
          }
          // R3-7:区分两类解析失败 ——
          // (a) 代码本身可解析(marketOf 给得出市场),却在 forced --market 下抛
          //     InvalidSymbolError:这是 P1-3 的「强制市场与代码确定性解析矛盾」
          //     (如 --market hk + 'sh600519'),必须浮出为干净 CLI 错误;此前被
          //     裸 catch 吞掉,'sh600519' 原样塞进 HK 组拉回垃圾查询。
          // (b) 代码本身就解析不了(裸期货合约/特殊写法/'@@' 等):维持原样透传
          //     语义,原码塞进当前市场组交由上游接口判定(自动识别路径与
          //     forced 路径一致)。
          if (forced && e instanceof InvalidSymbolError && marketOf(c) !== undefined) {
            throw e;
          }
          groups[tag].push(c);
        }
      }
      // 各市场并发请求、互不阻塞;单市场失败不连累其它(部分成功仍返回可用结果)。
      const tasks: Array<Promise<unknown>> = [];
      if (groups.a.length)
        tasks.push(Promise.resolve(full ? sdk.quotes.cn(groups.a) : sdk.quotes.cnSimple(groups.a)));
      if (groups.hk.length) tasks.push(Promise.resolve(sdk.quotes.hk(groups.hk)));
      if (groups.us.length) tasks.push(Promise.resolve(sdk.quotes.us(groups.us)));
      if (groups.fund.length) tasks.push(Promise.resolve(sdk.quotes.fund(groups.fund)));
      const settled = await Promise.allSettled(tasks);
      const out: unknown[] = [];
      const rejected: unknown[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled') out.push(...(r.value as unknown[]));
        else rejected.push(r.reason);
      }
      // 全部失败 → 抛首个错误(保留 SdkError 类型与退出码);部分成功 → 返回可用结果 + stderr 提示。
      if (out.length === 0 && rejected.length > 0) throw rejected[0];
      if (rejected.length > 0) {
        const msg = rejected.map((e) => (e instanceof Error ? e.message : String(e))).join('; ');
        process.stderr.write(`stock-sdk: 部分市场行情查询失败: ${msg}\n`);
      }
      return out;
    },
  },
  {
    path: ['kline', 'cn'],
    alias: ['kline'],
    summary: 'K线(--market a/hk/us；--limit 截断)',
    argShape: 'symbol+options',
    positional: SYMBOL,
    options: [PERIOD_DWM_OPT, ADJUST_OPT, START_OPT, END_OPT, MARKET_ALIAS_OPT, LIMIT_OPT],
    invoke: async (sdk, ctx) => {
      const symbol = requireSymbol(ctx, 'kline');
      const market = resolveForcedMarket(ctx.options.market) ?? detectMarketTag(symbol);
      const opts = klineOptsFromCtx(ctx);
      const method = market === 'hk' ? 'hk' : market === 'us' ? 'us' : 'cn';
      return invokeMethod(sdk, ['kline', method], [symbol, opts]);
    },
  },
  {
    path: ['kline', 'cnMinute'],
    alias: ['minute'],
    summary: '分钟K线/分时(--period 1/5/15/30/60；--market；港/美 --ndays)',
    argShape: 'symbol+options',
    positional: SYMBOL,
    options: [PERIOD_MIN_OPT, ADJUST_OPT, START_OPT, END_OPT, MARKET_ALIAS_OPT, LIMIT_OPT, NDAYS_OPT],
    invoke: async (sdk, ctx) => {
      const symbol = requireSymbol(ctx, 'minute');
      const market = resolveForcedMarket(ctx.options.market) ?? detectMarketTag(symbol);
      const opts = klineOptsFromCtx(ctx);
      const method = market === 'hk' ? 'hkMinute' : market === 'us' ? 'usMinute' : 'cnMinute';
      if (ctx.options.ndays !== undefined) {
        // A 股分时接口无 ndays:声明了就要么生效要么报错,不静默丢弃
        if (method === 'cnMinute') {
          throw new CliUsageError('--ndays 仅支持港/美股分时', '示例: stock-sdk minute 00700 --ndays 5');
        }
        opts.ndays = Number(ctx.options.ndays);
      }
      return invokeMethod(sdk, ['kline', method], [symbol, opts]);
    },
  },
  {
    path: ['kline', 'withIndicators'],
    alias: ['indicators'],
    summary: '带指标K线(--ma 5,10,20 --macd --kdj --rsi --boll ...；--market)',
    argShape: 'symbol+options',
    positional: SYMBOL,
    // 与命名空间 kline withIndicators 同一组选项(此前别名漏 --market，
    // invoke 明明支持却被严格校验拒绝)
    options: WITH_INDICATORS_OPTS,
    invoke: invokeWithIndicators,
  },
  {
    path: ['search'],
    alias: ['search'],
    summary: '搜索股票/指数/基金(--limit 截断)',
    argShape: 'positional',
    positional: [{ name: 'keyword', required: true }],
    options: [LIMIT_OPT],
    invoke: async (sdk, ctx) => {
      const keyword = ctx.positional[0];
      if (!keyword) throw new CliUsageError('缺少搜索关键词', '用法: stock-sdk search <keyword>');
      return sdk.search(keyword);
    },
  },
  {
    path: ['quotes', 'timeline'],
    alias: ['timeline'],
    summary: '当日分时',
    argShape: 'positional',
    positional: CODE,
    invoke: async (sdk, ctx) => {
      const code = ctx.positional[0];
      if (!code) throw new CliUsageError('缺少股票代码', '用法: stock-sdk timeline <code>');
      return sdk.quotes.timeline(code);
    },
  },
  {
    path: ['codes', 'cn'],
    alias: ['codes'],
    summary: '代码列表(market: a/hk/us/fund；--simple；--board sh/sz/bj/kc/cy)',
    argShape: 'positional',
    positional: [{ name: 'market', required: true, enum: ['a', 'hk', 'us', 'fund'] }],
    options: [{ flag: 'simple', type: 'boolean', desc: '去前缀' }, { flag: 'board', field: 'market', type: 'string', desc: '板块 sh/sz/bj/kc/cy(仅A股)' }],
    invoke: async (sdk, ctx) => {
      const market = ctx.positional[0];
      const opts: Record<string, unknown> = {};
      if (ctx.options.simple === true) opts.simple = true;
      // --board 是 A 股板块筛选(sh/sz/bj/kc/cy)，不透传给美股
      // (美股 market 取值是 NASDAQ/NYSE/AMEX，错误取值会静默返回空列表)
      if (ctx.options.board !== undefined) {
        if (market !== 'a') {
          throw new CliUsageError('--board 仅支持 A 股(market=a)', '可选: sh / sz / bj / kc / cy');
        }
        opts.market = ctx.options.board;
      }
      switch (market) {
        case 'a':
          return invokeMethod(sdk, ['codes', 'cn'], [opts]);
        case 'us':
          return invokeMethod(sdk, ['codes', 'us'], [opts]);
        case 'hk':
          return sdk.codes.hk();
        case 'fund':
          return sdk.codes.fund();
        default:
          throw new CliUsageError(`未知市场: ${market}`, '可选: a / hk / us / fund');
      }
    },
  },
  {
    path: ['calendar', 'marketStatus'],
    alias: ['status'],
    summary: '市场状态(a/hk/us，默认 a)',
    argShape: 'positional',
    positional: [{ name: 'market', upper: true, enum: SUPPORTED_MARKETS }],
    invoke: async (sdk, ctx) => {
      const raw = ctx.positional[0];
      const market = (raw ? raw.toUpperCase() : 'A') as 'A' | 'HK' | 'US';
      return sdk.calendar.marketStatus(market);
    },
  },
  {
    path: ['marketEvent', 'ztPool'],
    alias: ['ztpool'],
    summary: '涨停股池 zt/yesterday/strong/sub_new/broken/dt(--date)',
    argShape: 'positional',
    positional: [{ name: 'type', enum: ZT_POOL_TYPES }],
    options: [{ flag: 'date', type: 'string', desc: '交易日 YYYYMMDD' }],
    invoke: async (sdk, ctx) => {
      const type = ctx.positional[0] as
        | 'zt'
        | 'yesterday'
        | 'strong'
        | 'sub_new'
        | 'broken'
        | 'dt'
        | undefined;
      const date = ctx.options.date as string | undefined;
      return sdk.marketEvent.ztPool(type, date);
    },
  },
  {
    path: ['call'],
    alias: ['call'],
    summary: "原始直通：调用任意命名空间方法（--args 传 JSON 实参数组）",
    argShape: 'positional',
    positional: [{ name: 'method', required: true }],
    options: [{ flag: 'args', type: 'string', desc: 'JSON 实参数组，如 \'[["sh600519"]]\'' }],
    invoke: (sdk, ctx) => {
      const path = ctx.positional[0];
      if (!path) {
        throw new CliUsageError('call 缺少方法路径', "用法: stock-sdk call <ns.method> --args '[...]'");
      }
      let args: unknown[] = [];
      const argsRaw = ctx.options.args;
      if (typeof argsRaw === 'string') {
        try {
          const parsed: unknown = JSON.parse(argsRaw);
          args = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          throw new CliUsageError('--args 不是合法 JSON', '示例: --args \'[["sh600519"]]\'');
        }
      }
      // 白名单:只放行 manifest 声明的方法路径。此前用 DANGEROUS 黑名单走原型链,
      // 运行时可达 sdk 的内部成员(client/service 字段)且绕过全部选项校验;
      // 且旧实现无绑定调用(target(...args)),顶层原型方法(search)丢 this 直接崩溃。
      const allowed = new Set(allMethodPaths());
      if (!allowed.has(path)) {
        throw new CliUsageError(
          `未知方法: ${path}`,
          '形如 quotes.cn / kline.cn(仅命名空间方法,见 stock-sdk --help)'
        );
      }
      return invokeMethod(sdk, path.split('.'), args);
    },
  },
];

/** mcp 命令（特殊：不调用 sdk，启动 MCP server）。在 index 单独处理。 */
export const MCP_COMMAND_NAME = 'mcp';

/** 所有命令（别名优先于命名空间，便于覆盖默认派生）。 */
export const COMMANDS: CommandSpec[] = [...ALIAS_COMMANDS, ...NAMESPACE_COMMANDS];

/** 命名空间方法路径数（用于 manifest 完整性测试；顶层 search 不计入）。 */
export function namespaceMethodCount(): number {
  return METHOD_SPECS.filter((s) => s.path.join('.') !== 'search').length; // 93
}

/** 全部命名空间方法路径（点分），含顶层 search。 */
export function allMethodPaths(): string[] {
  return METHOD_SPECS.map((s) => s.path.join('.'));
}

function requireSymbol(ctx: InvokeContext, cmd: string): string {
  const symbol = ctx.positional[0];
  if (!symbol) throw new CliUsageError('缺少代码参数', `用法: stock-sdk ${cmd} <symbol>`);
  return symbol;
}

/**
 * 收集所有布尔 flag（供 parser 识别，避免吞掉下一个 token）。
 * 含全局布尔 + manifest 中 type==='boolean' 的 option + 它们的短名。
 */
export function collectBooleanFlags(): Set<string> {
  const set = new Set<string>(['help', 'h', 'version', 'V', 'quiet', 'q', 'pretty']);
  for (const cmd of COMMANDS) {
    for (const opt of cmd.options ?? []) {
      if (opt.type === 'boolean') set.add(opt.flag);
    }
  }
  // indicators 别名支持的布尔指标（buildIndicatorOptions 用到，但未在 options 显式声明），
  // 必须登记为布尔，否则 parser 会贪婪吃掉后面的 symbol（如 `indicators --cci 600519`）。
  for (const k of BOOL_INDICATORS) set.add(k);
  return set;
}

/**
 * 按 positional tokens 匹配命令：
 * 先匹配第 1 个 token 是否为别名；否则按命名空间路径做最长前缀匹配。
 * @returns 命中的 spec 与「命令路径之后剩余的位置参数」；无匹配返回 null
 */
export function findCommand(tokens: string[]): { spec: CommandSpec; rest: string[] } | null {
  if (tokens.length === 0) return null;
  // 1. 命名空间最长前缀匹配，**≥2 段优先**（消除 `kline cn` / `codes cn` 被别名 `kline`/`codes` 抢占的歧义）
  for (let len = Math.min(3, tokens.length); len >= 2; len--) {
    const prefix = tokens.slice(0, len).join('.');
    const def = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === prefix);
    if (def) return { spec: def, rest: tokens.slice(len) };
  }
  // 2. 别名（单 token，带增强：市场识别 / limit 等）
  for (const cmd of ALIAS_COMMANDS) {
    if (cmd.alias?.includes(tokens[0])) {
      return { spec: cmd, rest: tokens.slice(1) };
    }
  }
  // 3. 单段命名空间方法（如顶层 `search`，无别名时）
  const single = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === tokens[0]);
  if (single) return { spec: single, rest: tokens.slice(1) };
  return null;
}
