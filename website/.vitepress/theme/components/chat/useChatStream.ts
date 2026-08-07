/**
 * 文档问答 agent 的 SSE 客户端(组合式)。
 *
 * 对接 api-worker 的 EdgeOne Makers agents 运行时:
 *   C→S: POST /chat
 *        headers: Content-Type: application/json
 *                 Makers-Conversation-Id: <会话 ID>   ← 必带,缺了 runtime 直接 400
 *        body:    { message }                        ← 不再回传 history,多轮由服务端 store 托管
 *   S→C: text/event-stream,标准 SSE 帧(带 event 行):
 *        event: text_delta   data: { delta }
 *        event: tool_called  data: { tool }
 *        event: done         data: { stopped }
 *        event: error        data: { message }
 *
 * 取消:中止 fetch 的同时打一发 POST /stop —— 前者停本地读流,后者让服务端中断
 * 正在跑的 run、释放上游连接(否则 agent 会继续烧 token 直到跑完)。
 *
 * 设计:SSR 安全(仅浏览器调用)、增量写入气泡、错误就地降级、单飞(忙时不接新提问)。
 */

import { ref, type Ref } from 'vue';
import { resolveChatEndpoint, resolveStopEndpoint, getConversationId, resetConversationId } from './useChatEndpoint';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  /** 该助手回答是否仍在流式输出中 */
  streaming?: boolean;
  /** 该回答是否出错 */
  error?: boolean;
  /** 本轮调用过的工具(search_docs / run_sdk_example),按调用顺序 */
  tools?: string[];
}

export type StreamState = 'idle' | 'streaming' | 'error';

interface UseChatStream {
  turns: Ref<ChatTurn[]>;
  state: Ref<StreamState>;
  /** 是否正在等待/接收一条回答(用于禁用输入、显示停止按钮) */
  busy: Ref<boolean>;
  send: (message: string) => void;
  cancel: () => void;
  reset: () => void;
  dispose: () => void;
}

export function useChatStream(): UseChatStream {
  const turns = ref<ChatTurn[]>([]);
  const state = ref<StreamState>('idle');
  const busy = ref(false);

  /** 当前在途请求的中止器(取消 / 析构时 abort)。 */
  let controller: AbortController | null = null;

  /** 最后一个仍在流式中的助手气泡(找不到返回 undefined)。 */
  function currentBubble(): ChatTurn | undefined {
    const last = turns.value[turns.value.length - 1];
    return last && last.role === 'assistant' && last.streaming ? last : undefined;
  }

  function markError(bubble: ChatTurn | undefined, message: string): void {
    if (bubble && bubble.streaming) {
      bubble.streaming = false;
      bubble.error = true;
      if (!bubble.content) bubble.content = `⚠️ ${message}`;
    }
  }

  /** 非 2xx 响应按状态码给出友好文案(不暴露后端内部细节)。 */
  function statusMessage(status: number): string {
    if (status === 400) return '请求格式有误,请刷新页面重试。';
    if (status === 401 || status === 403) return '访问未授权。';
    if (status === 429) return '请求太频繁了,请稍后再试。';
    return '服务暂时不可用,请稍后重试。';
  }

  /**
   * 解析一帧 SSE(形如 `event: text_delta\ndata: {...}`),把增量写进 bubble。
   * 没有 event 行的帧一律忽略 —— 后端每帧都会带。
   */
  function handleEvent(raw: string, bubble: ChatTurn): void {
    let event = '';
    let data = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data = line.slice(5).trim();
    }
    if (!event || !data) return;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }

    switch (event) {
      case 'text_delta':
        if (typeof payload.delta === 'string') bubble.content += payload.delta;
        break;
      case 'tool_called':
        if (typeof payload.tool === 'string') {
          if (!bubble.tools) bubble.tools = [];
          bubble.tools.push(payload.tool);
        }
        break;
      case 'done':
        bubble.streaming = false;
        break;
      case 'error':
        markError(bubble, typeof payload.message === 'string' ? payload.message : '出错了');
        break;
    }
  }

  async function run(message: string): Promise<void> {
    // 追加助手占位气泡,后续增量写到它身上
    turns.value.push({ role: 'assistant', content: '', streaming: true });
    const bubble = turns.value[turns.value.length - 1];

    controller = new AbortController();
    busy.value = true;
    state.value = 'streaming';

    try {
      const res = await fetch(resolveChatEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Makers-Conversation-Id': getConversationId(),
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        markError(bubble, statusMessage(res.status));
        state.value = 'error';
        return;
      }

      // 逐帧读 SSE:按 \n\n 切事件,跨 chunk 的半帧留在 buf 里下次再拼
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const ev of parts) handleEvent(ev, bubble);
      }
      buf += decoder.decode();
      if (buf.trim()) handleEvent(buf, bubble);
    } catch (err) {
      // 用户主动取消(abort)不算错误,直接收尾;其余按连接错误降级
      if ((err as { name?: string } | undefined)?.name !== 'AbortError') {
        markError(bubble, '连接出错,请稍后重试。');
        state.value = 'error';
      }
    } finally {
      if (bubble.streaming) bubble.streaming = false;
      busy.value = false;
      controller = null;
      if (state.value === 'streaming') state.value = 'idle';
    }
  }

  function send(message: string): void {
    const text = message.trim();
    if (!text || busy.value) return;
    turns.value.push({ role: 'user', content: text });
    void run(text);
  }

  /** 通知服务端中断该会话正在跑的 run。失败无所谓,本地 abort 已经停了读流。 */
  function requestServerStop(): void {
    let endpoint: string;
    let conversationId: string;
    try {
      endpoint = resolveStopEndpoint();
      conversationId = getConversationId();
    } catch {
      return;
    }
    void fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Makers-Conversation-Id': conversationId,
      },
      body: JSON.stringify({ conversation_id: conversationId }),
      keepalive: true,
    }).catch(() => {
      /* 中断是尽力而为,失败不打扰用户 */
    });
  }

  function cancel(): void {
    const wasRunning = controller !== null;
    if (controller) {
      controller.abort();
      controller = null;
    }
    if (wasRunning) requestServerStop();

    const bubble = currentBubble();
    if (bubble) bubble.streaming = false;
    busy.value = false;
    if (state.value === 'streaming') state.value = 'idle';
  }

  /** 清空对话。同时换一个新的 conversationId,否则服务端仍会带上旧上下文。 */
  function reset(): void {
    cancel();
    turns.value = [];
    resetConversationId();
  }

  function dispose(): void {
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  return { turns, state, busy, send, cancel, reset, dispose };
}
