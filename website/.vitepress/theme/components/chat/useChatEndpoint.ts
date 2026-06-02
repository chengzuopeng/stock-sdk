/**
 * 解析文档问答 agent 的 SSE 端点地址(http(s)://.../api/llm/chat)。
 *
 * agent 部署在 api-worker(EdgeOne),路由 /api/llm/chat,以 SSE 形态对外:
 * 一次提问 = 一个 POST 请求,响应体是 text/event-stream 流。
 *
 * 部署拓扑(生产跨域):
 *   前端:stock-sdk.linkdiary.cn / chengzuopeng.github.io
 *   后端:api.linkdiary.cn
 * 带 JSON body 的 POST 属于“非简单请求”,浏览器会先发 OPTIONS 预检,
 * 且实际响应也需带 CORS 头 —— 后端已对白名单内 Origin 放行(见 api-worker)。
 *
 * 解析优先级:
 *   1. 构建期注入的 VITE_CHAT_ENDPOINT(完整 http(s):// 地址)→ 最高优先,任意覆盖。
 *   2. 本地开发(host 是 localhost / 127.0.0.1)→ 走同源相对路径,由 VitePress
 *      的 vite.server.proxy 反代到本地 api-worker(见 .vitepress/config.ts)。
 *   3. 生产 → 连默认后端 https://api.linkdiary.cn/api/llm/chat。
 *
 * 仅在浏览器(onMounted 之后)调用,SSR 阶段不应触发(依赖 window.location)。
 */

const CHAT_PATH = '/api/llm/chat';

/** 生产默认后端(api-worker 部署域名)。 */
const PROD_API_HOST = 'api.linkdiary.cn';

/** 构建期可注入:完整的 http(s):// 地址,覆盖一切默认逻辑。 */
const ENV_ENDPOINT =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CHAT_ENDPOINT
    : undefined;

function isLocalHost(host: string): boolean {
  const name = host.split(':')[0];
  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
}

/**
 * 返回当前环境下应请求的 http(s) URL。
 * 必须在浏览器环境调用。
 */
export function resolveChatEndpoint(): string {
  if (ENV_ENDPOINT && ENV_ENDPOINT.trim()) {
    return ENV_ENDPOINT.trim();
  }

  const loc = window.location;

  // 本地开发:同源相对,命中 vite proxy(转发到本地 api-worker)
  if (isLocalHost(loc.host)) {
    return `${loc.protocol}//${loc.host}${CHAT_PATH}`;
  }

  // 生产:连独立后端域名(跨域 POST + SSE,后端已配 CORS)
  return `https://${PROD_API_HOST}${CHAT_PATH}`;
}
