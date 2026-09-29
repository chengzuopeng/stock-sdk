import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  contractYYMM,
  monthISO,
} from '../../../website/.vitepress/theme/components/playground/utils';
import { buildArgs } from '../../../website/.vitepress/theme/components/playground/runner';
import { buildCode } from '../../../website/.vitepress/theme/components/playground/codegen';
import { methodsById } from '../../../website/.vitepress/theme/components/playground/derive';

describe('website playground date utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps month offsets stable at month end', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-31T12:00:00+08:00'));

    expect(contractYYMM(1)).toBe('2602');
    expect(monthISO(1)).toBe('2026-02');
  });
});

describe('website playground buildArgs / buildCode (#65 stockChanges 分页)', () => {
  const method = methodsById['marketEvent.stockChanges'];

  it('type 留空只填分页:type 以 undefined 占位,options 落在第 2 个实参', () => {
    expect(buildArgs(method, { page: '2', pageSize: '50' })).toEqual([
      undefined,
      { page: 2, pageSize: 50 },
    ]);
    expect(buildCode(method, { page: '2' })).toContain(
      'sdk.marketEvent.stockChanges(undefined, {\n  page: 2\n})'
    );
  });

  it('只填 type / 全部留空:保持原有实参形态', () => {
    expect(buildArgs(method, { type: 'all' })).toEqual(['all']);
    expect(buildArgs(method, {})).toEqual([]);
    expect(buildArgs(method, { type: 'all', page: '1' })).toEqual(['all', { page: 1 }]);
  });
});
