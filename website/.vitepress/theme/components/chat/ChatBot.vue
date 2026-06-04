<script setup lang="ts">
/**
 * ChatBot —— 文档站全局悬浮问答助手(可拖拽 / 可缩放 / 可最大化)。
 *
 * 入口:右下角悬浮按钮,点击展开聊天浮窗。挂在 Layout 的 #layout-bottom,
 * 每个页面都有。后端对接 api-worker 的 /api/llm/chat(SSE over POST)。
 *
 * 交互对标 ChatGPT / Claude / Intercom:
 * - 拖拽标题栏移动窗口
 * - 拖拽左/上边缘及左上角缩放
 * - 最大化 / 还原
 * - 位置与尺寸记忆(localStorage)
 * - 代码块深色高对比 + 复制按钮
 * - 移动端自动全屏
 *
 * 约束:SSR 安全(window 相关只在 onMounted 后用);每次提问发起一个 POST 流式请求。
 */
import { ref, computed, nextTick, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useData } from 'vitepress'
import { useChatStream } from './useChatStream'
import { renderMarkdown } from './miniMarkdown'

const { lang } = useData()
const isEn = computed(() => lang.value.toLowerCase().startsWith('en'))

const open = ref(false)
const maximized = ref(false)
const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)

const { turns, busy, send, cancel, reset, dispose } = useChatStream()

/* ── 尺寸 / 位置状态(可拖拽、可缩放、可记忆) ── */
const MIN_W = 360
const MIN_H = 420
const DEFAULT_W = 560
const DEFAULT_H = 680
const MARGIN = 20
const STORE_KEY = 'stock-sdk-chat-rect-v2'

// rect 用「右下角锚定」:right/bottom 距视口的距离,w/h 尺寸。
// 这样窗口默认贴右下,移动/缩放时数值直观。
const rect = reactive({ right: MARGIN, bottom: MARGIN + 64, w: DEFAULT_W, h: DEFAULT_H })

const t = computed(() =>
  isEn.value
    ? {
        title: 'stock-sdk Assistant',
        subtitle: 'Ask anything about stock-sdk usage',
        placeholder: 'Ask about stock-sdk usage…',
        send: 'Send',
        stop: 'Stop',
        clear: 'New chat',
        greeting:
          "Hi! I'm the stock-sdk docs assistant. Ask me about any method, parameter, or usage — answers are grounded in the official docs.",
        disclaimer: 'Answers are based on official docs and may be imperfect. Market data is delayed and not investment advice.',
        suggestions: [
          'How to use getHistoryKline? What is the default adjust?',
          'US stock K-line symbol format?',
          'How to fetch all A-share quotes at once?',
        ],
        openAria: 'Open stock-sdk assistant',
        closeAria: 'Close',
        maximize: 'Maximize',
        restore: 'Restore',
        copied: 'Copied',
      }
    : {
        title: 'stock-sdk 助手',
        subtitle: '关于 stock-sdk 用法,问我',
        placeholder: '问点 stock-sdk 的用法…',
        send: '发送',
        stop: '停止',
        clear: '新对话',
        greeting:
          '你好!我是 stock-sdk 文档助手。关于任何方法、参数、用法都可以问我 —— 回答基于官方文档。',
        disclaimer: '回答基于官方文档,可能不完美。行情数据有延迟,不构成投资建议。',
        suggestions: [
          'getHistoryKline 怎么用?复权默认值是什么?',
          '美股 K 线的代码格式是什么?',
          '怎么一次性获取全部 A 股行情?',
        ],
        openAria: '打开 stock-sdk 助手',
        closeAria: '关闭',
        maximize: '最大化',
        restore: '还原',
        copied: '已复制',
      },
)

/* ── 浮窗样式(随 rect / maximized 变化) ── */
const panelStyle = computed(() => {
  if (maximized.value) {
    return {
      right: '0px',
      bottom: '0px',
      top: '0px',
      left: '0px',
      width: 'auto',
      height: 'auto',
      borderRadius: '0px',
    }
  }
  return {
    right: `${rect.right}px`,
    bottom: `${rect.bottom}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
  }
})

function clampRect() {
  if (typeof window === 'undefined') return
  const maxW = window.innerWidth - MARGIN * 2
  const maxH = window.innerHeight - MARGIN * 2
  rect.w = Math.max(MIN_W, Math.min(rect.w, maxW))
  rect.h = Math.max(MIN_H, Math.min(rect.h, maxH))
  // 保证窗口不被拖出视口
  rect.right = Math.max(0, Math.min(rect.right, window.innerWidth - rect.w))
  rect.bottom = Math.max(0, Math.min(rect.bottom, window.innerHeight - rect.h))
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(rect))
  } catch {
    /* noop */
  }
}

function restoreRect() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && typeof saved.w === 'number') {
        Object.assign(rect, saved)
      }
    }
  } catch {
    /* noop */
  }
  clampRect()
}

/* ── 拖拽移动(标题栏) ── */
let dragStart: { x: number; y: number; right: number; bottom: number } | null = null

function onHeaderPointerDown(e: PointerEvent) {
  if (maximized.value) return
  const target = e.target as HTMLElement
  if (target.closest('.csb-icon-btn')) return // 点按钮不触发拖拽
  dragStart = { x: e.clientX, y: e.clientY, right: rect.right, bottom: rect.bottom }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  document.body.style.userSelect = 'none'
}
function onDragMove(e: PointerEvent) {
  if (!dragStart) return
  // 鼠标右移 → right 减小;下移 → bottom 减小
  rect.right = dragStart.right - (e.clientX - dragStart.x)
  rect.bottom = dragStart.bottom - (e.clientY - dragStart.y)
  clampRect()
}
function onDragEnd() {
  dragStart = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  document.body.style.userSelect = ''
  persist()
}

/* ── 缩放(拖拽左/上/左上手柄) ── */
let resizeStart:
  | { x: number; y: number; w: number; h: number; right: number; bottom: number; dir: string }
  | null = null

function onResizePointerDown(e: PointerEvent, dir: 'left' | 'top' | 'corner') {
  if (maximized.value) return
  e.stopPropagation()
  resizeStart = { x: e.clientX, y: e.clientY, w: rect.w, h: rect.h, right: rect.right, bottom: rect.bottom, dir }
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
  document.body.style.userSelect = 'none'
}
function onResizeMove(e: PointerEvent) {
  if (!resizeStart) return
  const dx = e.clientX - resizeStart.x
  const dy = e.clientY - resizeStart.y
  // 窗口右下角固定(right/bottom 不变),拖左边缘改宽、拖上边缘改高
  if (resizeStart.dir === 'left' || resizeStart.dir === 'corner') {
    rect.w = resizeStart.w - dx
  }
  if (resizeStart.dir === 'top' || resizeStart.dir === 'corner') {
    rect.h = resizeStart.h - dy
  }
  clampRect()
}
function onResizeEnd() {
  resizeStart = null
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
  document.body.style.userSelect = ''
  persist()
}

/* ── 基本动作 ── */
function toggle() {
  open.value = !open.value
}
function toggleMax() {
  maximized.value = !maximized.value
}

function scrollToBottom() {
  nextTick(() => {
    const el = listEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/* ── 输入框高度自适应:单行起,随内容长高,封顶后内部滚动 ── */
function autoGrow() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}
function resetInputHeight() {
  const el = inputEl.value
  if (el) el.style.height = ''
}

function submit() {
  const text = draft.value.trim()
  if (!text || busy.value) return
  send(text)
  draft.value = ''
  resetInputHeight()
  scrollToBottom()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function useSuggestion(s: string) {
  draft.value = s
  submit()
}

/* ── 代码块「复制」按钮:事件委托 ── */
function onListClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('.csb-copy') as HTMLElement | null
  if (!btn) return
  const wrap = btn.closest('.csb-code')
  const codeEl = wrap?.querySelector('code')
  if (!codeEl) return
  const text = codeEl.textContent ?? ''
  // 链上整条都用可选链:非安全上下文(HTTP / 旧浏览器)下 clipboard 可能是 undefined,
  // 写成 `?.writeText().then` 会因 undefined.then 而 TypeError 崩。
  navigator.clipboard?.writeText(text)?.then(() => {
    btn.classList.add('csb-copied')
    window.setTimeout(() => btn.classList.remove('csb-copied'), 1400)
  })
}

watch(
  () => turns.value.map((m) => m.content).join('|'),
  () => scrollToBottom(),
)

onMounted(() => {
  restoreRect()
  window.addEventListener('resize', clampRect)
})
onUnmounted(() => {
  dispose()
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', clampRect)
  // 兜底:若组件在拖拽 / 缩放进行中被卸载(如 VitePress 切页),pointermove / pointerup
  // 还挂在 window 上,会造成全局监听器泄漏 + 之后误触发。同名 listener removeEventListener
  // 即便没注册过也是 no-op。
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
})
</script>

<template>
  <div class="csb-root">
    <!-- 悬浮入口按钮 -->
    <button v-show="!open" class="csb-fab" :aria-label="t.openAria" @click="toggle">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      <span class="csb-fab-label">{{ isEn ? 'Ask AI' : 'AI 提问' }}</span>
    </button>

    <!-- 聊天浮窗 -->
    <transition name="csb-pop">
      <section
        v-if="open"
        ref="panelEl"
        class="csb-panel"
        :class="{ 'csb-max': maximized }"
        :style="panelStyle"
        role="dialog"
        :aria-label="t.title"
      >
        <!-- 缩放手柄(非最大化时) -->
        <template v-if="!maximized">
          <div class="csb-rz csb-rz-left" @pointerdown="(e) => onResizePointerDown(e, 'left')"></div>
          <div class="csb-rz csb-rz-top" @pointerdown="(e) => onResizePointerDown(e, 'top')"></div>
          <div class="csb-rz csb-rz-corner" @pointerdown="(e) => onResizePointerDown(e, 'corner')"></div>
        </template>

        <header class="csb-head" @pointerdown="onHeaderPointerDown">
          <div class="csb-head-info">
            <span class="csb-dot" aria-hidden="true"></span>
            <div class="csb-head-text">
              <div class="csb-title">{{ t.title }}</div>
              <div class="csb-sub">{{ t.subtitle }}</div>
            </div>
          </div>
          <div class="csb-head-actions">
            <button v-if="turns.length" class="csb-icon-btn" :title="t.clear" @click="reset">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button class="csb-icon-btn" :title="maximized ? t.restore : t.maximize" @click="toggleMax">
              <svg v-if="!maximized" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
            </button>
            <button class="csb-icon-btn" :aria-label="t.closeAria" @click="toggle">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </header>

        <div ref="listEl" class="csb-list" @click="onListClick">
          <!-- 欢迎 + 建议 -->
          <div v-if="!turns.length" class="csb-welcome">
            <div class="csb-welcome-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </div>
            <p class="csb-greeting">{{ t.greeting }}</p>
            <div class="csb-suggestions">
              <button v-for="(s, i) in t.suggestions" :key="i" class="csb-suggestion" @click="useSuggestion(s)">
                <span>{{ s }}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          <!-- 对话 -->
          <div
            v-for="(m, i) in turns"
            :key="i"
            class="csb-msg"
            :class="m.role === 'user' ? 'csb-msg-user' : 'csb-msg-bot'"
          >
            <div v-if="m.role === 'user'" class="csb-bubble csb-bubble-user">{{ m.content }}</div>
            <div v-else class="csb-bubble csb-bubble-bot" :class="{ 'csb-err': m.error }">
              <div v-if="m.content" class="csb-md" v-html="renderMarkdown(m.content)"></div>
              <span v-if="m.streaming && !m.content" class="csb-typing" aria-hidden="true"><i></i><i></i><i></i></span>
              <span v-else-if="m.streaming" class="csb-cursor" aria-hidden="true"></span>
              <div v-if="m.truncated" class="csb-truncated">{{ isEn ? 'Response truncated (length limit). Ask "continue" for more.' : '回答因长度限制被截断,可追问「继续」。' }}</div>
            </div>
          </div>
        </div>

        <footer class="csb-foot">
          <div class="csb-input-row">
            <textarea
              ref="inputEl"
              v-model="draft"
              class="csb-input"
              rows="1"
              :placeholder="t.placeholder"
              @input="autoGrow"
              @keydown="onKeydown"
            ></textarea>
            <button v-if="busy" class="csb-send csb-stop" :title="t.stop" @click="cancel">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
            <button v-else class="csb-send" :disabled="!draft.trim()" :title="t.send" @click="submit">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
          <p class="csb-disclaimer">{{ t.disclaimer }}</p>
        </footer>
      </section>
    </transition>
  </div>
</template>

<style scoped>
.csb-root {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 60;
}

/* ── 悬浮按钮 ── */
.csb-fab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 50px;
  border: none;
  border-radius: 999px;
  background: var(--accent-gradient, linear-gradient(135deg, #f87171 0%, #fb923c 100%));
  color: #fff;
  font-weight: 600;
  font-size: 14.5px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(248, 113, 113, 0.42);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.csb-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(248, 113, 113, 0.52);
}
.csb-fab-label {
  white-space: nowrap;
}

/* ── 浮窗 ── */
.csb-panel {
  position: fixed;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.26);
  overflow: hidden;
}
.csb-panel.csb-max {
  border-radius: 0;
  border: none;
}

/* 缩放手柄 */
.csb-rz {
  position: absolute;
  z-index: 5;
}
.csb-rz-left {
  left: 0;
  top: 0;
  width: 7px;
  height: 100%;
  cursor: ew-resize;
}
.csb-rz-top {
  top: 0;
  left: 0;
  width: 100%;
  height: 7px;
  cursor: ns-resize;
}
.csb-rz-corner {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 6;
}

/* ── 头部(可拖拽) ── */
.csb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px 13px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: grab;
  touch-action: none;
  flex-shrink: 0;
}
.csb-head:active {
  cursor: grabbing;
}
.csb-head-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.csb-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
  flex-shrink: 0;
}
.csb-head-text {
  min-width: 0;
}
.csb-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}
.csb-sub {
  font-size: 12px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.csb-head-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.csb-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.csb-icon-btn:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

/* ── 消息列表 ── */
.csb-list {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.csb-welcome {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: auto 0;
}
.csb-welcome-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--accent-gradient, linear-gradient(135deg, #f87171 0%, #fb923c 100%));
  box-shadow: 0 6px 18px rgba(248, 113, 113, 0.32);
}
.csb-greeting {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}
.csb-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.csb-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  padding: 11px 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.csb-suggestion:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  transform: translateX(2px);
}
.csb-suggestion svg {
  flex-shrink: 0;
  color: var(--vp-c-text-3);
}

.csb-msg {
  display: flex;
}
.csb-msg-user {
  justify-content: flex-end;
}
.csb-msg-bot {
  justify-content: flex-start;
}
.csb-bubble {
  max-width: 90%;
  padding: 11px 14px;
  border-radius: 14px;
  font-size: 14.5px;
  line-height: 1.65;
  word-break: break-word;
}
.csb-bubble-user {
  background: var(--accent-gradient, linear-gradient(135deg, #f87171 0%, #fb923c 100%));
  color: #fff;
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}
.csb-bubble-bot {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-bottom-left-radius: 4px;
}
.csb-err {
  border-color: #ef4444;
  color: #ef4444;
}

/* 截断提示 */
.csb-truncated {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 流式光标 / 思考中三点 */
.csb-cursor {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--vp-c-brand-1);
  animation: csb-blink 1s steps(2, start) infinite;
}
@keyframes csb-blink {
  to {
    visibility: hidden;
  }
}
.csb-typing {
  display: inline-flex;
  gap: 4px;
  padding: 2px 0;
}
.csb-typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  animation: csb-bounce 1.2s infinite ease-in-out;
}
.csb-typing i:nth-child(2) {
  animation-delay: 0.18s;
}
.csb-typing i:nth-child(3) {
  animation-delay: 0.36s;
}
@keyframes csb-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

/* ── markdown 渲染(气泡内) ── */
.csb-md :deep(p) {
  margin: 0 0 9px;
}
.csb-md :deep(p:last-child) {
  margin-bottom: 0;
}
.csb-md :deep(h3),
.csb-md :deep(h4),
.csb-md :deep(h5) {
  margin: 12px 0 7px;
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.4;
}
.csb-md :deep(ul),
.csb-md :deep(ol) {
  margin: 7px 0;
  padding-left: 20px;
}
.csb-md :deep(li) {
  margin: 4px 0;
}
/* 行内 code */
.csb-md :deep(:not(pre) > code) {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12.5px;
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}
.csb-md :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.csb-md :deep(strong) {
  font-weight: 700;
}
.csb-md :deep(table) {
  border-collapse: collapse;
  margin: 9px 0;
  font-size: 12.5px;
  width: 100%;
  display: block;
  overflow-x: auto;
}
.csb-md :deep(th),
.csb-md :deep(td) {
  border: 1px solid var(--vp-c-divider);
  padding: 6px 9px;
  text-align: left;
  white-space: nowrap;
}
.csb-md :deep(th) {
  background: var(--vp-c-bg-soft);
  font-weight: 600;
}

/* ── 代码块(深色面板,明暗主题下都高对比) ── */
.csb-md :deep(.csb-code) {
  margin: 9px 0;
  border-radius: 10px;
  overflow: hidden;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.csb-md :deep(.csb-code-bar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 12px;
  background: #161b22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.csb-md :deep(.csb-code-lang) {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #8b95a1;
}
.csb-md :deep(.csb-copy) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8b95a1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.csb-md :deep(.csb-copy:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #e6edf3;
}
.csb-md :deep(.csb-copy .csb-ico-check) {
  display: none;
}
.csb-md :deep(.csb-copy.csb-copied) {
  color: #3fb950;
}
.csb-md :deep(.csb-copy.csb-copied .csb-ico-copy) {
  display: none;
}
.csb-md :deep(.csb-copy.csb-copied .csb-ico-check) {
  display: inline-flex;
}
.csb-md :deep(.csb-code pre) {
  margin: 0;
  padding: 13px 14px;
  overflow-x: auto;
}
.csb-md :deep(.csb-code code) {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  line-height: 1.6;
  color: #e6edf3; /* 高对比浅色文字,固定深底,明暗主题都清晰 */
  background: transparent;
  padding: 0;
  white-space: pre;
}

/* ── 输入区 ── */
.csb-foot {
  border-top: 1px solid var(--vp-c-divider);
  padding: 12px 14px 10px;
  background: var(--vp-c-bg);
  flex-shrink: 0;
}
.csb-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.csb-input {
  flex: 1;
  box-sizing: border-box;
  resize: none;
  max-height: 140px;
  min-height: 44px;
  padding: 11px 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 14.5px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.csb-input:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}
.csb-send {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: var(--vp-c-brand-2, #ef4444);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s, transform 0.1s;
}
.csb-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.csb-send:not(:disabled):hover {
  background: var(--vp-c-brand-3, #dc2626);
  transform: scale(1.05);
}
.csb-stop {
  background: var(--vp-c-text-3);
}
.csb-disclaimer {
  margin: 8px 2px 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--vp-c-text-3);
}

/* ── 弹出动画 ── */
.csb-pop-enter-active,
.csb-pop-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
  transform-origin: bottom right;
}
.csb-pop-enter-from,
.csb-pop-leave-to {
  transform: scale(0.94) translateY(10px);
  opacity: 0;
}

/* ── 移动端:自动全屏,关闭拖拽/缩放 ── */
@media (max-width: 560px) {
  .csb-root {
    right: 16px;
    bottom: 16px;
  }
  .csb-panel {
    right: 0 !important;
    bottom: 0 !important;
    top: 0 !important;
    left: 0 !important;
    width: auto !important;
    height: auto !important;
    border-radius: 0 !important;
    border: none !important;
  }
  .csb-rz {
    display: none !important;
  }
  .csb-head {
    cursor: default;
  }
}
</style>
