#!/usr/bin/env node
import {
  CliUsageError,
  executeCliProcess,
  type CliSdkFactoryContext,
} from '@stock-sdk/core/cli';
import { lastOf, parseBooleanOption } from '@stock-sdk/core/cli/dispatch';
import { toCommandSpec } from '@stock-sdk/core/spec/derive-cli';
import { NODE_METHOD_SPECS } from '@stock-sdk/core/spec/nodeMethods';
import type { ProviderId } from '@stock-sdk/core/router';
import type { StockSDK } from '@stock-sdk/core/sdk';
import { StockNodeSDK, type StockNodeSDKOptions } from './sdk';
import { FileCacheStore } from './storage/fileCacheStore';
import { startMcpServer } from './mcp';

const EXTRA_NODE_COMMANDS = NODE_METHOD_SPECS.map((spec) => toCommandSpec(spec));

const NODE_GLOBAL_FLAGS = ['source', 'proxy', 'cache-dir', 'overseas'] as const;
const NODE_BOOLEAN_FLAGS = ['overseas'] as const;

const NODE_GLOBAL_HELP_LINES = [
  '      --source <id[,id]>        强制指定数据源（如 tencent / sina / eastmoney / cnbc / nasdaq / sec / hkexnews）',
  '      --proxy <url[,url]>       HTTP/HTTPS 代理 URL（多个用逗号分隔或重复传参）',
  '      --cache-dir <dir>         启用本地磁盘持久化缓存目录',
  '      --overseas=false          关闭海外数据源（CNBC / Nasdaq / SEC），仅用大陆可直连源（默认开启）',
] as const;

function readCommaStringList(flag: string, raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  const items = Array.isArray(raw) ? raw : [raw];
  const values: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') {
      throw new CliUsageError(`--${flag} 缺少值`);
    }
    for (const part of item.split(',')) {
      const trimmed = part.trim();
      if (trimmed.length > 0) values.push(trimmed);
    }
  }
  if (values.length === 0) {
    throw new CliUsageError(`--${flag} 不能为空`);
  }
  return values;
}

function readNonEmptyString(flag: string, raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  const value = lastOf(raw);
  if (typeof value !== 'string') {
    throw new CliUsageError(`--${flag} 缺少值`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new CliUsageError(`--${flag} 不能为空`);
  }
  return trimmed;
}

function buildNodeSdkOptions({ timeout, rawOptions }: CliSdkFactoryContext): StockNodeSDKOptions {
  const options: StockNodeSDKOptions = {};
  if (timeout !== undefined) options.timeout = timeout;

  const sources = readCommaStringList('source', rawOptions.source);
  if (sources) {
    options.routing = {
      forcedSource: (sources.length === 1 ? sources[0] : sources) as ProviderId | ProviderId[],
    };
  }

  const proxies = readCommaStringList('proxy', rawOptions.proxy);
  if (proxies) {
    options.proxy = proxies.length === 1 ? proxies[0] : proxies;
  }

  const cacheDir = readNonEmptyString('cache-dir', rawOptions['cache-dir']);
  if (cacheDir) {
    options.cache = {
      store: new FileCacheStore({ dir: cacheDir }),
    };
  }

  if (rawOptions.overseas !== undefined) {
    options.overseas = parseBooleanOption('overseas', lastOf(rawOptions.overseas));
  }

  return options;
}

interface TrackedNodeSdk extends StockNodeSDK {
  __cliHasExplicitSource?: boolean;
  __cliQuiet?: boolean;
  __cliRouteCount?: number;
  __cliHttpCount?: number;
}

executeCliProcess(process.argv.slice(2), {
  binName: 'stock-node-sdk',
  extraCommands: EXTRA_NODE_COMMANDS,
  extraGlobalFlags: NODE_GLOBAL_FLAGS,
  extraBooleanFlags: NODE_BOOLEAN_FLAGS,
  extraGlobalHelpLines: NODE_GLOBAL_HELP_LINES,
  extraMcpFlagsHint: '[--source <id>] [--proxy <url>] [--cache-dir <dir>] [--overseas=false]',
  createSdk: (ctx) => {
    const sdkOptions = buildNodeSdkOptions(ctx);
    let routeCount = 0;
    let httpCount = 0;
    const prevHooks = sdkOptions.hooks;
    const sdk = new StockNodeSDK({
      ...sdkOptions,
      onRoute: () => {
        routeCount += 1;
      },
      hooks: {
        ...prevHooks,
        onRequest: (reqCtx) => {
          httpCount += 1;
          prevHooks?.onRequest?.(reqCtx);
        },
      },
    }) as TrackedNodeSdk;
    sdk.__cliHasExplicitSource = ctx.rawOptions.source !== undefined;
    sdk.__cliQuiet = Boolean(ctx.rawOptions.quiet ?? ctx.rawOptions.q);
    Object.defineProperty(sdk, '__cliRouteCount', { get: () => routeCount });
    Object.defineProperty(sdk, '__cliHttpCount', { get: () => httpCount });
    return sdk as unknown as StockSDK;
  },
  closeSdk: async (sdk) => {
    const tracked = sdk as unknown as TrackedNodeSdk;
    if (
      tracked.__cliHasExplicitSource &&
      !tracked.__cliQuiet &&
      (tracked.__cliRouteCount ?? 0) === 0 &&
      (tracked.__cliHttpCount ?? 0) > 0
    ) {
      process.stderr.write('stock-node-sdk: 提示: 当前命令固定使用单一数据源，--source 未生效\n');
    }
    await tracked.close();
  },
  startMcp: async (ctx) => {
    const sdkOptions = buildNodeSdkOptions(ctx);
    startMcpServer(Object.keys(sdkOptions).length > 0 ? { sdk: sdkOptions } : undefined);
    return 0;
  },
});
