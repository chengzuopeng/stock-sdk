# stock-sdk v2.0.0 文档站方案

> 状态：草案 v0.2 · 分支：`feature-v2` · 关联：[`v2-td.md`](v2-td.md)、[`cli-mcp.md`](cli-mcp.md)
> **路线调整**：先在**新目录 `site-v2/`** 中独立建设 v2 文档站（风格与 v1 差异化），完成后再做 v1 路由。

---

## 目录

- [1. 路线与总体策略](#1-路线与总体策略)
- [2. 工程结构（site-v2 独立目录）](#2-工程结构site-v2-独立目录)
- [3. 运行与构建命令](#3-运行与构建命令)
- [4. 风格与样式差异化（v2 vs v1）](#4-风格与样式差异化v2-vs-v1)
- [5. v2 文档站页面结构](#5-v2-文档站页面结构)
- [6. API 方法介绍（按命名空间）](#6-api-方法介绍按命名空间)
- [7. 内容来源与改造](#7-内容来源与改造)
- [8. 阶段一落地步骤（建 v2 站）](#8-阶段一落地步骤建-v2-站)
- [9. 阶段二预告（v1 路由）](#9-阶段二预告v1-路由)
- [10. 部署](#10-部署)
- [11. 验证 checklist](#11-验证-checklist)
- [12. 风险与待确认](#12-风险与待确认)

---

## 1. 路线与总体策略

**两阶段、先 v2 后 v1：**

1. **阶段一（当前）**：新建 `site-v2/` 目录，从头建设 v2 文档站，**风格与样式和 v1 有意做出差异**。先让 v2 站独立跑起来、作为主站。
2. **阶段二（后续）**：v1 路由——把现有 `website/`（天然就是 v1 内容/风格）挂到 `/v1/`，与 v2 主站合并部署。

**为什么新建 `site-v2/` 而不在 `website/` 原地改：**

| 收益 | 说明 |
|---|---|
| v1 留存零成本 | `website/` 一字不动，本身就是 v1 文档，阶段二直接拿来挂 `/v1/`，无需 git tag 重建 |
| 风格自由 | v2 站可重做主题/布局/Hero，不受 v1 现有主题约束 |
| 互不干扰、可并行 | v2 建设期间，v1 文档（线上）不受影响 |
| 路由简单 | v2 = 根 `/`，v1 = `/v1/`，两个独立 VitePress 产物合并即可 |

> 这相当于把 `v2-td.md` §18 的「方案 A」落地为「**两个并存的 VitePress 站点目录**」——比「tag 重建 v1」更直接。`v2-td.md §18` 的旧描述（tag 冻结重建）以本文档为准。

---

## 2. 工程结构（site-v2 独立目录）

```text
stock-sdk/
├── website/                 # v1 文档站(现状保留,阶段二挂 /v1/)
│   └── .vitepress/ ...
├── site-v2/                 # 【新增】v2 文档站(本次建设)
│   ├── .vitepress/
│   │   ├── config.ts        # v2 站配置(base / locales / nav / sidebar)
│   │   └── theme/           # v2 主题(差异化样式,见 §4)
│   │       ├── index.ts
│   │       ├── custom.css    # v2 配色/排版
│   │       ├── Layout.vue    # v2 布局(Hero / 版本切换器槽位)
│   │       └── components/   # HeroMeta / LiveTicker / Playground / ChatBot 等(可从 website 迁移并改造)
│   ├── index.md             # v2 首页
│   ├── guide/               # 中文指南
│   ├── api/                 # 中文 API(按命名空间组织,见 §5/§6)
│   ├── cli/                 # 【新增】CLI 文档
│   ├── mcp/                 # MCP 文档
│   ├── playground/          # Playground 入口
│   ├── changelog.md
│   ├── en/                  # 英文(guide/api/cli/mcp/playground/changelog)
│   └── public/              # 静态资源(logo 等)
├── scripts/                 # docs:meta / docs:check(需适配 site-v2 路径,见 §3)
└── package.json             # 新增 v2 站脚本(见 §3)
```

- `site-v2/` 是一个**完整、独立的 VitePress 项目**,与 `website/` 平级、互不引用。
- 共享资产(logo、部分组件)可从 `website/` 复制到 `site-v2/` 后改造,不做跨目录 import。

---

## 3. 运行与构建命令

`package.json` `scripts` **新增 v2 站命令**(现有 `website` 命令暂时保留,阶段二再划归 v1):

```jsonc
{
  "scripts": {
    // —— v2 站(site-v2,本次新增)——
    "dev:v2":     "vitepress dev site-v2",
    "preview:v2": "vitepress preview site-v2",
    "build:v2":   "yarn docs:meta && DOCS_BASE=/ vitepress build site-v2",        // 自定义域名(根)
    "build:v2:pages": "yarn docs:meta && DOCS_BASE=/stock-sdk/ vitepress build site-v2", // github.io

    // —— 现有(暂留,阶段二归 v1)——
    "dev":        "vitepress dev website",
    "build:docs": "yarn docs:meta && DOCS_BASE=/ vitepress build website",
    "build:pages":"yarn docs:meta && DOCS_BASE=/stock-sdk/ vitepress build website"
  }
}
```

常用命令：

| 目的 | 命令 |
|---|---|
| 本地开发 v2 站 | `yarn dev:v2` |
| 本地预览 v2 产物 | `yarn preview:v2` |
| 构建 v2（自定义域名 base=/） | `yarn build:v2` |
| 构建 v2（github.io base=/stock-sdk/） | `yarn build:v2:pages` |
| 文档元数据 / 一致性校验 | `yarn docs:meta` / `yarn docs:check` |

> **脚本适配**：`generate-doc-meta.js` / `check-doc-consistency.js` 目前面向 `website/`，需让其支持 `site-v2/`（加参数或环境变量指定目标目录），否则 v2 站的元数据与校验跑不起来。

---

## 4. 风格与样式差异化（v2 vs v1）

**v1 现状**（`website/.vitepress`）：financial-terminal 风格 Hero、主题色偏红（`theme-color: #f87171`）、字体 Sora（标题）+ JetBrains Mono（数字/代码），首页有 LiveTicker、悬浮 AI 问答助手。

**v2 差异化方向**（保持 `stock-sdk` 品牌一致，但视觉换代）：

| 维度 | 差异化建议 |
|---|---|
| 主题色 | 换主色调（如冷色系青/蓝绿，区别于 v1 的红），暗色模式同步调 |
| Hero | 重做 Hero：突出 v2 卖点——命名空间 API、`stock-sdk mcp`、CLI、选股/回测、零依赖；可用代码动效或终端风格 demo |
| 排版 | 字体/字号/间距换一套观感（如标题字重、卡片圆角、分隔风格） |
| 组件 | Playground / HeroMeta 重新设计视觉；可新增「v2 新特性」展示区 |
| 布局 | 首页信息架构按 v2 能力重组（行情/分析/AI/工具四区） |
| 标识 | nav / footer 标注「v2」,与 v1 区分；版本切换器入口预留（阶段二接 `/v1/`） |

> 具体配色与组件实现在建站时定；本节给方向，确保「与 v1 有明显差异」这一要求落到设计动作上。

---

## 5. v2 文档站页面结构

**完整页面树（中英双语，`en/` 镜像）：**

```text
site-v2/
├── index.md                         # 首页(v2 Hero + 卖点 + 快速上手)
├── guide/                           # 指南
│   ├── introduction.md              #   介绍(v2 定位 + 与 v1 差异概览)
│   ├── installation.md              #   安装(含 subpath 导入 / CLI / MCP)
│   ├── getting-started.md           #   快速开始(命名空间 API 10 行 demo)
│   ├── symbols.md                   # 【新增】符号与代码规则(string|SymbolRef / normalizeSymbol / 已知歧义)
│   ├── migration-v1-to-v2.md        # 【新增】v1→v2 迁移指南(方法映射 + before/after + 契约变化)
│   ├── browser.md                   #   浏览器使用
│   ├── request-governance.md        #   请求治理(fetchImpl / signal / hooks / providerPolicies)
│   ├── retry.md                     #   错误处理与重试(SdkError + 错误码)
│   ├── indicators.md                #   技术指标 + 信号层
│   ├── dividend-adjustment.md       #   复权说明
│   └── futures-options.md           #   期货与期权
├── api/                             # API(按命名空间组织,见 §6)
│   ├── index.md                     #   API 总览(命名空间地图)
│   ├── quotes.md / codes.md / batch.md
│   ├── kline.md
│   ├── board.md                     #   board.industry / board.concept
│   ├── options.md                   #   options.{index,etf,commodity,cffex}
│   ├── futures.md
│   ├── fund-flow.md / northbound.md / market-event.md / dragon-tiger.md
│   ├── block-trade.md / margin.md / fund.md
│   ├── calendar.md / reference.md / search.md
│   ├── indicators.md                #   指标计算函数 calc*
│   └── signals.md                   # 【新增】信号层 calcSignals
├── cli/                             # 【新增】CLI
│   └── index.md                     #   命令总览 + 用法 + 输出格式
├── mcp/                             # MCP / AI
│   ├── index.md                     #   概述(stock-sdk mcp 自实现协议)
│   ├── installation.md              #   各 AI 客户端接入配置
│   ├── tools.md                     #   MCP 工具表
│   └── skills.md                    #   AI Skills
├── playground/
│   └── index.md                     #   交互演示(方法改命名空间调用)
└── changelog.md                     #   含 2.0.0 破坏性变更
```

**导航（nav）**：指南 / API / CLI / MCP·AI / Playground / Demo / 更新日志 +（阶段二）版本切换器。
**侧边栏（sidebar）**：API 按命名空间分组排列，与 `sdk.<ns>` 一一对应。

---

## 6. API 方法介绍（按命名空间）

> v2 门面命名空间化（详见 `v2-td.md` §7.1）。下表即「API 页 ↔ 命名空间 ↔ 方法」的映射，文档站 API 章节按此组织。

| API 页 | 命名空间 | 方法（v2） | 说明 |
|---|---|---|---|
| quotes | `sdk.quotes` | `cn` / `cnSimple` / `hk` / `us` / `fund` / `fundFlow` / `largeOrder` / `timeline` | A股全量/简要、港股、美股、基金行情、资金流(简版)、盘口大单、当日分时 |
| codes | `sdk.codes` | `cn` / `us` / `hk` / `fund` | 各市场代码列表 |
| batch | `sdk.batch` | `cn` / `hk` / `us` / `byCodes` / `raw` | 全市场批量行情、按代码批量、原始批量 |
| kline | `sdk.kline` | `cn` / `cnMinute` / `hk` / `hkMinute` / `us` / `usMinute` / `withIndicators` | A/HK/US 历史 K 线、分钟 K 线、带指标 K 线 |
| board | `sdk.board.industry` / `sdk.board.concept` | `list` / `spot` / `constituents` / `kline` / `minuteKline` | 行业 / 概念板块 |
| options | `sdk.options.{index,etf,commodity,cffex}` + `sdk.options.lhb` | index: `spot`/`kline`；etf: `months`/`expireDay`/`minute`/`dailyKline`/`fiveDayMinute`；commodity: `spot`/`kline`；cffex: `quotes`；`lhb` | 股指/ETF/商品/中金所期权 + 期权龙虎榜 |
| futures | `sdk.futures` | `kline` / `globalSpot` / `globalKline` / `inventorySymbols` / `inventory` / `comexInventory` | 国内/全球期货 K 线、库存 |
| fund-flow | `sdk.fundFlow` | `individual` / `market` / `rank` / `sectorRank` / `sectorHistory` | 资金流向(深度) |
| northbound | `sdk.northbound` | `minute` / `summary` / `holdingRank` / `history` / `individual` | 沪深港通 / 北向资金 |
| market-event | `sdk.marketEvent` | `ztPool` / `stockChanges` / `boardChanges` | 涨停池 / 盘口异动 / 板块异动 |
| dragon-tiger | `sdk.dragonTiger` | `detail` / `stockStats` / `institution` / `branchRank` / `seatDetail` | 龙虎榜 |
| block-trade | `sdk.blockTrade` | `marketStat` / `detail` / `dailyStat` | 大宗交易 |
| margin | `sdk.margin` | `accountInfo` / `targetList` | 融资融券 |
| fund | `sdk.fund` | `dividendList` / `navHistory` / `estimate` / `rankHistory` | 公募基金扩展 |
| calendar | `sdk.calendar` | `isTradingDay` / `nextTradingDay` / `prevTradingDay` / `marketStatus` | 交易日历 / 市场状态 |
| reference | `sdk.reference` | `dividendDetail` / `tradingCalendar` | 分红明细 / A股交易日历 |
| search | `sdk.search(keyword)` | （顶层快捷方法） | 股票搜索 |
| indicators | `stock-sdk/indicators` | `calcMA/MACD/BOLL/KDJ/RSI/WR/BIAS/CCI/ATR/OBV/ROC/DMI/SAR/KC` / `addIndicators` | 14 个指标计算函数（subpath 导出） |
| signals | `stock-sdk/signals` | `calcSignals` | 金叉/死叉/超买/超卖等信号（subpath 导出） |
| —（指南页） | `stock-sdk/symbols` | `normalizeSymbol` / `SymbolRef` | 符号解析（见 `guide/symbols`） |
| cli | `stock-sdk`（bin） | `quote` / `kline` / `search` / `mcp` …（示意） | 命令行（见 `cli/`） |
| mcp | `stock-sdk mcp` | 工具表从只读方法派生 | MCP server（见 `mcp/tools`） |

> 每个 API 页内：方法签名、参数、返回结构（v2 新契约：`Quote` 联合 / 单位最小单位 / 无 `raw` / `timestamp:number\|null`）、示例（命名空间调用）。具体方法参数以实现与 `src/sdk/namespaces/*` 为准。

---

## 7. 内容来源与改造

- **来源**：从 `website/` 的对应中英页迁移文案到 `site-v2/`，按 §5/§6 的**命名空间结构重排**（v1 是按数据类型零散的 37 页，v2 按命名空间归并）。
- **示例改写**：所有调用从 `sdk.getXxx()` → `sdk.<ns>.<method>()`；返回结构示例按新契约更新。
- **Playground**：把 `website` 的 16 个方法分类组件迁到 `site-v2`，`code`/`run` 改命名空间调用（中英共享同一套组件，改一处生效）。
- **新增页**：`guide/symbols`、`guide/migration-v1-to-v2`、`cli/`、`api/signals`、MCP 工具表更新。
- **首页**：v2 Hero + 卖点（零依赖、命名空间 API、CLI、MCP、选股/回测、subpath）。

---

## 8. 阶段一落地步骤（建 v2 站）

1. **建目录**：`site-v2/` + `.vitepress/config.ts`（base / locales(zh+en) / nav / sidebar）+ `theme/`（差异化样式，§4）。
2. **加脚本**：`package.json` 增 `dev:v2` / `build:v2` / `build:v2:pages` / `preview:v2`（§3）。
3. **搭骨架**：先把 §5 的页面树建出来（空页/占位），跑通 `yarn dev:v2`。
4. **迁内容**：从 `website/` 迁文案并按命名空间重排（§6/§7），改写所有调用示例。
5. **新增页**：符号规则、迁移指南、CLI、signals、MCP 工具表。
6. **Playground**：迁移组件 + 改命名空间调用。
7. **差异化样式**：落地 §4 的主题/Hero/组件。
8. **校验**：适配并跑 `yarn docs:meta` / `docs:check` / `build:v2`。

> 内容里的方法名以 v2 命名空间为准——本阶段须与 `v2-td.md` 阶段 3（命名空间化）同节奏，避免改两遍。

---

## 9. 阶段二预告（v1 路由）

- `website/`（v1）保持现状，构建为 `/v1/`（自定义域名）或 `/stock-sdk/v1/`（github.io）。
- `docs.yml` 改为「构建 v2(`site-v2`→根) + 构建 v1(`website`→`/v1/`) → 合并 `dist` 与 `dist/v1`」。
- v2 站 nav 接入**版本切换器**（→ `/v1/`）；v1 站顶部加「旧版」banner + `noindex`（详见 `v2-td.md` §18 的版本切换器/banner/SEO 要点）。
- 本阶段在 v2 站稳定后单独排期，届时补「v1 路由」专项步骤。

---

## 10. 部署

- **阶段一**：`docs.yml` 暂改为构建 `site-v2` 作为主站（`build:v2:pages`），先让 v2 上线（或先发预览环境验证）。
- **阶段二**：升级为 v2(根) + v1(`/v1/`) 双构建合并（§9）。
- 自定义域名 / base 取值取决于 `linkdiary.cn` 部署形态（见 §12 待确认）。

---

## 11. 验证 checklist

```text
□ yarn dev:v2 本地跑通,site-v2 中英双语可访问
□ §5 页面树齐全(含 symbols / migration / cli / signals 新增页),无死链
□ §6 API 页按命名空间组织,方法清单与 v2-td.md §7.1 一致
□ 全站示例无残留 sdk.getXxx() 旧调用(grep 扫描)
□ Playground 16 分类改命名空间且可运行(中英)
□ 风格与 v1 有明显差异(主题色/Hero/布局)
□ yarn build:v2 / build:v2:pages 产物正常,base 正确无 404
□ docs:meta / docs:check 适配 site-v2 并通过
□ 首页 / changelog / 迁移指南 已更新
```

---

## 12. 风险与待确认

| 项 | 级别 | 说明 / 缓解 |
|---|---|---|
| `docs:meta` / `docs:check` 仅认 `website/` | 中 | 改脚本支持目标目录参数,否则 v2 站元数据/校验跑不起来 |
| 命名空间改造遗漏旧调用 | 中 | `grep -rn "sdk\.\(get\|search\)" site-v2` + `docs:check` 兜底 |
| 内容与命名空间阶段不同步 | 中 | site-v2 内容随 `v2-td.md` 阶段 3 推进,API 名定后再大批迁移 |
| 组件迁移(Playground/Chat/Faro)成本 | 中 | 从 website 复制后改造,注意 Faro source map token、API_WORKER_ORIGIN 等环境变量 |
| v2-td.md §18 与本文档路线不一致 | 低 | 本文档(site-v2 双目录)为准;建议在 §18 加指针指向此文件 |

**待确认：**
1. **`stock-sdk.linkdiary.cn` 部署形态**（GitHub Pages 自定义域名 vs 反代）——决定 v2/v1 的 `base` 取值。
2. **阶段一是否先用 v2 覆盖线上**（v1 暂时下线/留 github.io），还是先发预览环境，等阶段二 v1 路由就绪再一起切。
3. v2 主题色/视觉方向（§4）需定一个基调再开工。

---

> 本文档为 v2 文档站完整方案；页面文案、主题实现、方法参数细节以建站阶段与 `v2-td.md`、`cli-mcp.md` 为准。
