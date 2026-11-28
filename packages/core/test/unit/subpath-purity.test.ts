/**
 * Review 修复回归（F33）：纯计算子路径不得 import '../core' barrel
 *
 * barrel 会把整个请求层（fetch/熔断/UA 池/常量）拖进对应 dist 入口
 * （实测 dist/signals.js 曾因此引入 26KB 网络层 chunk），违背
 * 「signals/indicators/screener/symbols 纯计算零网络」的文档承诺。
 * 叶子导入（'../core/errors' 等）不受限制。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');
/** 受「纯计算零网络」承诺约束的子路径目录 */
const PURE_DIRS = ['signals', 'indicators', 'screener', 'symbols'];

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(p);
    return e.name.endsWith('.ts') ? [p] : [];
  });
}

describe('F33 子路径纯度:禁止 ../core barrel 导入', () => {
  for (const dir of PURE_DIRS) {
    it(`src/${dir} 只允许 ../core/<叶子模块> 导入`, () => {
      const offenders: string[] = [];
      for (const file of tsFiles(join(SRC, dir))) {
        const text = readFileSync(file, 'utf8');
        // 命中 barrel:from '../core' 或 "../core"(不带子路径)
        if (/from ['"]\.\.\/core['"]/.test(text)) {
          offenders.push(file.slice(SRC.length + 1));
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
