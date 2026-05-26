import { describe, it, expect, beforeEach } from 'vitest';
import { withScriptMutex } from '../../../src/core';
import { __resetScriptMutex } from '../../../src/core/scriptMutex';

describe('withScriptMutex', () => {
  beforeEach(() => {
    __resetScriptMutex();
  });

  it('serializes same-key concurrent tasks', async () => {
    const order: string[] = [];
    const slowTask = (label: string, delay: number) => async () => {
      order.push(`${label}:start`);
      await new Promise((r) => setTimeout(r, delay));
      order.push(`${label}:end`);
      return label;
    };

    // 故意让 A 慢，B 快；若并发，B 会先 end；mutex 下应严格 A end → B start
    const [a, b] = await Promise.all([
      withScriptMutex('shared', slowTask('A', 30)),
      withScriptMutex('shared', slowTask('B', 5)),
    ]);

    expect(a).toBe('A');
    expect(b).toBe('B');
    expect(order).toEqual(['A:start', 'A:end', 'B:start', 'B:end']);
  });

  it('allows different keys to run in parallel', async () => {
    const order: string[] = [];
    const task = (label: string, delay: number) => async () => {
      order.push(`${label}:start`);
      await new Promise((r) => setTimeout(r, delay));
      order.push(`${label}:end`);
      return label;
    };

    await Promise.all([
      withScriptMutex('keyA', task('A', 30)),
      withScriptMutex('keyB', task('B', 5)),
    ]);

    // 不同 key 真并发：B 在 A 结束前就 end
    expect(order.slice(0, 2)).toEqual(['A:start', 'B:start']);
    expect(order.indexOf('B:end')).toBeLessThan(order.indexOf('A:end'));
  });

  it('does not let one task failure block the next', async () => {
    const order: string[] = [];

    const promiseFail = withScriptMutex('shared', async () => {
      order.push('fail:start');
      throw new Error('boom');
    });
    const promiseOk = withScriptMutex('shared', async () => {
      order.push('ok:start');
      return 'ok';
    });

    await expect(promiseFail).rejects.toThrow('boom');
    await expect(promiseOk).resolves.toBe('ok');
    expect(order).toEqual(['fail:start', 'ok:start']);
  });

  it('returns task result transparently (resolve)', async () => {
    const v = await withScriptMutex('k', async () => 42);
    expect(v).toBe(42);
  });

  it('returns task error transparently (reject)', async () => {
    const e = new Error('x');
    await expect(
      withScriptMutex('k', async () => {
        throw e;
      })
    ).rejects.toBe(e);
  });

  it('processes a long FIFO queue in submission order', async () => {
    const order: number[] = [];
    const tasks = Array.from({ length: 8 }, (_, i) =>
      withScriptMutex('q', async () => {
        order.push(i);
        // 故意让"晚提交"的更快，验证 mutex 是按提交顺序而非完成顺序
        await new Promise((r) => setTimeout(r, 10 - i));
      })
    );
    await Promise.all(tasks);
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
