/**
 * 文档问答 agent 的 WebSocket 客户端(组合式)。
 *
 * 对接 api-worker 的 /api/llm/chat 协议(带 turnId 版):
 *   C→S: { type:'chat', message, history? } | { type:'cancel' } | { type:'ping' }
 *   S→C: session.ready
 *        | { type:'message.start', turnId }
 *        | { type:'message.delta', turnId, text }
 *        | { type:'message.done', turnId, usage? }
 *        | { type:'cancelled', turnId }
 *        | { type:'error', turnId?, error:{message} }
 *        | pong
 *
 * turnId 用途:服务端可能并发处理多轮(新提问会中止旧回答),客户端用 turnId
 * 把每条 delta/done/cancelled 精确归属到对应的助手气泡,避免串台。
 *
 * 设计:懒连接(首次发送才建 WS)、单飞(新提问中止上一条)、SSR 安全(仅浏览器调用)。
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
  /** 该回答是否因长度限制被截断(finish_reason === 'length') */
  truncated?: boolean;
  /** 服务端分配的轮次 ID(仅助手气泡有),用于消息归属 */
  turnId?: string;
}

export type ConnState = 'idle' | 'connecting' | 'ready' | 'error';

interface UseChatSocket {
  turns: Ref<ChatTurn[]>;
  state: Ref<ConnState>;
  /** 是否正在等待/接收一条回答(用于禁用输入、显示停止按钮) */
  busy: Ref<boolean>;
  send: (message: string) => void;
  cancel: () => void;
  reset: () => void;
  dispose: () => void;
}

const MAX_HISTORY_TURNS = 6; // 发给服务端的历史轮数上限(与后端 MAX_HISTORY_MESSAGES 呼应)

export function useChatSocket(): UseChatSocket {
  const turns = ref<ChatTurn[]>([]);
  const state = ref<ConnState>('idle');
  const busy = ref(false);

  let ws: WebSocket | null = null;
  /** 等待连接就绪后要发送的提问(懒连接期间缓存) */
  let pending: string | null = null;
  /** 当前期待回答的轮次:只有匹配它的 server 消息才被采纳 */
  let activeTurnId: string | null = null;

  function buildHistory(): { role: 'user' | 'assistant'; content: string }[] {
    return turns.value
      .filter((t) => t.content && !t.streaming && !t.error)
      .slice(-MAX_HISTORY_TURNS * 2)
      .map((t) => ({ role: t.role, content: t.content }));
  }

  /** 找到某 turnId 对应的助手气泡(找不到返回 undefined)。 */
  function findTurn(turnId: string | undefined): ChatTurn | undefined {
    if (!turnId) return undefined;
    for (let i = turns.value.length - 1; i >= 0; i--) {
      if (turns.value[i].turnId === turnId) return turns.value[i];
    }
    return undefined;
  }

  function ensureSocket(): void {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    state.value = 'connecting';
    ws = new WebSocket(resolveChatEndpoint());

    ws.onopen = () => {
      /* 等 session.ready 再标记 ready */
    };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      } catch {
        return;
      }
      handleMessage(msg);
    };

    ws.onerror = () => {
      state.value = 'error';
      finishActiveWithError('连接出错,请稍后重试。');
      busy.value = false;
    };

    ws.onclose = () => {
      if (state.value !== 'error') state.value = 'idle';
      finishActiveWithError('连接已断开。');
      busy.value = false;
      ws = null;
    };
  }

  function handleMessage(msg: Record<string, unknown>): void {
    const turnId = typeof msg.turnId === 'string' ? msg.turnId : undefined;

    switch (msg.type) {
      case 'session.ready':
        state.value = 'ready';
        if (pending !== null) {
          flush(pending);
          pending = null;
        }
        break;

      case 'message.start': {
        // 服务端确认本轮开始:把 turnId 绑到最近一个待填充的助手占位
        if (turnId) {
          activeTurnId = turnId;
          const placeholder = turns.value[turns.value.length - 1];
          if (placeholder && placeholder.role === 'assistant' && placeholder.streaming && !placeholder.turnId) {
            placeholder.turnId = turnId;
          }
        }
        break;
      }

      case 'message.delta': {
        // 只采纳当前活跃轮次的增量;过期轮次(已被新提问取代)的 delta 丢弃
        if (turnId && turnId !== activeTurnId) break;
        const text = typeof msg.text === 'string' ? msg.text : '';
        const target = findTurn(turnId) ?? currentStreamingTurn();
        if (target) target.content += text;
        break;
      }

      case 'message.done': {
        const target = findTurn(turnId) ?? currentStreamingTurn();
        if (target) {
          target.streaming = false;
          if (msg.finishReason === 'length') target.truncated = true;
        }
        if (!turnId || turnId === activeTurnId) {
          activeTurnId = null;
          busy.value = false;
        }
        break;
      }

      case 'cancelled': {
        const target = findTurn(turnId) ?? currentStreamingTurn();
        if (target) target.streaming = false;
        if (!turnId || turnId === activeTurnId) {
          activeTurnId = null;
          busy.value = false;
        }
        break;
      }

      case 'error': {
        const m = (msg.error as { message?: string })?.message ?? '出错了';
        const target = findTurn(turnId) ?? currentStreamingTurn();
        markError(target, m);
        if (!turnId || turnId === activeTurnId) {
          activeTurnId = null;
          busy.value = false;
        }
        break;
      }

      case 'pong':
        break;
    }
  }

  /** 兜底:无 turnId 时退回到"最后一个流式中的助手气泡"。 */
  function currentStreamingTurn(): ChatTurn | undefined {
    const last = turns.value[turns.value.length - 1];
    return last && last.role === 'assistant' && last.streaming ? last : undefined;
  }

  /** 真正把一条提问写到 socket(连接已就绪时)。 */
  function flush(message: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pending = message;
      return;
    }
    ws.send(JSON.stringify({ type: 'chat', message, history: buildHistory() }));
    // 追加助手占位(turnId 待 message.start 回填)
    turns.value.push({ role: 'assistant', content: '', streaming: true });
  }

  function markError(target: ChatTurn | undefined, message: string): void {
    if (target && target.role === 'assistant' && target.streaming) {
      target.streaming = false;
      target.error = true;
      if (!target.content) target.content = `⚠️ ${message}`;
    }
  }

  /** 连接出错/断开时,把当前活跃(或最后一个流式)气泡标记为错误。 */
  function finishActiveWithError(message: string): void {
    const target = findTurn(activeTurnId ?? undefined) ?? currentStreamingTurn();
    markError(target, message);
    activeTurnId = null;
  }

  function send(message: string): void {
    const text = message.trim();
    if (!text || busy.value) return;

    turns.value.push({ role: 'user', content: text });
    busy.value = true;

    ensureSocket();
    if (state.value === 'ready' && ws?.readyState === WebSocket.OPEN) {
      flush(text);
    } else {
      pending = text;
    }
  }

  function cancel(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cancel' }));
    }
    // 本地立即收尾当前流式气泡(服务端也会回 cancelled,handleMessage 幂等处理)
    const target = findTurn(activeTurnId ?? undefined) ?? currentStreamingTurn();
    if (target) target.streaming = false;
    activeTurnId = null;
    busy.value = false;
  }

  function reset(): void {
    cancel();
    turns.value = [];
  }

  function dispose(): void {
    pending = null;
    activeTurnId = null;
    if (ws) {
      try {
        ws.close();
      } catch {
        /* noop */
      }
      ws = null;
    }
  }

  return { turns, state, busy, send, cancel, reset, dispose };
}
