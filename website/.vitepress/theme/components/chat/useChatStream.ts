/**
 * 文档问答 agent 的 SSE 客户端(组合式)。
 *
 * 对接 api-worker 的 /api/llm/chat(SSE over POST):
 *   C→S: POST { message, history? }(Content-Type: application/json)
 *   S→C: text/event-stream,逐帧 `data: <json>`:
 *        { type:'message.start' }
 *        | { type:'message.delta', text }
 *        | { type:'message.done', usage?, finishReason }
 *        | { type:'error', error:{message} }
 *
 * 形态:一次提问 = 一个 POST 请求(用 fetch 读流,而非 EventSource —— 因为要带 body
 * 且要 POST)。取消 = 中止该 fetch(AbortController);单飞:忙时不接新提问(UI 同步禁用)。
 *
 * 设计:SSR 安全(仅浏览器调用)、增量写入气泡、错误就地降级。
 */

import { ref, type Ref } from 'vue';
import { resolveChatEndpoint } from './useChatEndpoint';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  /** 该助手回答是否仍在流式输出中 */
  streaming?: boolean;
  /** 该回答是否出错 */
  error?: boolean;
  /** 该回答是否因长度限制被截断(finishReason === 'length') */
  truncated?: boolean;
}

export type StreamState = 'idle' | 'streaming' | 'error';

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

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

const MAX_HISTORY_TURNS = 6; // 发给服务端的历史轮数上限(与后端 MAX_HISTORY_MESSAGES 呼应)

export function useChatStream(): UseChatStream {
  const turns = ref<ChatTurn[]>([]);
  const state = ref<StreamState>('idle');
  const busy = ref(false);

  /** 当前在途请求的中止器(取消 / 析构时 abort)。 */
  let controller: AbortController | null = null;

  /** 取“本次提问之前”的已完成历史(剔除流式中/出错/空内容)。 */
  function buildHistory(): HistoryItem[] {
    return turns.value
      .filter((t) => t.content && !t.streaming && !t.error)
      .slice(-MAX_HISTORY_TURNS * 2)
      .map((t) => ({ role: t.role, content: t.content }));
  }

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
    if (status === 401) return '访问未授权。';
    if (status === 403) return '来源未授权。';
    if (status === 429) return '请求太频繁了,请稍后再试。';
    return '服务暂时不可用,请稍后重试。';
  }

  /** 解析一段 SSE 文本(可能含多帧),把增量写进 bubble。 */
  function handleEvent(raw: string, bubble: ChatTurn): void {
    const dataLine = raw.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return;
    const data = dataLine.slice(5).trim();
    if (!data) return;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'message.delta':
        if (typeof msg.text === 'string') bubble.content += msg.text;
        break;
      case 'message.done':
        bubble.streaming = false;
        if (msg.finishReason === 'length') bubble.truncated = true;
        break;
      case 'error':
        markError(bubble, (msg.error as { message?: string } | undefined)?.message ?? '出错了');
        break;
      // message.start:占位气泡已在发起时建立,无需处理
    }
  }

  async function run(message: string, history: HistoryItem[]): Promise<void> {
    // 追加助手占位气泡,后续增量写到它身上
    turns.value.push({ role: 'assistant', content: '', streaming: true });
    const bubble = turns.value[turns.value.length - 1];

    controller = new AbortController();
    busy.value = true;
    state.value = 'streaming';

    try {
      const res = await fetch(resolveChatEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
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

    const history = buildHistory(); // 必须在 push 用户气泡之前取,避免把本次提问混入历史
    turns.value.push({ role: 'user', content: text });
    void run(text, history);
  }

  function cancel(): void {
    if (controller) {
      controller.abort();
      controller = null;
    }
    const bubble = currentBubble();
    if (bubble) bubble.streaming = false;
    busy.value = false;
    if (state.value === 'streaming') state.value = 'idle';
  }

  function reset(): void {
    cancel();
    turns.value = [];
  }

  function dispose(): void {
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  return { turns, state, busy, send, cancel, reset, dispose };
}
