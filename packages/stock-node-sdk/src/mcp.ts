import {
  dispatchMessage,
  resolveSdkOptions,
  startMcpServer as startCoreMcpServer,
  type DispatchContext,
  type McpServerOptions,
} from '@stock-sdk/core/mcp';
import { buildToolsFromSpecs } from '@stock-sdk/core/mcp/tools/index';
import { ALL_NODE_METHOD_SPECS } from '@stock-sdk/core/spec/nodeMethods';
import { StockNodeSDK, type StockNodeSDKOptions } from './sdk';
import type { StockSDK } from '@stock-sdk/core/sdk';

declare const __STOCK_SDK_VERSION__: string | undefined;

const NODE_SERVER_INFO = {
  name: 'stock-node-sdk',
  version: typeof __STOCK_SDK_VERSION__ !== 'undefined' ? __STOCK_SDK_VERSION__ : '0.1.0-dev',
};

export const NODE_MCP_TOOLS = buildToolsFromSpecs(ALL_NODE_METHOD_SPECS);

export interface NodeMcpServerOptions extends Omit<McpServerOptions, 'sdk' | 'sdkInstance' | 'allTools'> {
  sdk?: StockNodeSDKOptions;
}

/**
 * 启动 `stock-node-sdk` 增强版 MCP server（含全部双端 + Node 专属工具，默认启用多源自动容错）。
 */
export function startMcpServer(options: NodeMcpServerOptions = {}): void {
  const sdkInstance = new StockNodeSDK(resolveSdkOptions(options.sdk));
  startCoreMcpServer({
    ...options,
    sdkInstance: sdkInstance as unknown as StockSDK,
    allTools: NODE_MCP_TOOLS,
    serverLabel: 'stock-node-sdk',
    serverInfo: options.serverInfo ?? NODE_SERVER_INFO,
    onClose: async () => {
      await sdkInstance.close();
      await options.onClose?.();
    },
  });
}

export { dispatchMessage, type DispatchContext, type McpServerOptions };
