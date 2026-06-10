<script setup lang="ts">
/**
 * LiveTicker —— 首页 Hero 右侧的「实时行情终端卡片」。
 *
 * 设计意图：与其放一个浮动的 logo，不如直接用 SDK 自己拉一组真实行情
 * （dogfooding）。访客第一屏看到的就是 SDK 的实际产物。
 *
 * 关键约束：
 * - SSR 安全：setup 阶段只用静态 fallback 数据 + 空时间戳，保证服务端 / 客户端
 *   首屏渲染完全一致，不触发 hydration mismatch；真正的网络请求只在 onMounted 里发。
 * - 永不「看起来坏掉」：网络失败 / 行情接口异常时，保留 fallback 快照并标记为「示例」。
 * - 中国习惯「红涨绿跌」，与品牌珊瑚红天然契合（见 custom.css 的 --quote-up/down）。
 * - 卡片在浅色主题下也是深色面板，制造 Bloomberg 终端式反差。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'

interface Row {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
  /** 本次刷新相对上次的瞬时方向，用于行背景闪烁 */
  flash?: 'up' | 'down' | null
}

type Status = 'loading' | 'live' | 'demo'

// 指数 + 蓝筹，一次 getSimpleQuotes 调用（腾讯源，CORS 开放，快且稳）
const SYMBOLS = ['sh000001', 'sz399001', 'sz399006', 'sh600519', 'sz000858', 'sh601318']

// 首屏 / 失败时的静态快照（明确标记为「示例」，不冒充实时数据）
const FALLBACK: Row[] = [
  { code: 'sh000001', name: '上证指数', price: 3421.55, change: 27.91, changePercent: 0.82 },
  { code: 'sz399001', name: '深证成指', price: 10876.4, change: -37.2, changePercent: -0.34 },
  { code: 'sz399006', name: '创业板指', price: 2215.18, change: 25.2, changePercent: 1.15 },
  { code: 'sh600519', name: '贵州茅台', price: 1689.5, change: 7.56, changePercent: 0.45 },
  { code: 'sz000858', name: '五粮液', price: 147.23, change: -1.55, changePercent: -1.04 },
  { code: 'sh601318', name: '中国平安', price: 54.3, change: 0.33, changePercent: 0.61 },
]

const { lang } = useData()
const isEn = computed(() => lang.value.toLowerCase().startsWith('en'))
const t = computed(() =>
  isEn.value
    ? { title: 'Live Market', loading: 'CONNECTING', live: 'LIVE', demo: 'SAMPLE', via: 'via stock-sdk · Tencent' }
    : { title: '实时行情', loading: '连接中', live: 'LIVE', demo: '示例', via: '由 stock-sdk 实时拉取 · 腾讯行情' }
)

const rows = ref<Row[]>(FALLBACK.map((r) => ({ ...r })))
const status = ref<Status>('loading')
const time = ref('') // 空串占位，挂载后才填，避免 SSR/CSR 不一致

const statusLabel = computed(() =>
  status.value === 'live' ? t.value.live : status.value === 'demo' ? t.value.demo : t.value.loading
)

// ---- 格式化（固定 en-US，避免 SSR/CSR 本地化差异）----
const priceFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
function fmtPrice(n: number): string {
  return Number.isFinite(n) ? priceFmt.format(n) : '--'
}
function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '--'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function dir(n: number): 'up' | 'down' | 'flat' {
  return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'
}
function tri(n: number): string {
  return n > 0 ? '▲' : n < 0 ? '▼' : '·'
}

function stampNow(): void {
  const d = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  time.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ---- SDK 加载：v1 文档站固定使用 stock-sdk@1.10.1 ----
const SDK_CDN_URL = 'https://unpkg.com/stock-sdk@1.10.1/dist/index.js'
let sdk: any = null
let sdkLoading: Promise<any> | null = null

async function loadSDK(): Promise<any> {
  if (sdk) return sdk
  if (sdkLoading) return sdkLoading
  sdkLoading = (async () => {
    const mod: any = await import(/* @vite-ignore */ SDK_CDN_URL)
    const StockSDK = mod.StockSDK || mod.default
    sdk = new StockSDK({ timeout: 8000, retry: { maxRetries: 1, baseDelay: 600 } })
    return sdk
  })()
  return sdkLoading
}

let flashTimer: ReturnType<typeof setTimeout> | null = null

async function refresh(): Promise<void> {
  try {
    const s = await loadSDK()
    const quotes: any[] = await s.getSimpleQuotes(SYMBOLS)
    if (!Array.isArray(quotes) || quotes.length === 0) throw new Error('empty')

    const prevByCode = new Map(rows.value.map((r) => [r.code, r]))
    const next: Row[] = SYMBOLS.map((sym, i) => {
      const q = quotes[i] ?? quotes.find((x) => String(x?.code ?? '').includes(sym.replace(/^[a-z]+/i, '')))
      if (!q) return prevByCode.get(sym) ?? FALLBACK[i]
      const price = Number(q.price)
      const prev = prevByCode.get(sym)
      let flash: Row['flash'] = null
      if (prev && Number.isFinite(price) && price !== prev.price) {
        flash = price > prev.price ? 'up' : 'down'
      }
      return {
        code: sym,
        name: q.name || prev?.name || FALLBACK[i].name,
        price,
        change: Number(q.change),
        changePercent: Number(q.changePercent),
        flash,
      }
    })

    rows.value = next
    status.value = 'live'
    stampNow()

    // 600ms 后清掉闪烁标记
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      rows.value = rows.value.map((r) => (r.flash ? { ...r, flash: null } : r))
    }, 650)
  } catch {
    // 失败：保留当前（或 fallback）行，标记为示例
    status.value = 'demo'
    stampNow()
  }
}

let timer: ReturnType<typeof setInterval> | null = null
const REFRESH_MS = 8000

function startPolling(): void {
  stopPolling()
  timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void refresh()
    }
  }, REFRESH_MS)
}
function stopPolling(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') void refresh()
}

onMounted(() => {
  void refresh()
  startPolling()
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stopPolling()
  if (flashTimer) clearTimeout(flashTimer)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibility)
  }
})
</script>

<template>
  <div class="ticker" :class="status">
    <div class="ticker__scan" aria-hidden="true"></div>

    <!-- 顶部状态栏 -->
    <div class="ticker__bar">
      <span class="ticker__status" :class="status">
        <span class="ticker__dot"></span>
        {{ statusLabel }}
      </span>
      <span class="ticker__sym">{{ t.title }}</span>
      <span class="ticker__time">{{ time || '--:--:--' }}</span>
    </div>

    <!-- 行情行 -->
    <div class="ticker__rows">
      <div
        v-for="r in rows"
        :key="r.code"
        class="trow"
        :class="r.flash ? 'flash-' + r.flash : ''"
      >
        <span class="trow__name">{{ r.name }}</span>
        <span class="trow__price">{{ fmtPrice(r.price) }}</span>
        <span class="trow__chg" :class="dir(r.change)">
          <span class="trow__tri">{{ tri(r.change) }}</span>{{ fmtPct(r.changePercent) }}
        </span>
      </div>
    </div>

    <!-- 脚注 -->
    <div class="ticker__foot">
      <span class="ticker__via">{{ t.via }}</span>
    </div>
  </div>
</template>

<style scoped>
.ticker {
  position: relative;
  width: 100%;
  margin: 0 auto;
  padding: 14px 16px 12px;
  border-radius: 16px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(248, 113, 113, 0.1) 0%, transparent 55%),
    linear-gradient(180deg, var(--term-bg-2) 0%, var(--term-bg) 100%);
  border: 1px solid var(--term-border);
  box-shadow:
    0 24px 60px -24px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset,
    0 1px 0 rgba(255, 255, 255, 0.04) inset;
  color: var(--term-text);
  font-family: var(--font-mono);
  overflow: hidden;
  isolation: isolate;
}

/* 背景细网格纹理 */
.ticker::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--term-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--term-grid) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
  z-index: 0;
}

/* 顶部缓慢扫描高光线 */
.ticker__scan {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(248, 113, 113, 0.55),
    transparent
  );
  animation: scan 5.5s ease-in-out infinite;
  z-index: 1;
}
@keyframes scan {
  0% { transform: translateY(0); opacity: 0; }
  12% { opacity: 1; }
  50% { transform: translateY(232px); opacity: 0.7; }
  88% { opacity: 1; }
  100% { transform: translateY(0); opacity: 0; }
}

.ticker__bar,
.ticker__rows,
.ticker__foot {
  position: relative;
  z-index: 2;
}

/* 状态栏 */
.ticker__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 11px;
  margin-bottom: 8px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 0.72rem;
}
.ticker__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--vp-c-brand-1);
}
.ticker__status.demo {
  color: var(--term-text-dim);
}
.ticker__status.loading {
  color: #fbbf24;
}
.ticker__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px 1px currentColor;
  animation: blip 1.6s ease-in-out infinite;
}
.ticker__status.demo .ticker__dot {
  animation: none;
  box-shadow: none;
}
@keyframes blip {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.82); }
}
.ticker__sym {
  flex: 1;
  color: var(--term-text-dim);
  letter-spacing: 0.04em;
}
.ticker__time {
  color: var(--term-text-dim);
  font-variant-numeric: tabular-nums;
}

/* 行情行 */
.ticker__rows {
  display: flex;
  flex-direction: column;
}
.trow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  column-gap: 14px;
  padding: 7px 8px;
  margin: 0 -8px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-variant-numeric: tabular-nums;
}
.trow + .trow {
  border-top: 1px solid rgba(255, 255, 255, 0.045);
}
.trow__name {
  font-family: var(--font-display);
  color: var(--term-text);
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trow__price {
  text-align: right;
  color: var(--term-text);
  font-weight: 500;
}
.trow__chg {
  min-width: 84px;
  text-align: right;
  font-weight: 600;
}
.trow__tri {
  margin-right: 3px;
  font-size: 0.7em;
}
.trow__chg.up { color: var(--quote-up); }
.trow__chg.down { color: var(--quote-down); }
.trow__chg.flat { color: var(--term-text-dim); }

/* 价格跳动闪烁 */
.trow.flash-up { animation: flashUp 0.65s ease-out; }
.trow.flash-down { animation: flashDown 0.65s ease-out; }
@keyframes flashUp {
  0% { background: color-mix(in srgb, var(--quote-up) 26%, transparent); }
  100% { background: transparent; }
}
@keyframes flashDown {
  0% { background: color-mix(in srgb, var(--quote-down) 26%, transparent); }
  100% { background: transparent; }
}

/* 脚注 */
.ticker__foot {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 0.68rem;
  color: var(--term-text-dim);
  letter-spacing: 0.02em;
}

@media (prefers-reduced-motion: reduce) {
  .ticker__scan,
  .ticker__dot,
  .trow.flash-up,
  .trow.flash-down {
    animation: none !important;
  }
}
</style>
