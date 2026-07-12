/**
 * MCP Skills 的单一事实来源（SSOT）—— 面向场景的分析「技能」，落地为 MCP Prompts。
 *
 * 与 `methods.ts`（工具 SSOT）对称：`PROMPT_SPECS` → `derive-prompt.ts` → `src/mcp/prompts/`。
 * 每个技能 = 一段英文「任务说明书」（render），`prompts/get` 时把它下发给客户端 model，
 * model 自己走 tools/call 循环。**server 不执行编排**，只交付计划。设计见
 * `localdocs/mcp-skills-prompts-td.md`。
 *
 * 语言约定（TD D-8）：指令体英文（model 遵循更稳、生态一致），末尾统一指示
 * 「respond in the user's language」——中文用户提问仍得到中文分析。
 *
 * tier 一致性（关键）：**core 技能的 usesTools 只能引用 core 工具**，否则默认配置
 * （tools=core + prompts=core）下技能会指名一个未暴露的工具。这条由
 * `prompts-contract.test.ts` 机械兜住。为此本文件对 TD 初稿的部分 usesTools 做了
 * 收敛（如选股/市场概览改用 core 的 get_fund_flow_rank / 成分股 / 批量行情，
 * 不再引用 full 的 get_all_a_share_quotes / get_stock_changes / get_industry_spot）。
 */

/** 一个技能参数（对应 MCP prompt argument：只有 name/description/required，无类型/枚举）。 */
export interface PromptArgSpec {
  name: string;
  description: string;
  required?: boolean;
  /** 未传时用于模板的默认值（仅文档展示 + render 兜底，不做类型校验）。 */
  default?: string;
}

/** 一个技能的完整声明（一处定义，派生 MCP PromptDef）。 */
export interface PromptSpec {
  /** MCP prompt name（snake_case，如 analyze_stock）。 */
  name: string;
  /** 客户端展示标题（简洁英文）。 */
  title: string;
  /** 一句话描述（prompts/list 与文档共用）。 */
  description: string;
  tier: 'core' | 'full';
  args: PromptArgSpec[];
  /**
   * 该技能编排时点名的 MCP 工具（真实存在的 toolName）。仅供 contract 测试机械校验
   * 「引用的工具都存在」「模板确实点了名」「core 技能不越级引用 full 工具」，不进 prompts/list。
   */
  usesTools: string[];
  /**
   * 编排说明书模板。接收已解析 + 默认值填充的 args，返回给 model 的英文任务文本。
   * 纯函数、无 IO（prompts/get 不取数，只下发计划）。
   */
  render: (args: Record<string, string>) => string;
}

export const PROMPT_SPECS: PromptSpec[] = [
  // ============================ Core（4，默认启用） ============================
  {
    name: 'analyze_stock',
    title: 'Analyze stock (technical)',
    description:
      'Full technical analysis of one symbol: klines + indicators + signals, summarized.',
    tier: 'core',
    args: [
      {
        name: 'symbol',
        description: 'Stock code, e.g. sh600519 / 600519 / 00700 / AAPL',
        required: true,
      },
      {
        name: 'period',
        description: 'Kline period: daily / weekly / monthly (default daily)',
        default: 'daily',
      },
    ],
    usesTools: ['search', 'get_kline_with_indicators', 'get_kline_signals'],
    render: (a) =>
      `You are a rigorous equity technical-analysis assistant. Perform a complete technical analysis of ${a.symbol}.

[Data — call these read-only tools as needed; never fabricate data]
1. If ${a.symbol} might not be a canonical code, confirm it with \`search\` first.
2. Use \`get_kline_with_indicators\` to fetch ${a.period} klines with MA(5/10/20/60), MACD, BOLL, KDJ and RSI overlaid.
3. Use \`get_kline_signals\` to detect golden/death crosses, overbought/oversold, BOLL breakouts and SAR reversals.

[Analysis]
- Trend: MA alignment, price-vs-MA relationship, MACD direction.
- Momentum: KDJ / RSI overbought/oversold, any divergence.
- Key levels: BOLL upper/lower bands, recent support/resistance.
- Signals: list recent valid signals (type + date) and judge reliability — corroborate with price/volume, don't just name them.

[Output]
Give (1) a one-line verdict (bullish / bearish / range-bound); (2) per-dimension points (trend / momentum / signals / risk); (3) an explicit note that this is technical analysis of public market data and not investment advice.`,
  },
  {
    name: 'screen_stocks',
    title: 'Screen stocks',
    description:
      'Build a candidate shortlist over a chosen universe by natural-language criteria, coarse-filtering before per-symbol indicator work.',
    tier: 'core',
    args: [
      {
        name: 'criteria',
        description:
          'Screening criteria in natural language, e.g. "MACD golden cross and turnover > 5%"',
        required: true,
      },
      {
        name: 'scope',
        description:
          'Universe to screen: an industry/concept board name, or the whole market (default)',
        default: 'the whole A-share market',
      },
    ],
    usesTools: [
      'get_industry_constituents',
      'get_concept_constituents',
      'get_fund_flow_rank',
      'get_a_share_quotes',
      'get_kline_with_indicators',
      'get_kline_signals',
    ],
    render: (a) =>
      `You are a disciplined equity screening assistant. Build a candidate shortlist from ${a.scope} that matches: ${a.criteria}.

[Workflow — read-only tools; mind the cost of scanning many symbols]
1. Resolve the universe:
   - If ${a.scope} names an industry board, call \`get_industry_constituents\`; if a concept board, call \`get_concept_constituents\` to list its members.
   - If it is the whole market, start from \`get_fund_flow_rank\` (whole-market main-force net-inflow ranking, top ~200) as a manageable candidate pool.
2. Coarse-filter FIRST on cheap fields: call \`get_a_share_quotes\` on the universe and screen by change% / turnover / volume-ratio / market cap — narrow to a small subset BEFORE any per-symbol indicator work.
3. Confirm on the subset only: for each surviving candidate call \`get_kline_with_indicators\` and \`get_kline_signals\` to check the technical part of the criteria (e.g. MACD golden cross, RSI not overbought).

[Output]
Return a ranked shortlist — code, name, why it matched (the specific criteria met), and any caveat. State how many symbols you scanned vs. shortlisted. Never run per-symbol klines across thousands of names; always coarse-filter first.`,
  },
  {
    name: 'market_overview',
    title: 'Market overview',
    description:
      "Today's A-share snapshot: market status, limit-up breadth, northbound flow, main-force money direction.",
    tier: 'core',
    args: [],
    usesTools: [
      'get_market_status',
      'get_zt_pool',
      'get_northbound_flow_summary',
      'get_fund_flow_rank',
    ],
    render: () =>
      `You are a market briefing assistant. Give a concise snapshot of today's A-share market.

[Data — read-only]
1. \`get_market_status\` — is the market pre-open / open / lunch break / after-hours / closed (tells you how live the read is).
2. \`get_zt_pool\` — the limit-up pool (breadth and risk appetite; also prior-day limit-ups for follow-through).
3. \`get_northbound_flow_summary\` — northbound / southbound money direction.
4. \`get_fund_flow_rank\` — where main-force money is flowing (leaders by net inflow).

[Output]
A short brief: (1) market status line; (2) risk appetite read from limit-up breadth; (3) capital direction (northbound + main-force leaders); (4) a one-line takeaway. Note this is a single snapshot, not continuous monitoring.`,
  },
  {
    name: 'monitor_watchlist',
    title: 'Monitor watchlist',
    description:
      'Single-shot check of a watchlist: batch quotes, then drill into names that crossed a threshold.',
    tier: 'core',
    args: [
      {
        name: 'symbols',
        description:
          'Comma-separated stock codes to monitor, e.g. "600519,000858,300750"',
        required: true,
      },
    ],
    usesTools: [
      'get_a_share_quotes',
      'get_today_timeline',
      'get_individual_fund_flow',
      'get_kline_signals',
    ],
    render: (a) =>
      `You are a watchlist monitoring assistant. Check the current state of these symbols: ${a.symbols}.

[Data — read-only]
1. \`get_a_share_quotes\` — batch real-time quotes for all of ${a.symbols} at once (price, change%, turnover, volume-ratio, bid/ask).
2. For any name that looks active (big move / volume spike), dig in:
   - \`get_today_timeline\` — the intraday path, to tell a steady move from a one-off spike.
   - \`get_individual_fund_flow\` — whether main-force money is flowing in or out.
   - \`get_kline_signals\` — any fresh technical signal (cross / breakout) on the daily.

[Output]
One line per symbol (price, change%, notable flag). Then call out the 1–3 names that crossed a threshold (big move / volume / main-force inflow / new signal) with a short why. This is a single snapshot — for continuous watching, re-run this skill on a schedule from your client.`,
  },

  // ============================ Full（3，需 prompts=full 或点名） ============================
  {
    name: 'analyze_capital_flow',
    title: 'Analyze capital flow',
    description:
      'Smart-money / main-force read for one stock or the broad market: fund flow + dragon-tiger + block trades + margin + northbound.',
    tier: 'full',
    args: [
      {
        name: 'symbol',
        description: 'Optional stock code to focus on; omit for a market-wide read',
        required: false,
      },
    ],
    usesTools: [
      'get_individual_fund_flow',
      'get_market_fund_flow',
      'get_dragon_tiger_detail',
      'get_dragon_tiger_seat_detail',
      'get_block_trade_detail',
      'get_margin_account_info',
      'get_northbound_individual',
    ],
    render: (a) => {
      const focus = a.symbol ? `stock ${a.symbol}` : 'the broad market';
      return `You are a capital-flow / smart-money analyst. Focus: ${focus}.

[Data — read-only; pick what fits the focus]
- \`get_individual_fund_flow\` — per-stock main / large / medium / small net inflow (history).
- \`get_market_fund_flow\` — market-wide main-force flow.
- \`get_dragon_tiger_detail\` — dragon-tiger board: which stocks made it and when.
- \`get_dragon_tiger_seat_detail\` — which seats (institutions / hot-money desks) traded.
- \`get_block_trade_detail\` — block trades (discount/premium, buyer/seller side).
- \`get_margin_account_info\` — margin balance trend (leverage appetite).
- \`get_northbound_individual\` — northbound per-stock holdings change.

For a specific stock, lean on get_individual_fund_flow + get_dragon_tiger_detail / get_dragon_tiger_seat_detail + get_block_trade_detail + get_northbound_individual + get_margin_account_info.
For a market-wide read, lean on get_market_fund_flow + get_margin_account_info + the northbound picture.

[Output]
Read main-force intent — accumulation vs. distribution — corroborated across at least two independent flow sources (don't over-read a single day). List the concrete evidence per source, then a net judgment and key caveats.`;
    },
  },
  {
    name: 'analyze_fund',
    title: 'Analyze fund',
    description:
      'Mutual-fund review: profile + NAV history + category ranking + intraday estimate.',
    tier: 'full',
    args: [
      {
        name: 'fundCode',
        description: '6-digit fund code, e.g. 110022',
        required: true,
      },
    ],
    usesTools: [
      'get_fund_profile',
      'get_fund_nav_history',
      'get_fund_rank_history',
      'get_fund_estimate',
    ],
    render: (a) =>
      `You are a mutual-fund analyst. Assess fund ${a.fundCode}.

[Data — read-only]
1. \`get_fund_profile\` — type, manager, size, strategy.
2. \`get_fund_nav_history\` — historical NAV trend: cumulative return, drawdown, volatility.
3. \`get_fund_rank_history\` — same-category ranking percentile over time (consistency vs. one-off).
4. \`get_fund_estimate\` — today's intraday NAV estimate (note: QDII / non-trading days / niche funds may return null or stale estimates — say so rather than guess).

[Output]
A structured review: (1) what it is (type / manager / size); (2) performance (returns across horizons, worst drawdown, volatility); (3) ranking percentile and whether it's consistent; (4) today's estimate with its caveat; (5) a balanced takeaway on strengths / risks. Public data only, not investment advice.`,
  },
  {
    name: 'diagnose_stock',
    title: 'Diagnose stock (multi-factor)',
    description:
      'Cross-dimension diagnosis of one stock: technicals + capital + chips, scored and combined.',
    tier: 'full',
    args: [
      {
        name: 'symbol',
        description: 'Stock code to diagnose, e.g. sh600519',
        required: true,
      },
    ],
    usesTools: [
      'get_kline_with_indicators',
      'get_kline_signals',
      'get_individual_fund_flow',
      'get_dragon_tiger_stock_stats',
      'get_chip_distribution',
    ],
    render: (a) =>
      `You are a multi-factor stock diagnostician. Diagnose ${a.symbol} across technicals, capital and chips.

[Data — read-only]
- Technicals: \`get_kline_with_indicators\` (trend / momentum) + \`get_kline_signals\` (crosses / breakouts).
- Capital: \`get_individual_fund_flow\` (main-force in/out) + \`get_dragon_tiger_stock_stats\` (dragon-tiger frequency / stats).
- Chips: \`get_chip_distribution\` (profit ratio, 90/70 cost range, concentration).

[Output]
Score each dimension (technical / capital / chips) as bullish / neutral / bearish with the evidence, then a combined read and the key risks. Be explicit where dimensions disagree. Public-data technical analysis, not investment advice.`,
  },
];
