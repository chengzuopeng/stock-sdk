<script setup lang="ts">
/**
 * Playground v2 —— 在浏览器里直接调用 stock-sdk、即时查看返回结果。
 *
 * 架构（见 Playground TD 文档）：
 * - 方法目录：src/spec/methods.ts（CLI/MCP 的 SSOT）经 ./playground/derive.ts 派生，
 *   不再像 v1 那样手写 ~1900 行 method 清单
 * - 执行：./playground/runner.ts 通用 argShape 组装（walker 复用 spec/resolve）
 * - 代码示例：./playground/codegen.ts 由当前参数实时生成
 * - 本组件只负责壳层 UI：侧边栏 / 搜索 / 市场芯片 / 表单 / 结果区 / 配置抽屉 / 深链
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useData } from 'vitepress'
import { Icon } from '@iconify/vue'
import { codeToHtml } from 'shiki'

import { categories, marketChips } from './playground/categories'
import { playgroundMethods, methodsById } from './playground/derive'
import { runMethod, findMissingRequired } from './playground/runner'
import { buildCode } from './playground/codegen'
import { DEFAULT_VALUES } from './playground/overrides'
import type { PlaygroundMethod, MarketKey } from './playground/types'

const { isDark, theme, lang } = useData()
const isEn = computed(() => lang.value.toLowerCase().startsWith('en'))

// ===== i18n（UI chrome 双语；方法描述来自 spec，Phase 1 为中文） =====
const t = computed(() =>
  isEn.value
    ? {
        apiMethods: 'API Methods',
        searchPlaceholder: 'Search… (⌘K)',
        filterByMarket: 'Filter by market',
        noMatch: 'No matching methods',
        viewCode: 'Show code',
        hideCode: 'Hide code',
        send: '🚀 Run',
        sending: 'Running...',
        clear: 'Clear',
        hint: '⌘K search · ⌘↵ run',
        result: 'Result',
        success: '✓ OK',
        failed: '✕ Failed',
        duration: 'Time',
        count: 'Count',
        copy: '📋 Copy',
        copied: '✅ Copied to clipboard',
        copyFailed: '⚠️ Copy failed, select manually',
        emptyResult: 'Click "Run" to start...',
        loading: 'Loading...',
        sdkFailed: 'Failed to load SDK. Check network and refresh.',
        sdkNotReady: 'Error: SDK not loaded. Check network and refresh.',
        missingRequired: (f: string) => `Error: required field "${f}" is empty`,
        methodsNav: 'Methods',
        sdkConfig: 'SDK Config',
        sdkConfigTitle: 'SDK Runtime Config',
        drawerHint:
          'Click "Apply" to rebuild the SDK instance with the new config (persisted to localStorage). Great for demoing retry / rate-limit / circuit-breaker.',
        general: 'General',
        timeout: 'Timeout (ms)',
        retry: 'Retry',
        maxRetries: 'Max retries',
        baseDelay: 'Base delay (ms)',
        rateLimitTitle: 'Enable rateLimit',
        rps: 'Requests / sec',
        maxBurst: 'Bucket size',
        cbTitle: 'Enable circuitBreaker',
        failureThreshold: 'Failure threshold',
        resetTimeout: 'Reset timeout (ms)',
        resetDefault: 'Reset',
        cancel: 'Cancel',
        apply: 'Apply',
        applied: '✅ SDK config applied, instance rebuilt',
        applyFailed: '⚠️ SDK rebuild failed: ',
        mounted: '💡 window.sdk is available in DevTools console',
        truncated: (total: number, n: number) =>
          `/* ⚠️ ${total} rows total; rendered first ${n} to keep the page responsive.\n   Full data: window.__playgroundLastResult */`,
      }
    : {
        apiMethods: 'API 方法',
        searchPlaceholder: '搜索方法… (⌘K)',
        filterByMarket: '按市场过滤',
        noMatch: '没有符合条件的方法',
        viewCode: '查看示例',
        hideCode: '隐藏代码',
        send: '🚀 发送请求',
        sending: '请求中...',
        clear: '清空',
        hint: '⌘K 搜索 · ⌘↵ 发送',
        result: '返回结果',
        success: '✓ 成功',
        failed: '✕ 失败',
        duration: '耗时',
        count: '数量',
        copy: '📋 复制',
        copied: '✅ 已复制到剪贴板',
        copyFailed: '⚠️ 复制失败，请手动选择复制',
        emptyResult: '点击「发送请求」按钮开始测试...',
        loading: '加载中...',
        sdkFailed: '加载 SDK 失败，请检查网络连接或刷新页面重试',
        sdkNotReady: '错误: SDK 未加载，请确保网络连接正常后刷新页面',
        missingRequired: (f: string) => `错误: 必填参数 "${f}" 未填写`,
        methodsNav: '方法',
        sdkConfig: 'SDK 配置',
        sdkConfigTitle: 'SDK 运行时配置',
        drawerHint: '修改后点击「应用」会用新配置重建 SDK 实例并保存到 localStorage。适合演示重试 / 限流 / 熔断等高级特性。',
        general: '通用',
        timeout: '请求超时 (ms)',
        retry: '重试 (retry)',
        maxRetries: '最大重试次数',
        baseDelay: '初始退避 (ms)',
        rateLimitTitle: '启用限流 (rateLimit)',
        rps: '每秒请求数',
        maxBurst: '令牌桶容量',
        cbTitle: '启用熔断器 (circuitBreaker)',
        failureThreshold: '失败阈值',
        resetTimeout: '熔断恢复时间 (ms)',
        resetDefault: '重置默认',
        cancel: '取消',
        apply: '应用',
        applied: '✅ SDK 配置已应用并重建实例',
        applyFailed: '⚠️ SDK 重建失败: ',
        mounted: '💡 已挂载 window.sdk，可在浏览器控制台直接调试 SDK',
        truncated: (total: number, n: number) =>
          `/* ⚠️ 共 ${total} 条数据，仅渲染前 ${n} 条以避免页面卡顿。\n   完整数据已挂载到 window.__playgroundLastResult */`,
      }
)

// ===== 大结果集渲染保护 =====
const MAX_RENDER_ITEMS = 200

function formatResultForRender(data: unknown): string {
  if (!Array.isArray(data) || data.length <= MAX_RENDER_ITEMS) {
    return JSON.stringify(data, null, 2)
  }
  const head = data.slice(0, MAX_RENDER_ITEMS)
  return JSON.stringify(head, null, 2) + '\n\n' + t.value.truncated(data.length, MAX_RENDER_ITEMS)
}

// ===== 代码示例高亮 =====
const highlightedCode = ref('')
async function updateHighlightedCode(code: string) {
  try {
    highlightedCode.value = await codeToHtml(code, {
      lang: 'typescript',
      theme: 'github-dark',
    })
  } catch {
    highlightedCode.value = `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  }
}

// ===== 侧边栏：搜索 + 市场芯片 + 分类折叠 =====
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const selectedMarket = ref<MarketKey | null>(null)

function selectMarket(key: MarketKey | null) {
  selectedMarket.value = key
}

const EXPANDED_STORAGE_KEY = 'stock-sdk-playground-expanded-v2'

function loadExpandedCategories(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

const expandedCategories = ref<Set<string>>(loadExpandedCategories())

function persistExpandedCategories() {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(expandedCategories.value)))
  } catch {
    /* 隐私模式可能写不进去，忽略 */
  }
}

function toggleCategory(key: string) {
  const next = new Set(expandedCategories.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedCategories.value = next
  persistExpandedCategories()
}

function ensureCategoryExpanded(cat: string | undefined) {
  if (!cat || expandedCategories.value.has(cat)) return
  const next = new Set(expandedCategories.value)
  next.add(cat)
  expandedCategories.value = next
  persistExpandedCategories()
}

function isCategoryOpen(key: string): boolean {
  if (searchQuery.value.trim() || selectedMarket.value !== null) return true
  return expandedCategories.value.has(key)
}

/** 全量分组（保持 categories 顺序由模板控制，这里只聚合） */
const methodsByCategory = computed(() => {
  const grouped: Record<string, PlaygroundMethod[]> = {}
  for (const m of playgroundMethods) {
    ;(grouped[m.category] ??= []).push(m)
  }
  return grouped
})

/** 搜索 + 市场过滤后的分组 */
const filteredByCategory = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const market = selectedMarket.value
  if (!q && !market) return methodsByCategory.value

  const result: Record<string, PlaygroundMethod[]> = {}
  for (const [cat, methods] of Object.entries(methodsByCategory.value)) {
    const matches = methods.filter((m) => {
      if (q && !(m.id.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q))) return false
      if (market && !m.market.some((x) => x === market || x === 'all')) return false
      return true
    })
    if (matches.length > 0) result[cat] = matches
  }
  return result
})

const visibleMethodCount = computed(() =>
  Object.values(filteredByCategory.value).reduce((sum, arr) => sum + arr.length, 0)
)
const totalMethodCount = playgroundMethods.length

// ===== SDK 运行时配置（抽屉编辑、localStorage 持久化） =====
interface SDKConfig {
  timeout: number
  retry: { maxRetries: number; baseDelay: number }
  rateLimit: { enabled: boolean; requestsPerSecond: number; maxBurst: number }
  circuitBreaker: { enabled: boolean; failureThreshold: number; resetTimeout: number }
}

const DEFAULT_CONFIG: SDKConfig = {
  timeout: 30000,
  retry: { maxRetries: 3, baseDelay: 1000 },
  rateLimit: { enabled: false, requestsPerSecond: 5, maxBurst: 5 },
  circuitBreaker: { enabled: false, failureThreshold: 5, resetTimeout: 30000 },
}

const CONFIG_STORAGE_KEY = 'stock-sdk-playground-config-v2'

function loadStoredConfig(): SDKConfig {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_CONFIG)
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_CONFIG)
    const parsed = JSON.parse(raw) as Partial<SDKConfig>
    return {
      timeout: parsed.timeout ?? DEFAULT_CONFIG.timeout,
      retry: { ...DEFAULT_CONFIG.retry, ...(parsed.retry ?? {}) },
      rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...(parsed.rateLimit ?? {}) },
      circuitBreaker: { ...DEFAULT_CONFIG.circuitBreaker, ...(parsed.circuitBreaker ?? {}) },
    }
  } catch {
    return structuredClone(DEFAULT_CONFIG)
  }
}

const sdkConfig = ref<SDKConfig>(loadStoredConfig())

function buildSDKOptions(cfg: SDKConfig): Record<string, unknown> {
  const opts: Record<string, unknown> = {
    timeout: cfg.timeout,
    retry: { maxRetries: cfg.retry.maxRetries, baseDelay: cfg.retry.baseDelay },
  }
  if (cfg.rateLimit.enabled) {
    opts.rateLimit = {
      requestsPerSecond: cfg.rateLimit.requestsPerSecond,
      maxBurst: cfg.rateLimit.maxBurst,
    }
  }
  if (cfg.circuitBreaker.enabled) {
    opts.circuitBreaker = {
      failureThreshold: cfg.circuitBreaker.failureThreshold,
      resetTimeout: cfg.circuitBreaker.resetTimeout,
    }
  }
  return opts
}

const configDrawerOpen = ref(false)
const sidebarOpen = ref(false)

function closeAllDrawers() {
  configDrawerOpen.value = false
  sidebarOpen.value = false
}

// ===== 当前方法与表单状态 =====
const currentMethodId = ref('quotes.cn')
const paramValues = ref<Record<string, string>>({})
const isLoading = ref(false)
const result = ref('')
const resultStatus = ref<'idle' | 'success' | 'error'>('idle')
const duration = ref(0)
const resultCount = ref(0)
const showCode = ref(false)
const sdk = ref<any>(null)
const sdkLoaded = ref(false)
const showToast = ref(false)
const toastMessage = ref('')

const currentMethod = computed<PlaygroundMethod | undefined>(() => methodsById[currentMethodId.value])

const liveCode = computed(() => {
  const m = currentMethod.value
  if (!m) return ''
  return buildCode(m, paramValues.value)
})

/** 初始化参数：overrides 的演示默认值，没有则留空（空 = SDK 默认值落地） */
function initParams() {
  const m = currentMethod.value
  if (!m) return
  const defaults = DEFAULT_VALUES[m.id] ?? {}
  const values: Record<string, string> = {}
  for (const f of m.fields) {
    values[f.key] = defaults[f.key] ?? ''
  }
  paramValues.value = values
}

function selectMethod(id: string) {
  currentMethodId.value = id
  initParams()
  resultStatus.value = 'idle'
  result.value = ''
  showCode.value = false
  sidebarOpen.value = false
}

// ===== 发送请求 =====
async function fetchData() {
  const m = currentMethod.value
  if (!m) return
  if (!sdk.value) {
    result.value = t.value.sdkNotReady
    resultStatus.value = 'error'
    return
  }

  const missing = findMissingRequired(m, paramValues.value)
  if (missing) {
    result.value = t.value.missingRequired(missing)
    resultStatus.value = 'error'
    return
  }

  isLoading.value = true
  resultStatus.value = 'idle'
  result.value = t.value.loading
  const startTime = performance.now()

  try {
    const data = await runMethod(sdk.value, m, paramValues.value, {
      onProgress: (msg) => {
        result.value = msg
      },
    })

    duration.value = Math.round(performance.now() - startTime)
    resultCount.value = Array.isArray(data) ? data.length : ((data as any)?.data?.length || 1)

    if (typeof window !== 'undefined') {
      ;(window as any).__playgroundLastResult = data
    }

    result.value = formatResultForRender(data)
    resultStatus.value = 'success'
  } catch (error: any) {
    duration.value = Math.round(performance.now() - startTime)
    result.value = `${isEn.value ? 'Error' : '错误'}: ${error?.message ?? error}\n\n${error?.stack ?? ''}`
    resultStatus.value = 'error'
  } finally {
    isLoading.value = false
  }
}

function clearResult() {
  result.value = ''
  resultStatus.value = 'idle'
}

// ===== SDK 加载（dev 本地 src / prod unpkg 锁精确版本） =====
let cachedSDKClass: any = null

async function loadSDKClass() {
  if (cachedSDKClass) return cachedSDKClass
  const isDev = import.meta.env.DEV
  if (isDev) {
    const module = (await import('stock-sdk-local')) as any
    cachedSDKClass = module.StockSDK || module.default
  } else {
    // 锁精确版本（构建期注入的 themeConfig.sdkVersion），避免 @beta 浮动 tag
    // 与构建期 bundle 的 spec 方法目录漂移（见 Playground TD 文档 §4.6）
    const version = (theme.value as any).sdkVersion as string
    const module = (await import(/* @vite-ignore */ `https://unpkg.com/stock-sdk@${version}/dist/index.js`)) as any
    cachedSDKClass = module.StockSDK
  }
  return cachedSDKClass
}

async function loadSDK() {
  const Cls = await loadSDKClass()
  const instance = new Cls(buildSDKOptions(sdkConfig.value))
  ;(window as any).sdk = instance
  return instance
}

async function applyConfig() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sdkConfig.value))
  } catch {
    /* 忽略 */
  }
  try {
    sdk.value = await loadSDK()
    toastMessage.value = t.value.applied
    showToast.value = true
    setTimeout(() => (showToast.value = false), 2500)
    configDrawerOpen.value = false
  } catch (err: any) {
    toastMessage.value = `${t.value.applyFailed}${err?.message ?? err}`
    showToast.value = true
    setTimeout(() => (showToast.value = false), 4000)
  }
}

function resetConfig() {
  sdkConfig.value = structuredClone(DEFAULT_CONFIG)
}

// ===== URL 深链：#quotes.cn?codes=sh600519 =====
let suppressHashWrite = false

function parseHash(): { id: string; values: Record<string, string> } | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const [id, query = ''] = hash.split('?')
  if (!id || !methodsById[id]) return null
  const values: Record<string, string> = {}
  new URLSearchParams(query).forEach((v, k) => {
    values[k] = v
  })
  return { id, values }
}

function writeHash() {
  if (typeof window === 'undefined' || suppressHashWrite) return
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(paramValues.value)) {
    if (v !== '' && v !== undefined && v !== null) params.set(k, String(v))
  }
  const query = params.toString()
  const next = query ? `#${currentMethodId.value}?${query}` : `#${currentMethodId.value}`
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', next)
  }
}

onMounted(async () => {
  const fromHash = parseHash()
  if (fromHash) {
    suppressHashWrite = true
    currentMethodId.value = fromHash.id
    initParams()
    for (const [k, v] of Object.entries(fromHash.values)) {
      if (k in paramValues.value) paramValues.value[k] = v
    }
    suppressHashWrite = false
  } else {
    initParams()
  }

  ensureCategoryExpanded(currentMethod.value?.category)

  try {
    sdk.value = await loadSDK()
    sdkLoaded.value = true
    console.log(`🚀 Stock SDK Playground 已加载 (${import.meta.env.DEV ? '本地开发模式' : '生产模式'})`)
    console.log('💡 提示: 可以在控制台使用 window.sdk 直接调用 SDK 方法')

    toastMessage.value = t.value.mounted
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 5000)
  } catch (error) {
    console.error('加载 SDK 失败:', error)
    result.value = t.value.sdkFailed
    resultStatus.value = 'error'
  }
})

// 代码示例随方法 / 参数 / 显隐实时高亮
watch(
  [liveCode, showCode],
  async ([code, visible]) => {
    if (!visible || !currentMethod.value) return
    const fullCode = `// ${currentMethod.value.desc}\n${code}`
    await updateHighlightedCode(fullCode)
  },
  { immediate: true }
)

// 方法切换 / 参数改动 → 同步 URL hash
watch(
  [currentMethodId, paramValues],
  () => writeHash(),
  { deep: true, flush: 'post' }
)

// 方法切换 → 自动展开所属分类（不用 immediate，初始由 onMounted 处理，避免 hash 恢复前误展开默认分类）
watch(
  () => currentMethod.value?.category,
  (cat) => ensureCategoryExpanded(cat)
)

// ===== 复制结果 =====
async function copyResult() {
  const fullData = (window as any).__playgroundLastResult
  const text = fullData !== undefined ? JSON.stringify(fullData, null, 2) : result.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toastMessage.value = t.value.copied
    showToast.value = true
    setTimeout(() => (showToast.value = false), 2000)
  } catch {
    toastMessage.value = t.value.copyFailed
    showToast.value = true
    setTimeout(() => (showToast.value = false), 3000)
  }
}

// ===== 快捷键 =====
function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && (sidebarOpen.value || configDrawerOpen.value)) {
    closeAllDrawers()
    return
  }

  const mod = e.metaKey || e.ctrlKey
  if (!mod) return

  if (e.key === 'k' || e.key === 'K') {
    e.preventDefault()
    sidebarOpen.value = true
    nextTick(() => {
      searchInputRef.value?.focus()
      searchInputRef.value?.select()
    })
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    if (!isLoading.value && sdkLoaded.value) {
      void fetchData()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <div class="playground" :class="{ dark: isDark }">
    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="showToast" class="toast" @click="showToast = false">
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- 抽屉遮罩 -->
    <Transition name="fade">
      <div v-if="sidebarOpen || configDrawerOpen" class="backdrop" @click="closeAllDrawers"></div>
    </Transition>

    <div class="playground-body">
      <aside class="sidebar" :class="{ 'is-open': sidebarOpen }">
        <div class="sidebar-header">
          <span>
            {{ t.apiMethods }}
            <span class="method-count">
              {{ searchQuery || selectedMarket !== null ? `${visibleMethodCount}/${totalMethodCount}` : totalMethodCount }}
            </span>
          </span>
          <div class="sdk-status">
            <span v-if="sdkLoaded" class="status-badge success" title="SDK Ready">
              <span class="dot"></span>
            </span>
            <span v-else class="status-badge loading" title="Loading...">
              <span class="spinner"></span>
            </span>
          </div>
        </div>
        <div class="search-box">
          <Icon icon="lucide:search" class="search-icon" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="t.searchPlaceholder"
            spellcheck="false"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            @click="searchQuery = ''"
          >×</button>
        </div>
        <div class="market-chips" role="tablist" :aria-label="t.filterByMarket">
          <button
            v-for="chip in marketChips"
            :key="chip.key ?? '_all'"
            type="button"
            class="market-chip"
            :class="{ active: selectedMarket === chip.key }"
            role="tab"
            :aria-selected="selectedMarket === chip.key"
            @click="selectMarket(chip.key)"
          >{{ chip.label }}</button>
        </div>
        <nav class="method-nav">
          <div
            v-for="cat in categories"
            v-show="(filteredByCategory[cat.key]?.length ?? 0) > 0"
            :key="cat.key"
            class="category"
            :class="{ collapsed: !isCategoryOpen(cat.key) }"
          >
            <button
              type="button"
              class="category-header"
              :aria-expanded="isCategoryOpen(cat.key)"
              @click="toggleCategory(cat.key)"
            >
              <Icon icon="lucide:chevron-right" class="category-chevron" />
              <span class="category-icon" :style="{ color: cat.color }">
                <Icon :icon="cat.icon" />
              </span>
              <span class="category-label">{{ cat.label }}</span>
              <span class="category-count">{{ filteredByCategory[cat.key]?.length ?? 0 }}</span>
            </button>
            <div v-show="isCategoryOpen(cat.key)" class="category-methods">
              <button
                v-for="m in filteredByCategory[cat.key]"
                :key="m.id"
                class="method-item"
                :class="{ active: currentMethodId === m.id }"
                @click="selectMethod(m.id)"
              >
                <span class="method-name">{{ m.label }}</span>
                <span class="method-desc">{{ m.desc }}</span>
              </button>
            </div>
          </div>
          <div v-if="(searchQuery || selectedMarket !== null) && visibleMethodCount === 0" class="search-empty">
            {{ t.noMatch }}
          </div>
        </nav>
      </aside>

      <main class="main-content">
        <div class="main-toolbar">
          <button class="btn-icon mobile-only" @click="sidebarOpen = true">
            <Icon icon="lucide:menu" />
            <span>{{ t.methodsNav }}</span>
          </button>
          <div class="main-toolbar-spacer"></div>
          <button class="btn-icon" @click="configDrawerOpen = true">
            <Icon icon="lucide:settings" />
            <span>{{ t.sdkConfig }}</span>
          </button>
        </div>

        <div v-if="currentMethod" class="card params-card">
          <div class="card-header">
            <div class="method-info">
              <h2>{{ currentMethod.label }}</h2>
              <span class="method-desc">{{ currentMethod.desc }}</span>
            </div>
            <button class="btn-toggle-code" :class="{ active: showCode }" @click="showCode = !showCode">
              {{ showCode ? t.hideCode : t.viewCode }}
            </button>
          </div>
          <div class="card-body">
            <div class="params-grid">
              <div
                v-for="field in currentMethod.fields"
                :key="field.key"
                class="param-item"
                :class="{ 'param-item--checkbox': field.type === 'checkbox' }"
              >
                <label class="param-label" :title="field.desc">
                  {{ field.label }}
                  <span v-if="field.required" class="required">*</span>
                </label>
                <select
                  v-if="field.type === 'select'"
                  v-model="paramValues[field.key]"
                  class="param-input"
                >
                  <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <label v-else-if="field.type === 'checkbox'" class="param-checkbox">
                  <input
                    type="checkbox"
                    :checked="paramValues[field.key] === 'true'"
                    @change="paramValues[field.key] = ($event.target as HTMLInputElement).checked ? 'true' : ''"
                  />
                  <span class="param-checkbox__mark"></span>
                </label>
                <input
                  v-else
                  :type="field.type === 'number' ? 'number' : 'text'"
                  v-model="paramValues[field.key]"
                  :placeholder="field.placeholder"
                  class="param-input"
                />
              </div>
            </div>

            <Transition name="expand">
              <div v-if="showCode" class="code-example-section">
                <div class="shiki-wrapper" v-html="highlightedCode"></div>
              </div>
            </Transition>

            <div class="action-bar">
              <button
                class="btn primary"
                :disabled="isLoading || !sdkLoaded"
                @click="fetchData"
              >
                <span v-if="isLoading" class="btn-spinner"></span>
                {{ isLoading ? t.sending : t.send }}
              </button>
              <button class="btn secondary" @click="clearResult">{{ t.clear }}</button>
              <span class="action-hint">{{ t.hint }}</span>
            </div>
          </div>
        </div>

        <div class="card result-card">
          <div class="card-header">
            <h3>{{ t.result }}</h3>
            <div class="result-meta">
              <template v-if="resultStatus !== 'idle'">
                <span :class="['status-tag', resultStatus]">
                  {{ resultStatus === 'success' ? t.success : t.failed }}
                </span>
                <span class="meta-item">{{ t.duration }}: <strong>{{ duration }}ms</strong></span>
                <span v-if="resultStatus === 'success'" class="meta-item">
                  {{ t.count }}: <strong>{{ resultCount }}</strong>
                </span>
              </template>
              <button
                v-if="resultStatus === 'success' && result"
                class="btn-copy"
                @click="copyResult"
              >
                {{ t.copy }}
              </button>
            </div>
          </div>
          <div class="card-body">
            <div :class="['result-box', resultStatus]">
              <pre>{{ result || t.emptyResult }}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- SDK 配置抽屉 -->
    <Transition name="slide-right">
      <aside v-if="configDrawerOpen" class="config-drawer" @click.stop>
        <div class="drawer-header">
          <h3>
            <Icon icon="lucide:settings" />
            {{ t.sdkConfigTitle }}
          </h3>
          <button class="btn-icon-only" @click="configDrawerOpen = false">
            <Icon icon="lucide:x" />
          </button>
        </div>

        <div class="drawer-body">
          <p class="drawer-hint">{{ t.drawerHint }}</p>

          <fieldset class="cfg-section">
            <legend>{{ t.general }}</legend>
            <div class="cfg-row">
              <label>{{ t.timeout }}</label>
              <input type="number" v-model.number="sdkConfig.timeout" min="1000" step="1000" class="param-input" />
            </div>
          </fieldset>

          <fieldset class="cfg-section">
            <legend>{{ t.retry }}</legend>
            <div class="cfg-row">
              <label>{{ t.maxRetries }}</label>
              <input type="number" v-model.number="sdkConfig.retry.maxRetries" min="0" max="10" class="param-input" />
            </div>
            <div class="cfg-row">
              <label>{{ t.baseDelay }}</label>
              <input type="number" v-model.number="sdkConfig.retry.baseDelay" min="100" step="100" class="param-input" />
            </div>
          </fieldset>

          <fieldset class="cfg-section">
            <legend>
              <label class="cfg-toggle">
                <input type="checkbox" v-model="sdkConfig.rateLimit.enabled" />
                {{ t.rateLimitTitle }}
              </label>
            </legend>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.rateLimit.enabled }">
              <label>{{ t.rps }}</label>
              <input
                type="number"
                v-model.number="sdkConfig.rateLimit.requestsPerSecond"
                min="1"
                :disabled="!sdkConfig.rateLimit.enabled"
                class="param-input"
              />
            </div>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.rateLimit.enabled }">
              <label>{{ t.maxBurst }}</label>
              <input
                type="number"
                v-model.number="sdkConfig.rateLimit.maxBurst"
                min="1"
                :disabled="!sdkConfig.rateLimit.enabled"
                class="param-input"
              />
            </div>
          </fieldset>

          <fieldset class="cfg-section">
            <legend>
              <label class="cfg-toggle">
                <input type="checkbox" v-model="sdkConfig.circuitBreaker.enabled" />
                {{ t.cbTitle }}
              </label>
            </legend>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.circuitBreaker.enabled }">
              <label>{{ t.failureThreshold }}</label>
              <input
                type="number"
                v-model.number="sdkConfig.circuitBreaker.failureThreshold"
                min="1"
                :disabled="!sdkConfig.circuitBreaker.enabled"
                class="param-input"
              />
            </div>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.circuitBreaker.enabled }">
              <label>{{ t.resetTimeout }}</label>
              <input
                type="number"
                v-model.number="sdkConfig.circuitBreaker.resetTimeout"
                min="1000"
                step="1000"
                :disabled="!sdkConfig.circuitBreaker.enabled"
                class="param-input"
              />
            </div>
          </fieldset>
        </div>

        <div class="drawer-footer">
          <button class="btn secondary" @click="resetConfig">{{ t.resetDefault }}</button>
          <div class="footer-spacer"></div>
          <button class="btn secondary" @click="configDrawerOpen = false">{{ t.cancel }}</button>
          <button class="btn primary" @click="applyConfig">{{ t.apply }}</button>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.playground {
  /* 浅色主题变量 —— 红盘主题（深红 + 鎏金 + 暖底） */
  --pg-bg: #faf8f7;
  --pg-surface: #ffffff;
  --pg-surface-hover: #f3efed;
  --pg-border: #e7e0dc;
  --pg-text: #292524;
  --pg-text-secondary: #6b6360;
  --pg-text-muted: #a39c98;
  --pg-accent: #b91c1c;
  --pg-accent-hover: #dc2626;
  --pg-accent-soft: rgba(185, 28, 28, 0.09);
  --pg-success: #16a34a;
  --pg-error: #dc2626;
  --pg-code-bg: #1c1917;
  --pg-code-text: #e7e5e4;
  --pg-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --pg-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);

  /* 固定高度，填满可视区域，不产生外部滚动 */
  height: calc(100vh - 64px);
  overflow: hidden;
  background: var(--pg-bg);
  color: var(--pg-text);
  font-family: var(--vp-font-family-base);
}

/* 深色主题变量（暖黑，与站点 .dark 一脉相承） */
.playground.dark {
  --pg-bg: #0e0b0a;
  --pg-surface: #171210;
  --pg-surface-hover: #221b18;
  --pg-border: #2e2522;
  --pg-text: #f0eae6;
  --pg-text-secondary: #a39c98;
  --pg-text-muted: #6b6360;
  --pg-accent: #f87171;
  --pg-accent-hover: #fca5a5;
  --pg-accent-soft: rgba(248, 113, 113, 0.13);
  --pg-code-bg: #0c0908;
  --pg-code-text: #e7e5e4;
  --pg-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  --pg-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.4);
}

/* Body Layout */
.playground-body {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--pg-surface);
  border-right: 1px solid var(--pg-border);
  flex-shrink: 0;
}

.sidebar-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pg-text-muted);
  border-bottom: 1px solid var(--pg-border);
  font-family: var(--vp-font-family-mono);
}

.method-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sdk-status {
  display: flex;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.status-badge.success .dot {
  width: 8px;
  height: 8px;
  background: var(--pg-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-badge.loading .spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--pg-accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.category {
  margin-bottom: 4px;
}

/* Category header（可点击折叠 / 展开） */
.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: left;
  color: var(--pg-text-secondary);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.category-header:hover {
  background: var(--pg-surface-hover);
  color: var(--pg-text);
}

.category-chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  font-size: 14px;
  color: var(--pg-text-muted);
  transition: transform 0.2s ease;
}
.category:not(.collapsed) .category-chevron {
  transform: rotate(90deg);
}

.category-icon {
  flex-shrink: 0;
  font-size: 1.15rem;
  display: inline-flex;
  align-items: center;
}

.category-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  flex-shrink: 0;
  padding: 1px 7px;
  font-size: 0.68rem;
  font-weight: 600;
  background: var(--pg-surface-hover);
  color: var(--pg-text-muted);
  border-radius: 999px;
}
.category-header:hover .category-count,
.category:not(.collapsed) .category-count {
  color: var(--pg-text-secondary);
}

.category-methods {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0 8px;
}

/* Method item —— 两行卡片（方法名 + 一行描述） */
.method-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 7px 10px 7px 28px;
  margin-left: 6px;
  text-align: left;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.method-item:hover {
  background: var(--pg-surface-hover);
}

.method-item.active {
  background: var(--pg-accent-soft);
  border-left-color: var(--pg-accent);
}

.method-name {
  font-size: 0.82rem;
  font-weight: 500;
  font-family: var(--vp-font-family-mono);
  color: var(--pg-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.method-item.active .method-name {
  color: var(--pg-accent);
  font-weight: 600;
}

.method-desc {
  font-size: 0.72rem;
  color: var(--pg-text-muted);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.method-item:hover .method-desc {
  color: var(--pg-text-secondary);
}

/* Main Content */
.main-content {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  background: var(--pg-bg);
}

/* Cards */
.card {
  background: var(--pg-surface);
  border: 1px solid var(--pg-border);
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: var(--pg-shadow);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--pg-border);
}

.card-header h2, .card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.card-header h2 {
  font-family: var(--vp-font-family-mono);
}

.method-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.method-info .method-desc {
  font-size: 0.875rem;
  color: var(--pg-text-secondary);
}

.btn-toggle-code {
  flex-shrink: 0;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--pg-accent);
  background: var(--pg-accent-soft);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle-code:hover,
.btn-toggle-code.active {
  background: var(--pg-accent);
  color: white;
}

.card-body {
  padding: 20px;
}

/* Params */
.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.param-item--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.param-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--pg-text-secondary);
  font-family: var(--vp-font-family-mono);
}

.param-label .required {
  color: var(--pg-error);
  margin-left: 2px;
}

.param-input {
  padding: 10px 14px;
  font-size: 0.95rem;
  background: var(--pg-bg);
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  color: var(--pg-text);
  transition: all 0.2s;
  outline: none;
}

.param-input:focus {
  border-color: var(--pg-accent);
  box-shadow: 0 0 0 3px var(--pg-accent-soft);
}

.param-input::placeholder {
  color: var(--pg-text-muted);
}

/* checkbox（自绘，对齐红盘主题） */
.param-checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.param-checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.param-checkbox__mark {
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--pg-border);
  border-radius: 6px;
  background: var(--pg-bg);
  transition: all 0.15s;
}
.param-checkbox input:checked + .param-checkbox__mark {
  background: var(--pg-accent);
  border-color: var(--pg-accent);
}
.param-checkbox input:checked + .param-checkbox__mark::after {
  content: '✓';
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

/* Code Example Section */
.code-example-section {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: #1c1917;
}

.shiki-wrapper {
  font-size: 0.85rem;
  line-height: 1.6;
}

.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 16px 20px;
  border-radius: 12px;
  overflow-x: auto;
  background: #1c1917 !important;
}

.shiki-wrapper :deep(code) {
  font-family: var(--vp-font-family-mono);
}

.dark .code-example-section,
.dark .shiki-wrapper :deep(pre) {
  background: #0c0908 !important;
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

/* Action Bar */
.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-hint {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--pg-text-muted);
  user-select: none;
  font-family: var(--vp-font-family-mono);
}

/* 侧边栏：方法计数 + 搜索框 */
.method-count {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  background: var(--pg-surface-hover);
  color: var(--pg-text-secondary);
  border-radius: 6px;
  letter-spacing: 0;
  text-transform: none;
}

.search-box {
  position: relative;
  flex-shrink: 0;
  padding: 8px 12px 4px;
}

.search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.95rem;
  color: var(--pg-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 28px 7px 30px;
  font-size: 0.85rem;
  background: var(--pg-bg);
  color: var(--pg-text);
  border: 1px solid var(--pg-border);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus {
  border-color: var(--pg-accent);
  box-shadow: 0 0 0 3px var(--pg-accent-soft);
}

.search-input::placeholder {
  color: var(--pg-text-muted);
}

.search-clear {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  color: var(--pg-text-muted);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
.search-clear:hover {
  background: var(--pg-surface-hover);
  color: var(--pg-text);
}

.search-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--pg-text-muted);
}

/* 市场过滤芯片 */
.market-chips {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 12px 8px;
  border-bottom: 1px solid var(--pg-border);
}

.market-chip {
  padding: 3px 9px;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--pg-text-secondary);
  background: transparent;
  border: 1px solid var(--pg-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  white-space: nowrap;
}
.market-chip:hover {
  border-color: var(--pg-accent);
  color: var(--pg-accent);
}
.market-chip.active {
  background: var(--pg-accent);
  border-color: var(--pg-accent);
  color: white;
}

/* 复制按钮 */
.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 500;
  background: var(--pg-surface-hover);
  color: var(--pg-text-secondary);
  border: 1px solid var(--pg-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-copy:hover {
  background: var(--pg-accent-soft);
  color: var(--pg-accent);
  border-color: var(--pg-accent);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: linear-gradient(135deg, #dc2626 0%, #d97706 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.42);
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.secondary {
  background: var(--pg-surface-hover);
  color: var(--pg-text);
}

.btn.secondary:hover {
  background: var(--pg-border);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Result Card */
.result-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-tag.success {
  background: rgba(22, 163, 74, 0.12);
  color: var(--pg-success);
}

.status-tag.error {
  background: rgba(220, 38, 38, 0.12);
  color: var(--pg-error);
}

.meta-item {
  font-size: 0.875rem;
  color: var(--pg-text-secondary);
}

.meta-item strong {
  color: var(--pg-accent);
}

.result-box {
  background: var(--pg-code-bg);
  border-radius: 12px;
  padding: 16px 20px;
  max-height: 500px;
  overflow: auto;
}

.result-box pre {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--pg-code-text);
  white-space: pre-wrap;
  word-break: break-all;
}

.result-box.success {
  border: 1px solid var(--pg-success);
}

.result-box.error {
  border: 1px solid var(--pg-error);
}

.result-box.error pre {
  color: #fca5a5;
}

/* Responsive */
@media (max-width: 900px) {
  .playground {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .playground-body {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid var(--pg-border);
  }

  .method-nav {
    overflow-y: auto;
  }

  .main-content {
    height: auto;
    overflow-y: visible;
  }

  .params-grid {
    grid-template-columns: 1fr;
  }
}

/* Toast */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(185, 28, 28, 0.96) 0%, rgba(217, 119, 6, 0.96) 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(185, 28, 28, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  cursor: pointer;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}

.toast:hover {
  transform: translateX(-50%) scale(1.02);
}

.toast-enter-active {
  animation: toast-in 0.4s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in forwards;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
  }
}

/* 主内容工具条 */
.main-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.main-toolbar-spacer {
  flex: 1;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 0.85rem;
  background: var(--pg-surface);
  color: var(--pg-text-secondary);
  border: 1px solid var(--pg-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-icon:hover {
  background: var(--pg-accent-soft);
  color: var(--pg-accent);
  border-color: var(--pg-accent);
}

.btn-icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 1.05rem;
  background: transparent;
  color: var(--pg-text-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-icon-only:hover {
  background: var(--pg-surface-hover);
  color: var(--pg-text);
}

.mobile-only {
  display: none;
}

/* 抽屉遮罩 */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(14, 11, 10, 0.5);
  z-index: 50;
  cursor: pointer;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

/* SDK 配置抽屉 */
.config-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 92vw;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--pg-surface);
  border-left: 1px solid var(--pg-border);
  box-shadow: var(--pg-shadow-lg);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--pg-border);
  flex-shrink: 0;
}
.drawer-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--pg-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
}

.drawer-hint {
  margin: 0 0 16px;
  padding: 10px 12px;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--pg-text-secondary);
  background: var(--pg-surface-hover);
  border-radius: 8px;
}

.cfg-section {
  border: 1px solid var(--pg-border);
  border-radius: 10px;
  padding: 8px 14px 14px;
  margin: 0 0 12px;
}
.cfg-section legend {
  padding: 0 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--pg-text-secondary);
}

.cfg-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}
.cfg-toggle input {
  margin: 0;
}

.cfg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 0.85rem;
}
.cfg-row label {
  flex: 0 0 130px;
  color: var(--pg-text-secondary);
}
.cfg-row .param-input {
  flex: 1;
  min-width: 0;
}
.cfg-row.disabled {
  opacity: 0.5;
}

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--pg-border);
  flex-shrink: 0;
}
.drawer-footer .footer-spacer {
  flex: 1;
}
.drawer-footer .btn {
  padding: 8px 16px;
  font-size: 0.85rem;
}

/* 抽屉滑入动画 */
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 移动端（≤768px） */
@media (max-width: 768px) {
  .mobile-only {
    display: inline-flex;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 300px;
    max-width: 85vw;
    z-index: 60;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--pg-shadow-lg);
    max-height: none;
    border-bottom: none;
  }
  .sidebar.is-open {
    transform: translateX(0);
  }

  .main-content {
    padding: 16px;
  }

  .card-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .params-grid {
    grid-template-columns: 1fr !important;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .action-bar .btn {
    width: 100%;
  }
  .action-hint {
    display: none;
  }

  .config-drawer {
    width: 100vw;
    max-width: 100vw;
  }
}

@media (max-width: 480px) {
  .main-toolbar .btn-icon span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-badge.success .dot,
  .status-badge.loading .spinner,
  .btn-spinner {
    animation: none !important;
  }
}
</style>
