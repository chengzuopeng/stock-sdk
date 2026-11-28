import { defineConfig } from 'vitest/config';

const isIntegration = process.env.RUN_INTEGRATION === '1';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    include: isIntegration
      ? ['packages/*/test/**/*.int.test.ts', 'test/**/*.int.test.ts']
      : ['packages/*/test/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: isIntegration
      ? ['**/node_modules/**', '**/dist/**']
      : ['**/*.int.test.ts', '**/node_modules/**', '**/dist/**'],
    setupFiles: isIntegration ? [] : ['packages/core/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 80,
        statements: 85,
        functions: 85,
        branches: 75,
      },
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts'],
    },
  },
});
