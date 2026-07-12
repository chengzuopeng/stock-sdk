/**
 * 再生成 ATR/SAR/KC 黄金基线 fixture（R7-6/R7-7 的 bitwise 回归闸门数据）。
 *
 * 用法：pnpm gen:indicator-baseline
 * 何时跑：故意改动指标默认参数 / 精度后，重跑本脚本更新基线，人工确认
 * diff 合理再提交 test/unit/indicators/__fixtures__/seed-baseline.json。
 *
 * 生成逻辑（genBars / BASELINE_CASES）与 seed-baseline.test.ts 同源共享
 * （../test/unit/indicators/__fixtures__/gen），杜绝两份 genBars 漂移。
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calcATR } from '../src/indicators/atr';
import { calcSAR } from '../src/indicators/sar';
import { calcKC } from '../src/indicators/kc';
import {
  genBars,
  BASELINE_CASES,
} from '../test/unit/indicators/__fixtures__/gen';

const out: Record<string, unknown> = {};
for (const c of BASELINE_CASES) {
  const bars = genBars(c.seed, c.n);
  out[c.name] = {
    seed: c.seed,
    n: c.n,
    atr14: calcATR(bars, { period: 14 }),
    atr5: calcATR(bars, { period: 5 }),
    sar: calcSAR(bars),
    kc: calcKC(bars),
  };
}

const target = fileURLToPath(
  new URL('../test/unit/indicators/__fixtures__/seed-baseline.json', import.meta.url)
);
writeFileSync(target, JSON.stringify(out));
// eslint-disable-next-line no-console
console.log(`baseline written: ${Object.keys(out).join(', ')} → ${target}`);
