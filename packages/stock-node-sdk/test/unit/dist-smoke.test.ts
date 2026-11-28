import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { ALL_NODE_METHOD_SPECS, NODE_METHOD_SPECS } from '@stock-sdk/core/spec/nodeMethods';
import { resolveSdkMethod } from '@stock-sdk/core/spec/resolve';
import { StockNodeSDK } from '../../src/sdk';
import { NODE_MCP_TOOLS } from '../../src/mcp';

const PKG_DIR = join(__dirname, '../..');
const DIST = join(PKG_DIR, 'dist');
const hasDist = existsSync(join(DIST, 'index.cjs')) && existsSync(join(DIST, 'index.js'));

describe('stock-node-sdk spec 一致性校验', () => {
  it('105 个全量方法（94 双端 + 11 Node 专属）均可在 StockNodeSDK 实例上真实解析', () => {
    expect(NODE_METHOD_SPECS.length).toBe(11);
    expect(ALL_NODE_METHOD_SPECS.length).toBe(105);
    expect(NODE_MCP_TOOLS.length).toBe(104); // 仅 batch.raw 为 CLI-only

    const sdk = new StockNodeSDK();
    for (const spec of ALL_NODE_METHOD_SPECS) {
      const resolved = resolveSdkMethod(sdk, spec.path);
      expect(resolved, `StockNodeSDK 缺少方法 ${spec.path.join('.')}`).toBeDefined();
      expect(typeof resolved?.fn).toBe('function');
    }
  });
});

describe.skipIf(!hasDist)('stock-node-sdk dist 产物冒烟', () => {
  it('CJS 与 ESM 产物、全部子路径可加载且无 @stock-sdk/core 残留引用', async () => {
    const require_ = createRequire(__filename);
    const cjs = require_(join(DIST, 'index.cjs'));
    const SDK = cjs.StockNodeSDK ?? cjs.default;
    expect(typeof SDK).toBe('function');
    const sdk = new SDK();
    for (const ns of ['quotes', 'kline', 'financial', 'news', 'corporate', 'bond']) {
      expect(sdk[ns], `sdk.${ns}`).toBeTypeOf('object');
    }
    expect(sdk.financial).toBe(sdk.financial);

    const esm = await import(pathToFileURL(join(DIST, 'index.js')).href);
    expect(typeof esm.StockNodeSDK).toBe('function');

    for (const sub of ['router', 'indicators', 'symbols', 'signals', 'screener', 'cache', 'errors', 'mcp']) {
      expect(() => require_(join(DIST, `${sub}.cjs`)), `${sub}.cjs`).not.toThrow();
      await expect(import(pathToFileURL(join(DIST, `${sub}.js`)).href)).resolves.toBeTruthy();
    }

    for (const entry of readdirSync(DIST, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.(js|cjs|d\.ts|d\.cts)$/.test(entry.name)) continue;
      const content = readFileSync(join(DIST, entry.name), 'utf8');
      expect(content, `${entry.name} 不应残留 @stock-sdk/core 外部引用`).not.toMatch(
        /(?:from|import|require)\s*\(?['"]@stock-sdk\/core/
      );
      expect(content, `${entry.name} 不应残留悬空 'src' 外部引用`).not.toMatch(
        /from\s+['"]src['"]/
      );
    }
  });

  it('CLI 支持 Node 专属命令帮助、全局选项校验与 MCP ping 响应', () => {
    const rootHelp = spawnSync(process.execPath, [join(DIST, 'cli.js'), '--help'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(rootHelp.status, rootHelp.stderr).toBe(0);
    expect(rootHelp.stdout).toContain('stock-node-sdk');
    expect(rootHelp.stdout).toContain('financial');
    expect(rootHelp.stdout).toContain('news');
    expect(rootHelp.stdout).toContain('corporate');
    expect(rootHelp.stdout).toContain('bond');
    expect(rootHelp.stdout).toContain('--source');
    expect(rootHelp.stdout).toContain('--proxy');
    expect(rootHelp.stdout).toContain('--cache-dir');
    expect(rootHelp.stdout).toContain('--overseas=false');

    const mcpHelp = spawnSync(process.execPath, [join(DIST, 'cli.js'), 'mcp', '--help'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(mcpHelp.status, mcpHelp.stderr).toBe(0);
    expect(mcpHelp.stdout).toContain('stock-node-sdk mcp');
    expect(mcpHelp.stdout).toContain('--source');
    expect(mcpHelp.stdout).toContain('--overseas=false');

    const help = spawnSync(process.execPath, [join(DIST, 'cli.js'), 'financial', 'indicators', '--help'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toContain('stock-node-sdk financial indicators');

    // 缺少 --source 参数值返回 exit 2 (USAGE)
    const missingSourceVal = spawnSync(
      process.execPath,
      [join(DIST, 'cli.js'), 'quotes', 'cn', '600519', '--source'],
      { encoding: 'utf8', timeout: 5000 }
    );
    expect(missingSourceVal.status).toBe(2);
    expect(missingSourceVal.stderr).toContain('--source');

    // 未知参数依然严格拒绝（exit 2）
    const unknownFlag = spawnSync(
      process.execPath,
      [join(DIST, 'cli.js'), 'quotes', 'cn', '600519', '--nonexistent-flag'],
      { encoding: 'utf8', timeout: 5000 }
    );
    expect(unknownFlag.status).toBe(2);

    const mcp = spawnSync(process.execPath, [join(DIST, 'cli.js'), 'mcp'], {
      input:
        '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25"}}\n' +
        '{"jsonrpc":"2.0","id":2,"method":"ping"}\n',
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(mcp.status, mcp.stderr).toBe(0);
    const lines = mcp.stdout
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(lines[0]).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        serverInfo: { name: 'stock-node-sdk' },
      },
    });
    expect(lines[1]).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
  });
});
