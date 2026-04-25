import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from './mocks/server';
import { clearSharedCaches } from '../src/core/cache';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  // 清理模块级共享缓存（如交易日历、板块代码映射等），避免用例间污染
  clearSharedCaches();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
