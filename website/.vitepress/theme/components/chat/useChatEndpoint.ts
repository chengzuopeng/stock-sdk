/**
 * 解析文档问答 agent 的端点地址,并管理会话 ID。
 *
 * agent 部署在 api-worker(EdgeOne Makers,agents/ 运行时):
 *   POST /chat       一次提问,响应体是 text/event-stream
 *   POST /stop       中断该会话正在跑的回答
 *
 * 部署拓扑(生产跨域):
 *   前端 stock-sdk.linkdiary.cn / chengzuopeng.github.io,后端 api.linkdiary.cn。
 *   带 JSON body 的 POST 属非简单请求,浏览器会先发 OPTIONS 预检;后端已放开 CORS。
 *
 * 解析优先级:
 *   1. 构建期注入的 VITE_CHAT_ORIGIN(完整 http(s):// 源)→ 最高优先。
 *   2. 本地开发(localhost / 127.0.0.1)→ 同源相对路径,由 VitePress 的
 *      vite.server.proxy 反代到本地 `edgeone makers dev`(见 .vitepress/config.ts)。
 *   3. 生产 → https://api.linkdiary.cn 。
 *
 * 仅在浏览器调用(依赖 window.location / sessionStorage),SSR 阶段不要触发。
 */

const CHAT_PATH = '/chat';
const STOP_PATH = '/stop';

/** 生产默认后端(api-worker 部署域名)。 */
const PROD_API_ORIGIN = 'https://api.linkdiary.cn';

/** 会话 ID 存放键。用 sessionStorage:关掉标签页即新开对话,符合文档站的一次性咨询场景。 */
const CONVERSATION_KEY = 'stock-sdk-chat-conversation-id';

/** 构建期可注入:完整的 http(s):// 源,覆盖一切默认逻辑。 */
const ENV_ORIGIN =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CHAT_ORIGIN
    : undefined;

function isLocalHost(host: string): boolean {
  const name = host.split(':')[0];
  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
}

/** 当前环境下 agent 服务的源(不含路径)。 */
function resolveOrigin(): string {
  if (ENV_ORIGIN && ENV_ORIGIN.trim()) return ENV_ORIGIN.trim().replace(/\/+$/, '');

  const loc = window.location;
  // 本地开发:同源相对,命中 vite proxy
  if (isLocalHost(loc.host)) return `${loc.protocol}//${loc.host}`;

  return PROD_API_ORIGIN;
}

export function resolveChatEndpoint(): string {
  return `${resolveOrigin()}${CHAT_PATH}`;
}

export function resolveStopEndpoint(): string {
  return `${resolveOrigin()}${STOP_PATH}`;
}

/**
 * 取当前会话 ID,没有就生成一个并存起来。
 *
 * agents 运行时强制要求每个请求带 `Makers-Conversation-Id`,格式限定
 * 6-36 个字符且只允许 [0-9a-zA-Z-_.] —— 缺失或非法会在进入函数前就被 400。
 * 多轮上下文由服务端按这个 ID 存取,前端不再回传历史。
 */
export function getConversationId(): string {
  try {
    const saved = sessionStorage.getItem(CONVERSATION_KEY);
    if (saved) return saved;
  } catch {
    /* 隐私模式下 sessionStorage 可能不可用,退化为每次新会话 */
  }

  const id = createConversationId();
  try {
    sessionStorage.setItem(CONVERSATION_KEY, id);
  } catch {
    /* noop */
  }
  return id;
}

/** 丢弃当前会话 ID,下次提问会开一个全新会话(「新对话」按钮用)。 */
export function resetConversationId(): void {
  try {
    sessionStorage.removeItem(CONVERSATION_KEY);
  } catch {
    /* noop */
  }
}

function createConversationId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  // 前缀 4 + 随机 28 = 32 字符,落在 runtime 要求的 6-36 区间内
  return `web-${rand.slice(0, 28)}`;
}
