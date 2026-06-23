/**
 * 生成 llms.txt / llms-full.txt —— 给 AI / LLM 工具「一次性读全」stock-sdk 的
 * 全部方法、参数与数据结构。
 *
 * 单一事实源：
 * - 命名空间方法 + 参数 → src/spec/methods.ts（CLI / MCP / Playground 同源派生）
 * - 纯计算 subpath 导出 → 各 src/<sub>/index.ts
 * - 返回数据结构 → src/types/*.ts + src/{indicators,signals,symbols}/types.ts
 *
 * 运行：node --experimental-strip-types ./scripts/generate-llms.ts
 * 产物：website/public/llms.txt、website/public/llms-full.txt（随文档站发布到站点根）
 *
 * 用 strip-types 直接 import TS spec（Node 18+ 的 --experimental-strip-types；
 * methods.ts 是纯数据 + `import type`，可安全 strip 加载）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METHOD_SPECS, type MethodSpec, type ParamSpec } from '../src/spec/methods.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const r = (p: string) => resolve(root, p);

const pkg = JSON.parse(readFileSync(r('package.json'), 'utf8')) as { version: string };
const SITE = 'https://stock-sdk.linkdiary.cn';

// ---------- 工具 ----------
function read(rel: string): string {
  return readFileSync(r(rel), 'utf8');
}

/** 从一个 index.ts 抽取对外导出的标识符名（覆盖 export {a,b}/function/const/class/type 各形态）。 */
function extractExports(rel: string): string[] {
  // 先剥离行 / 块注释：否则 export { ... } 块内的注释会混进 part，
  // 使校验失败、对应导出被静默丢弃（也顺带屏蔽注释里出现的假 export）。
  const src = read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const names = new Set<string>();
  // export { a, b as c, type d } from '...'  /  export { ... }
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      // `b as c` 对外导出的是别名 c（as 之后）；无别名时退回本名。
      const parts = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  // export function/const/class/interface/type/enum X
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  return [...names];
}

// ---------- 1. 命名空间方法目录（从 spec 派生） ----------
function sdkSignature(s: MethodSpec): string {
  const path = `sdk.${s.path.join('.')}`;
  const args: string[] = [];
  for (const p of s.positional ?? []) {
    args.push(p.required ? p.name : `${p.name}?`);
  }
  if (s.params && s.params.length > 0) args.push('options?');
  return `${path}(${args.join(', ')})`;
}

function paramType(p: ParamSpec): string {
  if (p.type === 'enum') return p.enum ? p.enum.map((e) => (e === '' ? "''" : e)).join(' | ') : 'enum';
  return p.type;
}

function renderMethod(s: MethodSpec): string {
  const lines: string[] = [];
  const cliOnly = s.mcp === false ? '  _(仅 CLI / SDK，无 MCP 工具)_' : '';
  lines.push(`- **\`${sdkSignature(s)}\`** — ${s.mcpDesc || s.summary}${cliOnly}`);
  for (const p of s.positional ?? []) {
    const req = p.required ? '必填' : '可选';
    const enumStr = p.enum ? ` 取值 ${p.enum.join(' | ')}` : '';
    lines.push(`    - \`${p.name}\` (位置参数, ${req}${enumStr}): ${p.desc ?? ''}`);
  }
  for (const p of s.params ?? []) {
    const key = p.field ?? p.flag;
    const bits = [paramType(p)];
    if (p.required) bits.push('必填');
    if (p.default !== undefined && p.default !== '') bits.push(`默认 ${p.default}`);
    lines.push(`    - \`options.${key}\` (${bits.join(', ')}): ${p.mcpDesc || p.desc}`);
  }
  return lines.join('\n');
}

function renderMethodCatalog(): { text: string; count: number } {
  // 按 path[0] 分组，保持 spec 中首次出现顺序
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
    // 顶层方法（如 search）单独标注
    const title = specs.length === 1 && specs[0].path.length === 1 ? `\`sdk.${ns}\`（顶层方法）` : `\`sdk.${ns}\``;
    blocks.push(`### ${title}\n\n${specs.map(renderMethod).join('\n')}`);
  }
  return { text: blocks.join('\n\n'), count: METHOD_SPECS.length };
}

// ---------- 2. 纯计算 subpath 导出 ----------
const SUBPATHS: { sub: string; index: string; desc: string }[] = [
  { sub: 'indicators', index: 'src/indicators/index.ts', desc: '技术指标纯函数（输入 K 线数组，输出指标值）' },
  { sub: 'signals', index: 'src/signals/index.ts', desc: '信号层（金叉 / 死叉 / 超买 / 超卖等）' },
  { sub: 'symbols', index: 'src/symbols/index.ts', desc: '符号解析（normalizeSymbol 等，不发请求）' },
  { sub: 'screener', index: 'src/screener/index.ts', desc: '声明式选股器 + 本地回测引擎' },
  { sub: 'cache', index: 'src/cache/index.ts', desc: '缓存层（MemoryCache / cacheThrough 等）' },
  { sub: 'errors', index: 'src/errors/index.ts', desc: '统一错误体系（SdkError 及子类、错误码工具）' },
];

const SDK_ERROR_CODES =
  'NETWORK_ERROR · TIMEOUT · ABORTED · HTTP_ERROR · RATE_LIMITED · CIRCUIT_OPEN · ' +
  'UPSTREAM_EMPTY · UPSTREAM_ERROR · PARSE_ERROR · INVALID_SYMBOL · INVALID_ARGUMENT · NOT_FOUND';

function renderSubpaths(): string {
  const blocks: string[] = [];
  for (const { sub, index, desc } of SUBPATHS) {
    const names = existsSync(r(index)) ? extractExports(index) : [];
    let extra = '';
    if (sub === 'errors') extra = `\n\n  错误码（\`SdkError.code\` / \`SdkErrorCode\`）：${SDK_ERROR_CODES}`;
    blocks.push(
      `### \`stock-sdk/${sub}\`\n\n${desc}\n\n导出：${names.length ? names.map((n) => `\`${n}\``).join(', ') : '(见类型定义)'}${extra}`
    );
  }
  return blocks.join('\n\n');
}

// ---------- 3. 数据结构（TypeScript 类型定义） ----------
const TYPE_FILES: string[] = [
  // 行情 / K 线 / 板块 / 期权期货 / 基金 / 资金流 / 北向 / 龙虎榜 / 大宗 / 两融 / 市场异动 / 公共
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
  // subpath 纯计算的类型
  'src/indicators/types.ts',
  'src/signals/types.ts',
  'src/symbols/types.ts',
];

function renderDataStructures(): string {
  const blocks: string[] = [];
  for (const f of TYPE_FILES) {
    if (!existsSync(r(f))) continue;
    blocks.push(`// ============================================================\n// ${f}\n// ============================================================\n${read(f).trim()}`);
  }
  return '```ts\n' + blocks.join('\n\n') + '\n```';
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
内置 MCP server。本文件分三部分：命名空间方法清单、纯计算 subpath 导出、数据结构类型定义。

## 用法

\`\`\`ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK(/* options?: RequestClientOptions（timeout / retry / rateLimit /
  circuitBreaker / providerPolicies / fetchImpl / signal 等，详见下方类型定义） */);

// 命名空间方法：sdk.<namespace>.<method>(...)
const quotes = await sdk.quotes.cn(['600519']);        // A 股实时行情
const kline  = await sdk.kline.cn('600519', { period: 'weekly', adjust: 'hfq' });

// 顶层方法
const hits = await sdk.search('茅台');

// 纯计算 subpath（无需实例化、不发请求）
import { calcMACD } from 'stock-sdk/indicators';
import { normalizeSymbol } from 'stock-sdk/symbols';
\`\`\`

符号入参：\`string\` 一等公民，\`'600519'\` / \`'sh600519'\` / \`'00700'\` 均可（由
\`normalizeSymbol\` 统一归一）。错误：对外只抛 \`SdkError\`，带统一 \`code\`（见 errors 部分）。
时间无效值为 \`null\`（非 NaN）。

---

## 一、命名空间方法（共 ${count} 个）

> 形如 \`sdk.kline.cn(symbol, options?)\`；位置参数与 \`options.*\` 字段如下。

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
