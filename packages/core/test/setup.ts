import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from './mocks/server';
import { clearSharedCaches } from '../src/core/cache';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  // 清理模块级共享缓存，避免用例间污染。
  // R7-11 起代码表/交易日历/板块映射/us-secid 为 per-client 缓存，不在此列：
  // 每用例新建 client/SDK 即天然隔离；复用模块级 client 的测试文件必须自行
  // beforeEach(() => clearClientScopedCaches(client))。
  clearSharedCaches();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
