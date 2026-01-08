import { defineConfig } from 'vitest/config';

const isIntegration = process.env.RUN_INTEGRATION === '1';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    include: isIntegration ? ['test/**/*.int.test.ts'] : ['test/**/*.test.ts'],
    exclude: isIntegration ? [] : ['test/**/*.int.test.ts'],
    setupFiles: isIntegration ? [] : ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 80,
        statements: 85,
        functions: 85,
        branches: 75,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
