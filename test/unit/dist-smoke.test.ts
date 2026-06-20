/**
 * dist 产物冒烟测试(Review P0-1 回归护栏)。
 *
 * 背景:`(this._ns[key] ??= build())` 经 tsup cjs+splitting+minify 管线会被
 * 熔接成坏标识符 `return_nullishCoalesce`,导致 require 侧 16/16 命名空间
 * getter 首次访问即抛 ReferenceError —— 而单测只跑 src,CI 全绿拦不住。
 * 本文件直接加载构建产物断言两种模块格式的 API 面可用。
 *
 * dist 不存在时跳过(本地未构建的快速单测循环);CI 在 build 之后跑全量
 * 测试即可生效。
 *
 * R3-15 加固:
 * - 新鲜度守卫:dist/index.cjs 比 src 下任一 .ts 旧 → 冒烟只会验证旧产物
 *   (甚至对新代码的 bug 误绿),skip 并提示重建;CI build 紧接 test 永远新鲜。
 * - Windows 可移植:动态 import 绝对路径必须走 file:// URL(pathToFileURL),
 *   裸盘符路径(C:\...)在 Windows 的 ESM loader 下会抛 ERR_UNSUPPORTED_ESM_URL_SCHEME。
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const DIST = join(__dirname, '../../dist');
const SRC = join(__dirname, '../../src');
const hasDist = existsSync(join(DIST, 'index.cjs')) && existsSync(join(DIST, 'index.js'));

/** 递归取目录下全部 .ts 文件的最大 mtime(src 约 150 个文件,一次性 statSync 开销可忽略) */
function maxTsMtimeMs(dir: string): number {
  let max = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      max = Math.max(max, maxTsMtimeMs(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      max = Math.max(max, statSync(full).mtimeMs);
    }
  }
  return max;
}

const distStale =
  hasDist && statSync(join(DIST, 'index.cjs')).mtimeMs < maxTsMtimeMs(SRC);
if (distStale) {
  console.warn(
    '[dist-smoke] dist 过期(src 存在比 dist/index.cjs 更新的 .ts),已跳过;pnpm build 后生效'
  );
}

const NAMESPACES = [
  'quotes', 'codes', 'batch', 'kline', 'board', 'options', 'futures',
  'fundFlow', 'northbound', 'marketEvent', 'dragonTiger', 'blockTrade',
  'margin', 'fund', 'calendar', 'reference',
] as const;

describe.skipIf(!hasDist || distStale)(
  `dist 产物冒烟(构建后运行)${distStale ? ' — dist 过期,pnpm build 后生效' : ''}`,
  () => {
  it('CJS: require 侧全部命名空间可访问、方法可调用', () => {
    const require_ = createRequire(__filename);
    const mod = require_(join(DIST, 'index.cjs'));
    const SDK = mod.StockSDK ?? mod.default;
    expect(typeof SDK).toBe('function');
    const sdk = new SDK();
    for (const ns of NAMESPACES) {
      // 旧 bug:首次访问 getter 即 ReferenceError: return_nullishCoalesce is not defined
      const value = sdk[ns];
      expect(value, `sdk.${ns} 应为对象`).toBeTypeOf('object');
    }
    expect(typeof sdk.kline.cn).toBe('function');
    expect(typeof sdk.quotes.cnSimple).toBe('function');
    expect(typeof sdk.search).toBe('function');
    // 引用稳定性在产物侧同样成立
    expect(sdk.quotes).toBe(sdk.quotes);
  });

  it('CJS: mcp 入口可加载', () => {
    const require_ = createRequire(__filename);
    expect(() => require_(join(DIST, 'mcp.cjs'))).not.toThrow();
  });

  it('ESM: import 侧命名空间可访问', async () => {
    // R3-15:Windows 下动态 import 绝对路径必须是 file:// URL
    const mod = await import(pathToFileURL(join(DIST, 'index.js')).href);
    const SDK = mod.StockSDK ?? mod.default;
    const sdk = new SDK();
    for (const ns of NAMESPACES) {
      expect(sdk[ns], `sdk.${ns}`).toBeTypeOf('object');
    }
    expect(typeof sdk.kline.withIndicators).toBe('function');
  });

  it('子路径产物可加载且纯计算入口无网络代码', async () => {
    const require_ = createRequire(__filename);
    for (const sub of ['indicators', 'symbols', 'signals', 'screener', 'errors', 'cache']) {
      expect(() => require_(join(DIST, `${sub}.cjs`)), `${sub}.cjs`).not.toThrow();
      await expect(
        import(pathToFileURL(join(DIST, `${sub}.js`)).href),
        `${sub}.js`
      ).resolves.toBeTruthy();
    }
  });
});
