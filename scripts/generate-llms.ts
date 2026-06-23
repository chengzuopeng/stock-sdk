/**
 * 生成 llms.txt / llms-full.txt —— 给 AI / LLM 工具「一次性读全」stock-sdk 的
 * 全部方法、参数与数据结构。
 *
 * 单一事实源：
 * - 命名空间方法 + 参数 → src/spec/methods.ts（CLI / MCP / Playground 同源派生）
 * - 纯计算 subpath 导出 → 各 src/<sub>/index.ts
 * - 返回数据结构 → src/types/*.ts + src/{indicators,signals,symbols,screener}/types.ts
 *
 * 运行：pnpm gen:llms
 * 产物：website/public/llms.txt、website/public/llms-full.txt（随文档站发布到站点根）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  METHOD_SPECS,
  PERIOD_INDICATORS,
  BOOL_INDICATORS,
  type MethodSpec,
  type ParamSpec,
} from '../src/spec/methods.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const r = (p: string) => resolve(root, p);

const pkg = JSON.parse(readFileSync(r('package.json'), 'utf8')) as { version: string };
const SITE = 'https://stock-sdk.linkdiary.cn';

const INDICATOR_FLAGS = new Set<string>([...PERIOD_INDICATORS, ...BOOL_INDICATORS]);

const CODES_PARAM_DESC =
  '代码数组（string[]），如 [\'600519\', \'sh000001\']；单代码可写 [\'600519\']';

// ---------- 工具 ----------
function read(rel: string): string {
  return readFileSync(r(rel), 'utf8');
}

/** 从一个 index.ts 抽取对外导出的标识符名（覆盖 export {a,b}/function/const/class/type 各形态）。 */
function extractExports(rel: string): string[] {
  const src = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const names = new Set<string>();
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const parts = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  for (const m of src.matchAll(/export\s+((?:async\s+)?(?:function|const|class|interface|type|enum))\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[2]);
  }
  return [...names];
}

function hasSdkOptions(s: MethodSpec): boolean {
  if (s.argShape === 'codes+options' || s.argShape === 'options' || s.argShape === 'symbol+options') {
    return true;
  }
  return (s.params?.some((p) => p.mcp !== false) ?? false) && s.argShape === 'positional';
}

// ---------- 1. 命名空间方法目录（从 spec 派生） ----------
function sdkSignature(s: MethodSpec): string {
  const path = `sdk.${s.path.join('.')}`;
  const args: string[] = [];

  switch (s.argShape) {
    case 'codes[]':
      args.push('codes');
      break;
    case 'codes+options':
      args.push('codes', 'options?');
      break;
    case 'options':
      if (s.params?.length) args.push('options?');
      break;
    case 'none':
      break;
    case 'positional':
    case 'symbol+options':
      for (const p of s.positional ?? []) {
        args.push(p.required ? p.name : `${p.name}?`);
      }
      if (hasSdkOptions(s)) args.push('options?');
      break;
  }

  return `${path}(${args.join(', ')})`;
}

function paramType(p: ParamSpec): string {
  if (p.type === 'enum') return p.enum ? p.enum.map((e) => (e === '' ? "''" : e)).join(' | ') : 'enum';
  return p.type;
}

function renderParamLine(prefix: string, p: ParamSpec, label: string): string {
  const bits = [paramType(p)];
  if (p.required) bits.push('必填');
  if (p.default !== undefined && p.default !== '') bits.push(`默认 ${p.default}`);
  return `    - \`${prefix}\` (${bits.join(', ')}, ${label}): ${p.mcpDesc || p.desc}`;
}

function sdkVisibleParams(s: MethodSpec): ParamSpec[] {
  const params = s.params ?? [];
  if (s.mcpCustom) {
    return params.filter((p) => p.mcp !== false && !INDICATOR_FLAGS.has(p.flag));
  }
  return params.filter((p) => p.mcp !== false);
}

function cliOnlyParams(s: MethodSpec): ParamSpec[] {
  const params = s.params ?? [];
  if (s.mcpCustom) {
    return params.filter((p) => p.mcp === false || INDICATOR_FLAGS.has(p.flag));
  }
  return params.filter((p) => p.mcp === false);
}

function renderMethod(s: MethodSpec): string {
  const lines: string[] = [];
  const cliOnly = s.mcp === false ? '  _(仅 CLI / SDK，无 MCP 工具)_' : '';
  lines.push(`- **\`${sdkSignature(s)}\`** — ${s.mcpDesc || s.summary}${cliOnly}`);

  if (s.argShape === 'codes[]' || s.argShape === 'codes+options') {
    lines.push(`    - \`codes\` (string[], 必填): ${CODES_PARAM_DESC}`);
  }

  for (const p of s.positional ?? []) {
    const req = p.required ? '必填' : '可选';
    const enumStr = p.enum ? ` 取值 ${p.enum.join(' | ')}` : '';
    lines.push(`    - \`${p.name}\` (位置参数, ${req}${enumStr}): ${p.desc ?? ''}`);
  }

  for (const p of sdkVisibleParams(s)) {
    const key = p.field ?? p.flag;
    const paramLabel = s.mcp === false ? 'SDK' : 'SDK / MCP';
    lines.push(renderParamLine(`options.${key}`, p, paramLabel));
  }

  if (s.mcpCustom && s.path.join('.') === 'kline.withIndicators') {
    lines.push(
      '    - `options.indicators` (object, SDK / MCP): 指标配置。键：ma / macd / boll / kdj / rsi / wr / bias / cci / atr / obv / roc / dmi / sar / kc；传 `true` 用默认参数，或传配置对象（如 `{ ma: { periods: [5,10,20] }, macd: { short: 12, long: 26, signal: 9 } }`）'
    );
  }

  const cliParams = cliOnlyParams(s);
  if (cliParams.length > 0) {
    lines.push('    - _(CLI 专属 options，SDK 请用上方的 SDK 字段；期货 `--adjust` 等 SDK 不生效)_');
    for (const p of cliParams) {
      const key = p.field ?? p.flag;
      lines.push(renderParamLine(`--${p.flag} → options.${key}`, p, 'CLI 专属'));
    }
  }

  if (
    (s.path.join('.') === 'northbound.minute' || s.path.join('.') === 'northbound.history') &&
    cliParams.some((p) => p.flag === 'direction')
  ) {
    lines.push('    - _(CLI 亦可用 `--direction north|south` 代替位置参数 `direction`)_');
  }

  return lines.join('\n');
}

function renderMethodCatalog(): { text: string; count: number } {
  const order: string[] = [];
  const groups = new Map<string, MethodSpec[]>();
  for (const s of METHOD_SPECS) {
    const ns = s.path[0];
    if (!groups.has(ns)) {
      groups.set(ns, []);
      order.push(ns);
    }
    groups.get(ns)!.push(s);
  }
  const blocks: string[] = [];
  for (const ns of order) {
    const specs = groups.get(ns)!;
    const title =
      specs.length === 1 && specs[0].path.length === 1 ? `\`sdk.${ns}\`（顶层方法）` : `\`sdk.${ns}\``;
    blocks.push(`### ${title}\n\n${specs.map(renderMethod).join('\n')}`);
  }
  return { text: blocks.join('\n\n'), count: METHOD_SPECS.length };
}

// ---------- 2. 纯计算 subpath 导出 ----------
const SUBPATHS: { sub: string; index?: string; source?: string; desc: string; extra?: string }[] = [
  { sub: 'indicators', index: 'src/indicators/index.ts', desc: '技术指标纯函数（输入 K 线数组，输出指标值）' },
  { sub: 'signals', index: 'src/signals/index.ts', desc: '信号层（金叉 / 死叉 / 超买 / 超卖等）' },
  { sub: 'symbols', index: 'src/symbols/index.ts', desc: '符号解析（normalizeSymbol 等，不发请求）' },
  { sub: 'screener', index: 'src/screener/index.ts', desc: '声明式选股器 + 本地回测引擎' },
  { sub: 'cache', index: 'src/cache/index.ts', desc: '缓存层（MemoryCache / cacheThrough 等）' },
  { sub: 'errors', index: 'src/errors/index.ts', desc: '统一错误体系（SdkError 及子类、错误码工具）' },
  {
    sub: 'mcp',
    source: 'src/mcp/server.ts',
    desc: 'MCP server 可编程入口（`startMcpServer` / `dispatchMessage` 等；CLI 用 `stock-sdk mcp` 启动 stdio）',
    extra:
      '导出：`startMcpServer`, `dispatchMessage`, `McpServerOptions`, `DispatchContext`（详见 `stock-sdk/mcp` 类型定义）',
  },
];

const SDK_ERROR_CODES =
  'NETWORK_ERROR · TIMEOUT · ABORTED · HTTP_ERROR · RATE_LIMITED · CIRCUIT_OPEN · ' +
  'UPSTREAM_EMPTY · UPSTREAM_ERROR · PARSE_ERROR · INVALID_SYMBOL · INVALID_ARGUMENT · NOT_FOUND';

function renderSubpaths(): string {
  const blocks: string[] = [];
  for (const { sub, index, source, desc, extra } of SUBPATHS) {
    let body = desc;
    if (extra) {
      body += `\n\n${extra}`;
    } else if (index && existsSync(r(index))) {
      const names = extractExports(index);
      body += `\n\n导出：${names.length ? names.map((n) => `\`${n}\``).join(', ') : '(见类型定义)'}`;
    }
    if (sub === 'errors') {
      body += `\n\n  错误码（\`SdkError.code\` / \`SdkErrorCode\`）：${SDK_ERROR_CODES}`;
    }
    if (sub === 'signals') {
      body +=
        '\n\n示例：`const signals = calcSignals(klineWithIndicators, { ma: { fast: 5, slow: 20 }, rsi: {} })`';
    }
    if (sub === 'screener') {
      body +=
        '\n\n示例：`screen(allQuotes).where(q => q.pe < 20).sortBy(q => q.amount).top(20)`；' +
        '`backtest({ klines, strategy: (bar) => \'hold\' })`';
    }
    blocks.push(`### \`stock-sdk/${sub}\`\n\n${body}`);
  }
  return blocks.join('\n\n');
}

// ---------- 3. 数据结构（TypeScript 类型定义） ----------
const TYPE_FILES: string[] = [
  'src/types/common.ts',
  'src/types/quotes.ts',
  'src/types/kline.ts',
  'src/types/board.ts',
  'src/types/options.ts',
  'src/types/futures.ts',
  'src/types/fund.ts',
  'src/types/fundFlow.ts',
  'src/types/northbound.ts',
  'src/types/dragonTiger.ts',
  'src/types/blockTrade.ts',
  'src/types/margin.ts',
  'src/types/marketEvent.ts',
  'src/core/request.ts',
  'src/indicators/types.ts',
  'src/signals/types.ts',
  'src/symbols/types.ts',
  'src/screener/screener.ts',
  'src/screener/backtest.ts',
];

function renderDataStructures(): string {
  const blocks: string[] = [];
  for (const f of TYPE_FILES) {
    if (!existsSync(r(f))) continue;
    blocks.push(
      `// ============================================================\n// ${f}\n// ============================================================\n${read(f).trim()}`
    );
  }
  return '```ts\n' + blocks.join('\n\n') + '\n```';
}

function renderOverview(): string {
  return `## 速览（非 API 清单）

### 安装与模块格式

- 最新版：\`npm i stock-sdk\`（当前 v${pkg.version}）
- v1 旧版（已封存）：\`npm i stock-sdk@legacy\`
- **ESM + CommonJS** 双格式；主包 \`import { StockSDK } from 'stock-sdk'\`
- 纯计算 subpath：\`stock-sdk/{indicators,signals,symbols,screener,cache,errors,mcp}\`（tree-shake 友好，不拖入全部 provider）
- v1 → v2 **破坏性变更**，无兼容别名：${SITE}/guide/migration-v1-to-v2

### 命令行（CLI）

\`\`\`bash
npx stock-sdk quote 600519 00700 AAPL      # 按代码自动识别市场
npx stock-sdk kline 600519 --period weekly --limit 30
npx stock-sdk indicators 600519 --ma 5,10,20 --macd
npx stock-sdk search 茅台
npx stock-sdk quotes cn sh600519 sz000001   # 任意命名空间方法直达
\`\`\`

默认 JSON；可加 \`--format table|csv\`、\`--pretty\`、\`--limit N\`（输出层裁剪，不影响 SDK 返回值）。

### MCP（AI 工具集成）

\`\`\`bash
npx stock-sdk mcp
\`\`\`

Cursor / Claude Desktop 等配置 \`mcpServers\`：\`{ "command": "npx", "args": ["-y", "stock-sdk", "mcp"] }\`。
环境变量 \`STOCK_SDK_MCP_TOOLS=core|full|<逗号分隔工具名>\` 控制工具集（默认 \`core\`）。
**MCP tools/call 大结果会自动裁剪**（数组 >200 条、序列化 >80KB）；**SDK 直连不受此限**。详见 ${SITE}/mcp/

### 行情类型说明

- \`quotes.cn()\` → \`FullQuote[]\`；\`quotes.cnSimple()\` → \`SimpleQuote[]\`（简要字段）
- \`Quote = FullQuote | HKQuote | USQuote | FundQuote\`（**不含** \`SimpleQuote\`，各市场方法返回对应类型）
- 符号：\`'600519'\` / \`'sh600519'\` / \`'600519.SH'\` / \`'00700'\` / \`'AAPL'\` / \`'105.AAPL'\` 等均可（\`normalizeSymbol\` 容错）

### 市场能力矩阵（摘要）

| 能力 | A 股 | 港股 | 美股 | 基金 | 期货 | 期权 |
|------|:----:|:----:|:----:|:----:|:----:|:----:|
| 实时行情 | ✅ | ✅ | ✅ | ✅ | ✅ 全球 | ✅ |
| 历史 K 线 | ✅ | ✅ | ✅ | ⚠️ ETF/LOF | ✅ | ✅ |
| 分钟 K / 分时 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ⚠️ ETF |
| 板块 / 资金流 / 北向 / 龙虎榜等 | ✅ 为主 | 部分 | 部分 | 扩展 | 库存等 | 多品类 |

完整矩阵见 README / ${SITE}/api/

### 数据延迟与请求治理

- 数据来自腾讯 / 东财等**公开接口**，非交易所实时撮合，通常有**数十秒到数分钟延迟**，不适合高频交易。
- \`new StockSDK({ retry, providerPolicies, fetchImpl, signal, hooks, ... })\` — \`RequestClientOptions\` 定义见第三节 \`src/core/request.ts\`。

---`;
}

// ---------- 组装 ----------
const { text: methodCatalog, count } = renderMethodCatalog();

const full = `# stock-sdk · 完整 API 参考（为 AI / LLM 工具生成）

> 本文件由 \`scripts/generate-llms.ts\` 从 \`src/spec/methods.ts\`（CLI / MCP / Playground 的
> 单一事实源）与 \`src/types\` 自动生成，目的是让 AI 工具**一次性读取** stock-sdk 的全部
> 命名空间方法、参数与返回数据结构。**请勿手改本文件**——改 spec / types 后重新生成。
>
> 版本：v${pkg.version} · 文档站：${SITE} · npm: \`npm i stock-sdk\`

## 这是什么

stock-sdk 是一个**零依赖**的股票行情 SDK，浏览器 + Node.js 18+ 双端可用，覆盖
A 股 / 港股 / 美股 / 公募基金 / 期货 / 期权。API 采用**命名空间**模型，并自带 CLI 与
内置 MCP server。本文件分四部分：速览、命名空间方法清单、纯计算 subpath 导出、数据结构类型定义。

## 用法

\`\`\`ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK(/* options?: RequestClientOptions — 见第三节 src/core/request.ts */);

// 命名空间方法：sdk.<namespace>.<method>(...)
const quotes = await sdk.quotes.cn(['600519']);        // A 股实时行情（codes 为 string[]）
const kline  = await sdk.kline.cn('600519', { period: 'weekly', adjust: 'hfq' });
const withInd = await sdk.kline.withIndicators('600519', {
  indicators: { ma: { periods: [5, 10, 20] }, macd: {} },
});

// 顶层方法
const hits = await sdk.search('茅台');

// 纯计算 subpath（无需实例化、不发请求）
import { calcMACD } from 'stock-sdk/indicators';
import { normalizeSymbol } from 'stock-sdk/symbols';
import { calcSignals } from 'stock-sdk/signals';
import { screen, backtest } from 'stock-sdk/screener';
\`\`\`

符号入参：\`string\` 一等公民，\`'600519'\` / \`'sh600519'\` / \`'00700'\` 均可（由
\`normalizeSymbol\` 统一归一）。错误：对外只抛 \`SdkError\`，带统一 \`code\`（见 errors 部分）。
时间无效值为 \`null\`（非 NaN）。

${renderOverview()}

## 一、命名空间方法（共 ${count} 个）

> 形如 \`sdk.quotes.cn(codes)\` / \`sdk.kline.cn(symbol, options?)\`；\`codes[]\` 形态的方法第一个参数为 **string[]**。
> 标注 **CLI 专属** 的参数/flag 不应传入 SDK options（除非文档明确说明 SDK 消费）。

${methodCatalog}

---

## 二、纯计算 subpath 导出

> 这些是纯逻辑、不发请求，可从对应子路径按需引入（对 tree-shaking 友好）。

${renderSubpaths()}

---

## 三、数据结构（TypeScript 类型定义）

> 以下为各方法返回值与选项的权威 TS 定义（源文件原样拼接）。安装 \`stock-sdk\` 后，
> 编辑器 / IDE 内 AI 也能直接通过随包发布的 \`.d.ts\` 读到同样的类型。

${renderDataStructures()}

---

_本文件自动生成。完整文档见 ${SITE} ；运行时工具发现可用内置 MCP（\`stock-sdk mcp\`，\`tools/list\`）。_
`;

const index = `# stock-sdk

> 零依赖股票行情 SDK（A 股 / 港股 / 美股 / 基金 / 期货 / 期权），浏览器 + Node.js 双端；
> 命名空间 API，自带 CLI 与内置 MCP server。版本 v${pkg.version}。

给 AI / LLM 工具的**完整 API**（全部方法 / 参数 / 数据结构，一次性读取）：

- ${SITE}/llms-full.txt

## 链接

- 官网文档：${SITE}
- v1 → v2 迁移指南：${SITE}/guide/migration-v1-to-v2
- CLI：${SITE}/cli/ ｜ MCP：${SITE}/mcp/ ｜ API 总览：${SITE}/api/
- npm：https://www.npmjs.com/package/stock-sdk
- GitHub：https://github.com/chengzuopeng/stock-sdk
`;

const outDir = r('website/public');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(r('website/public/llms-full.txt'), full, 'utf8');
writeFileSync(r('website/public/llms.txt'), index, 'utf8');

console.log(
  `Generated website/public/llms.txt + llms-full.txt — ${count} 命名空间方法, ` +
    `${SUBPATHS.length} subpath, ${TYPE_FILES.filter((f) => existsSync(r(f))).length} 类型文件`
);
