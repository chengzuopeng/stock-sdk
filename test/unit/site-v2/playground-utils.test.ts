import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  contractYYMM,
  monthISO,
} from '../../../site-v2/.vitepress/theme/components/playground/utils';

describe('site-v2 playground date utils', () => {
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
