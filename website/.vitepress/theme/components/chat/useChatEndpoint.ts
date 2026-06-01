/**
 * 解析文档问答 agent 的 WebSocket 端点地址。
 *
 * agent 部署在 api-worker(EdgeOne),路由 /api/llm/chat。
 *
 * 部署拓扑(生产跨域):
 *   前端:stock-sdk.linkdiary.cn / chengzuopeng.github.io
 *   后端:api.linkdiary.cn
 * WebSocket 连接本身不受 CORS 限制(浏览器允许跨域发起 wss://,无需预检/CORS 头),
 * 但前端必须显式连到后端域名,且后端要在 Origin 白名单里放行前端域名(已配)。
 *
 * 解析优先级:
 *   1. 构建期注入的 VITE_CHAT_ENDPOINT(完整 wss:// 地址)→ 最高优先,任意覆盖。
 *   2. 本地开发(host 是 localhost / 127.0.0.1)→ 走同源相对路径,由 VitePress
 *      的 vite.server.proxy 反代到本地 api-worker(见 .vitepress/config.ts)。
 *   3. 生产 → 连默认后端 wss://api.linkdiary.cn/api/llm/chat。
 *
 * 仅在浏览器(onMounted 之后)调用,SSR 阶段不应触发(依赖 window.location)。
 */

const CHAT_PATH = '/api/llm/chat';

/** 生产默认后端(api-worker 部署域名)。 */
const PROD_API_HOST = 'api.linkdiary.cn';

/** 构建期可注入:完整的 wss:// 地址,覆盖一切默认逻辑。 */
const ENV_ENDPOINT =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CHAT_ENDPOINT
    : undefined;

function isLocalHost(host: string): boolean {
  const name = host.split(':')[0];
  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
}

/**
 * 返回当前环境下应连接的 ws(s) URL。
 * 必须在浏览器环境调用。
 */
export function resolveChatEndpoint(): string {
  if (ENV_ENDPOINT && ENV_ENDPOINT.trim()) {
    return ENV_ENDPOINT.trim();
  }

  const loc = window.location;
  const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';

  // 本地开发:同源相对,命中 vite proxy
  if (isLocalHost(loc.host)) {
    return `${wsProto}//${loc.host}${CHAT_PATH}`;
  }

  // 生产:连独立后端域名(跨域,WebSocket 不受 CORS 限制)
  return `wss://${PROD_API_HOST}${CHAT_PATH}`;
}
