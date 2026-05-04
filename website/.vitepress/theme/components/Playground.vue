<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useData } from 'vitepress'
import { Icon } from '@iconify/vue'
import { codeToHtml } from 'shiki'

// === 拆分到 ./playground/* 的方法元数据与执行逻辑 ===
import { categories } from './playground/categories'
import { allMethods, methodsByName } from './playground/methods'
import type { MethodSpec } from './playground/types'

// VitePress 主题状态
const { isDark } = useData()

// 模板中沿用 `methodsConfig[name]` 的写法，这里把新结构 alias 过去
const methodsConfig = methodsByName

// === 大结果集渲染保护 ===
// 经验阈值：JSON.stringify 一个 5000+ 元素的对象数组并扔进 <pre> 会卡几秒。
// 超过此阈值时只渲染前 N 项，完整数据存于 window 供控制台查看。
const MAX_RENDER_ITEMS = 200

function formatResultForRender(data: unknown): string {
  if (!Array.isArray(data) || data.length <= MAX_RENDER_ITEMS) {
    return JSON.stringify(data, null, 2)
  }
  const head = data.slice(0, MAX_RENDER_ITEMS)
  return (
    JSON.stringify(head, null, 2) +
    `\n\n/* ⚠️ 共 ${data.length} 条数据，仅渲染前 ${MAX_RENDER_ITEMS} 条以避免页面卡顿。\n` +
    `   完整数据已挂载到 window.__playgroundLastResult，可在浏览器控制台访问。 */`
  )
}

// === 代码示例高亮 ===
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

/** 解析 spec.code（字符串或基于参数的函数） */
function resolveCode(spec: MethodSpec, params: Record<string, string>): string {
  return typeof spec.code === 'function' ? spec.code(params) : spec.code
}

// === 侧边栏方法搜索 + 按分类分组 ===
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

/** 不带过滤的全量分组（按分类聚合 method 名） */
const methodsByCategory = computed(() => {
  const grouped: Record<string, string[]> = {}
  for (const [key, config] of Object.entries(methodsConfig)) {
    if (!grouped[config.category]) grouped[config.category] = []
    grouped[config.category].push(key)
  }
  return grouped
})

/** 带过滤的分组（搜索框为空时返回全量），用于侧边栏渲染 */
const filteredByCategory = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return methodsByCategory.value

  const result: Record<string, string[]> = {}
  for (const [cat, names] of Object.entries(methodsByCategory.value)) {
    const matches = names.filter((name) => {
      const m = methodsConfig[name]
      if (!m) return false
      return (
        m.name.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q)
      )
    })
    if (matches.length > 0) result[cat] = matches
  }
  return result
})

/** 当前侧边栏中可见的方法总数（搜索时实时反馈） */
const visibleMethodCount = computed(() => {
  return Object.values(filteredByCategory.value).reduce((sum, arr) => sum + arr.length, 0)
})

const totalMethodCount = allMethods.length

// === SDK 运行时配置（抽屉编辑、localStorage 持久化） ===
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

const CONFIG_STORAGE_KEY = 'stock-sdk-playground-config-v1'

function loadStoredConfig(): SDKConfig {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_CONFIG)
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_CONFIG)
    const parsed = JSON.parse(raw) as Partial<SDKConfig>
    // 与默认值深合并，防止旧版本字段缺失
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

/** 把 sdkConfig 转成 StockSDK 构造选项（按需省略未启用的部分） */
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

/** 配置抽屉是否打开 */
const configDrawerOpen = ref(false)
/** 移动端侧边栏是否打开 */
const sidebarOpen = ref(false)

function closeAllDrawers() {
  configDrawerOpen.value = false
  sidebarOpen.value = false
}

// 状态
const currentMethod = ref('getFullQuotes')
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

// 当前方法配置
const currentConfig = computed(() => methodsConfig[currentMethod.value])

// 当前参数实时渲染出的代码示例（resolveCode 处理静态 / 函数两种形式）
const liveCode = computed(() => {
  const spec = currentConfig.value
  if (!spec) return ''
  return resolveCode(spec, paramValues.value)
})

// 初始化参数
function initParams() {
  const config = currentConfig.value
  const values: Record<string, string> = {}
  config.params.forEach(param => {
    values[param.key] = param.default
  })
  paramValues.value = values
}

// 切换方法
function selectMethod(method: string) {
  currentMethod.value = method
  initParams()
  resultStatus.value = 'idle'
  result.value = ''
  showCode.value = false
  // 移动端：选中方法后自动关闭抽屉，回到主内容
  sidebarOpen.value = false
}

// === 发送请求 ===
// dispatcher 已下沉到每个 spec 的 run() 函数，这里只负责通用流程：
// loading 开关、计时、错误处理、结果格式化（含大数据集截断）。
async function fetchData() {
  if (!sdk.value) {
    result.value = '错误: SDK 未加载，请确保网络连接正常后刷新页面'
    resultStatus.value = 'error'
    return
  }

  const spec: MethodSpec | undefined = methodsByName[currentMethod.value]
  if (!spec) {
    result.value = `错误: 未知方法 "${currentMethod.value}"`
    resultStatus.value = 'error'
    return
  }

  isLoading.value = true
  resultStatus.value = 'idle'
  result.value = '加载中...'
  const startTime = performance.now()

  try {
    const data = await spec.run(sdk.value, paramValues.value, {
      onProgress: (msg) => {
        result.value = msg
      },
    })

    const endTime = performance.now()
    duration.value = Math.round(endTime - startTime)
    resultCount.value = Array.isArray(data)
      ? data.length
      : ((data as any)?.data?.length || 1)

    // 把完整数据挂到 window 供控制台调试，避免被截断后用户拿不到全量
    if (typeof window !== 'undefined') {
      ;(window as any).__playgroundLastResult = data
    }

    result.value = formatResultForRender(data)
    resultStatus.value = 'success'
  } catch (error: any) {
    const endTime = performance.now()
    duration.value = Math.round(endTime - startTime)
    result.value = `错误: ${error?.message ?? error}\n\n${error?.stack ?? ''}`
    resultStatus.value = 'error'
  } finally {
    isLoading.value = false
  }
}

// 清空结果
function clearResult() {
  result.value = ''
  resultStatus.value = 'idle'
}

// === SDK 加载与重建 ===
// SDKClass 缓存避免每次 apply 配置都重新 fetch unpkg。
let cachedSDKClass: any = null

async function loadSDKClass() {
  if (cachedSDKClass) return cachedSDKClass
  const isDev = import.meta.env.DEV
  if (isDev) {
    // 本地开发：直接引用 src 源码
    const module = (await import('stock-sdk-local')) as any
    cachedSDKClass = module.StockSDK || module.default
  } else {
    // 生产环境：从 unpkg 加载
    const module = (await import('https://unpkg.com/stock-sdk/dist/index.js')) as any
    cachedSDKClass = module.StockSDK
  }
  return cachedSDKClass
}

/** 用当前配置实例化 SDK 并挂载到 window.sdk */
async function loadSDK() {
  const Cls = await loadSDKClass()
  const instance = new Cls(buildSDKOptions(sdkConfig.value))
  ;(window as any).sdk = instance
  return instance
}

/** 应用 SDK 配置：保存到 localStorage + 重建 SDK 实例 */
async function applyConfig() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sdkConfig.value))
  } catch {
    /* 隐私模式可能写不进去，无所谓，忽略 */
  }
  try {
    sdk.value = await loadSDK()
    toastMessage.value = '✅ SDK 配置已应用并重建实例'
    showToast.value = true
    setTimeout(() => (showToast.value = false), 2500)
    configDrawerOpen.value = false
  } catch (err: any) {
    toastMessage.value = `⚠️ SDK 重建失败: ${err?.message ?? err}`
    showToast.value = true
    setTimeout(() => (showToast.value = false), 4000)
  }
}

/** 重置配置为默认 */
function resetConfig() {
  sdkConfig.value = structuredClone(DEFAULT_CONFIG)
}

// === URL 深度链接 ===
// 格式：#methodName?key1=val1&key2=val2
// - 切换方法 / 改参数时用 history.replaceState 同步，不污染浏览器后退栈
// - onMounted 时解析 hash，把方法名和参数恢复到对应控件
// - 空值参数会被滤除，保持 URL 简洁
let suppressHashWrite = false

function parseHash(): { method: string; values: Record<string, string> } | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const [method, query = ''] = hash.split('?')
  if (!method || !methodsByName[method]) return null
  const values: Record<string, string> = {}
  new URLSearchParams(query).forEach((v, k) => {
    values[k] = v
  })
  return { method, values }
}

function writeHash() {
  if (typeof window === 'undefined' || suppressHashWrite) return
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(paramValues.value)) {
    if (v !== '' && v !== undefined && v !== null) params.set(k, String(v))
  }
  const query = params.toString()
  const next = query ? `#${currentMethod.value}?${query}` : `#${currentMethod.value}`
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', next)
  }
}

onMounted(async () => {
  // 优先用 URL hash 恢复方法 / 参数；解析失败 fallback 到默认方法
  const fromHash = parseHash()
  if (fromHash) {
    suppressHashWrite = true
    currentMethod.value = fromHash.method
    initParams()
    // 用 hash 中的值覆盖默认参数
    for (const [k, v] of Object.entries(fromHash.values)) {
      if (k in paramValues.value) paramValues.value[k] = v
    }
    suppressHashWrite = false
  } else {
    initParams()
  }

  try {
    // loadSDK 内部已经 attach 到 window.sdk
    sdk.value = await loadSDK()
    sdkLoaded.value = true
    const isDev = import.meta.env.DEV
    console.log(`🚀 Stock SDK Playground 已加载 (${isDev ? '本地开发模式' : '生产模式'})`)
    console.log('💡 提示: 可以在控制台使用 window.sdk 直接调用 SDK 方法')

    // 显示 toast 提示
    toastMessage.value = '💡 已挂载 window.sdk，可在浏览器控制台直接调试 SDK'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 5000)
  } catch (error) {
    console.error('加载 SDK 失败:', error)
    result.value = '加载 SDK 失败，请检查网络连接或刷新页面重试'
    resultStatus.value = 'error'
  }
})

// 代码示例随方法切换、参数改动、显隐切换实时高亮
watch(
  [liveCode, showCode],
  async ([code, visible]) => {
    if (!visible || !currentConfig.value) return
    const fullCode = `const sdk = new StockSDK();\n// ${currentConfig.value.desc}\n${code}`
    await updateHighlightedCode(fullCode)
  },
  { immediate: true }
)

// 注意：原本这里有一个 `watch(currentMethod, () => initParams())`，
// 它与 selectMethod() 的 initParams 调用重复，且会异步覆盖 onMounted 时
// 从 URL hash 恢复的参数（如 #getHistoryKline?symbol=sh600519）。
// 故移除：所有方法切换都走 selectMethod，已经处理了参数初始化。

// 任意方法切换 / 参数改动 → 同步到 URL hash
watch(
  [currentMethod, paramValues],
  () => writeHash(),
  { deep: true, flush: 'post' }
)

// === 复制结果到剪贴板 ===
// 优先使用挂在 window 上的完整数据（避免大结果集被截断），fallback 到当前显示的文本
async function copyResult() {
  const fullData = (window as any).__playgroundLastResult
  const text = fullData !== undefined ? JSON.stringify(fullData, null, 2) : result.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toastMessage.value = '✅ 已复制到剪贴板'
    showToast.value = true
    setTimeout(() => (showToast.value = false), 2000)
  } catch {
    toastMessage.value = '⚠️ 复制失败，请手动选择复制'
    showToast.value = true
    setTimeout(() => (showToast.value = false), 3000)
  }
}

// === 全局键盘快捷键 ===
//   Cmd/Ctrl + K     → 聚焦侧边栏搜索框
//   Cmd/Ctrl + Enter → 发送请求
//   Escape           → 关闭已打开的抽屉（移动端 sidebar / SDK 配置）
function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && (sidebarOpen.value || configDrawerOpen.value)) {
    closeAllDrawers()
    return
  }

  const mod = e.metaKey || e.ctrlKey
  if (!mod) return

  if (e.key === 'k' || e.key === 'K') {
    e.preventDefault()
    // 桌面端：searchInput 已在 DOM；移动端：先打开抽屉再聚焦
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
    
    <!-- 抽屉打开时的全屏遮罩（点击关闭） -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen || configDrawerOpen"
        class="backdrop"
        @click="closeAllDrawers"
      ></div>
    </Transition>

    <div class="playground-body">
      <aside class="sidebar" :class="{ 'is-open': sidebarOpen }">
        <div class="sidebar-header">
          <span>
            API 方法
            <span class="method-count">
              {{ searchQuery ? `${visibleMethodCount}/${totalMethodCount}` : totalMethodCount }}
            </span>
          </span>
          <div class="sdk-status">
            <span v-if="sdkLoaded" class="status-badge success" title="SDK 已就绪">
              <span class="dot"></span>
            </span>
            <span v-else class="status-badge loading" title="加载中...">
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
            placeholder="搜索方法… (⌘K)"
            spellcheck="false"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            title="清除"
            @click="searchQuery = ''"
          >×</button>
        </div>
        <nav class="method-nav">
          <div
            v-for="cat in categories"
            v-show="(filteredByCategory[cat.key]?.length ?? 0) > 0"
            :key="cat.key"
            class="category"
          >
            <div class="category-header">
              <span class="category-icon" :style="{ color: cat.color }">
                <Icon :icon="cat.icon" />
              </span>
              <span class="category-label">{{ cat.label }}</span>
            </div>
            <div class="category-methods">
              <button
                v-for="method in filteredByCategory[cat.key]"
                :key="method"
                class="method-item"
                :class="{ active: currentMethod === method }"
                @click="selectMethod(method)"
              >
                {{ methodsConfig[method].name }}
              </button>
            </div>
          </div>
          <div v-if="searchQuery && visibleMethodCount === 0" class="search-empty">
            没有匹配 "{{ searchQuery }}" 的方法
          </div>
        </nav>
      </aside>

      <main class="main-content">
        <!-- 主内容顶部工具条：移动端汉堡 + SDK 配置 -->
        <div class="main-toolbar">
          <button
            class="btn-icon mobile-only"
            title="API 方法导航"
            @click="sidebarOpen = true"
          >
            <Icon icon="lucide:menu" />
            <span>方法</span>
          </button>
          <div class="main-toolbar-spacer"></div>
          <button
            class="btn-icon"
            title="编辑 SDK 运行时配置"
            @click="configDrawerOpen = true"
          >
            <Icon icon="lucide:settings" />
            <span>SDK 配置</span>
          </button>
        </div>

        <div class="card params-card">
          <div class="card-header">
            <div class="method-info">
              <h2>{{ currentConfig.name }}</h2>
              <span class="method-desc">{{ currentConfig.desc }}</span>
            </div>
            <button class="btn-toggle-code" :class="{ active: showCode }" @click="showCode = !showCode">
              {{ showCode ? '隐藏代码' : '查看示例' }}
            </button>
          </div>
          <div class="card-body">
            <div class="params-grid">
              <div v-for="param in currentConfig.params" :key="param.key" class="param-item">
                <label class="param-label">
                  {{ param.label }}
                  <span v-if="param.required" class="required">*</span>
                </label>
                <select
                  v-if="param.type === 'select'"
                  v-model="paramValues[param.key]"
                  class="param-input"
                >
                  <option v-for="opt in param.options" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <input
                  v-else
                  :type="param.type"
                  v-model="paramValues[param.key]"
                  :placeholder="param.placeholder"
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
                title="发送请求 (⌘Enter)"
                @click="fetchData"
              >
                <span v-if="isLoading" class="btn-spinner"></span>
                {{ isLoading ? '请求中...' : '🚀 发送请求' }}
              </button>
              <button class="btn secondary" @click="clearResult">清空</button>
              <span class="action-hint">⌘K 搜索 · ⌘↵ 发送</span>
            </div>
          </div>
        </div>

        <div class="card result-card">
          <div class="card-header">
            <h3>返回结果</h3>
            <div class="result-meta">
              <template v-if="resultStatus !== 'idle'">
                <span :class="['status-tag', resultStatus]">
                  {{ resultStatus === 'success' ? '✓ 成功' : '✕ 失败' }}
                </span>
                <span class="meta-item">耗时: <strong>{{ duration }}ms</strong></span>
                <span v-if="resultStatus === 'success'" class="meta-item">
                  数量: <strong>{{ resultCount }}</strong>
                </span>
              </template>
              <button
                v-if="resultStatus === 'success' && result"
                class="btn-copy"
                title="复制完整结果到剪贴板"
                @click="copyResult"
              >
                📋 复制
              </button>
            </div>
          </div>
          <div class="card-body">
            <div :class="['result-box', resultStatus]">
              <pre>{{ result || '点击「发送请求」按钮开始测试...' }}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- SDK 配置抽屉（右侧滑入） -->
    <Transition name="slide-right">
      <aside v-if="configDrawerOpen" class="config-drawer" @click.stop>
        <div class="drawer-header">
          <h3>
            <Icon icon="lucide:settings" />
            SDK 运行时配置
          </h3>
          <button class="btn-icon-only" title="关闭" @click="configDrawerOpen = false">
            <Icon icon="lucide:x" />
          </button>
        </div>

        <div class="drawer-body">
          <p class="drawer-hint">
            修改后点击「应用」会用新配置重建 SDK 实例并保存到 localStorage。
            适合演示重试 / 限流 / 熔断等高级特性。
          </p>

          <!-- 通用 -->
          <fieldset class="cfg-section">
            <legend>通用</legend>
            <div class="cfg-row">
              <label>请求超时 (ms)</label>
              <input
                type="number"
                v-model.number="sdkConfig.timeout"
                min="1000"
                step="1000"
                class="param-input"
              />
            </div>
          </fieldset>

          <!-- 重试 -->
          <fieldset class="cfg-section">
            <legend>重试 (retry)</legend>
            <div class="cfg-row">
              <label>最大重试次数</label>
              <input
                type="number"
                v-model.number="sdkConfig.retry.maxRetries"
                min="0"
                max="10"
                class="param-input"
              />
            </div>
            <div class="cfg-row">
              <label>初始退避 (ms)</label>
              <input
                type="number"
                v-model.number="sdkConfig.retry.baseDelay"
                min="100"
                step="100"
                class="param-input"
              />
            </div>
          </fieldset>

          <!-- 限流 -->
          <fieldset class="cfg-section">
            <legend>
              <label class="cfg-toggle">
                <input type="checkbox" v-model="sdkConfig.rateLimit.enabled" />
                启用限流 (rateLimit)
              </label>
            </legend>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.rateLimit.enabled }">
              <label>每秒请求数</label>
              <input
                type="number"
                v-model.number="sdkConfig.rateLimit.requestsPerSecond"
                min="1"
                :disabled="!sdkConfig.rateLimit.enabled"
                class="param-input"
              />
            </div>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.rateLimit.enabled }">
              <label>令牌桶容量</label>
              <input
                type="number"
                v-model.number="sdkConfig.rateLimit.maxBurst"
                min="1"
                :disabled="!sdkConfig.rateLimit.enabled"
                class="param-input"
              />
            </div>
          </fieldset>

          <!-- 熔断器 -->
          <fieldset class="cfg-section">
            <legend>
              <label class="cfg-toggle">
                <input type="checkbox" v-model="sdkConfig.circuitBreaker.enabled" />
                启用熔断器 (circuitBreaker)
              </label>
            </legend>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.circuitBreaker.enabled }">
              <label>失败阈值</label>
              <input
                type="number"
                v-model.number="sdkConfig.circuitBreaker.failureThreshold"
                min="1"
                :disabled="!sdkConfig.circuitBreaker.enabled"
                class="param-input"
              />
            </div>
            <div class="cfg-row" :class="{ disabled: !sdkConfig.circuitBreaker.enabled }">
              <label>熔断恢复时间 (ms)</label>
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
          <button class="btn secondary" @click="resetConfig">重置默认</button>
          <div class="footer-spacer"></div>
          <button class="btn secondary" @click="configDrawerOpen = false">取消</button>
          <button class="btn primary" @click="applyConfig">应用</button>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.playground {
  /* 浅色主题变量 - 红色主题 */
  --pg-bg: #f8fafc;
  --pg-surface: #ffffff;
  --pg-surface-hover: #f1f5f9;
  --pg-border: #e2e8f0;
  --pg-text: #1e293b;
  --pg-text-secondary: #64748b;
  --pg-text-muted: #94a3b8;
  --pg-accent: #f87171;
  --pg-accent-hover: #ef4444;
  --pg-accent-soft: rgba(248, 113, 113, 0.1);
  --pg-success: #22c55e;
  --pg-error: #ef4444;
  --pg-code-bg: #1e293b;
  --pg-code-text: #e2e8f0;
  --pg-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --pg-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.1);

  /* 固定高度，填满可视区域，不产生外部滚动 */
  height: calc(100vh - 64px);
  overflow: hidden;
  background: var(--pg-bg);
  color: var(--pg-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 深色主题变量 */
.playground.dark {
  --pg-bg: #0f172a;
  --pg-surface: #1e293b;
  --pg-surface-hover: #334155;
  --pg-border: #334155;
  --pg-text: #f1f5f9;
  --pg-text-secondary: #94a3b8;
  --pg-text-muted: #64748b;
  --pg-accent: #fca5a5;
  --pg-accent-hover: #f87171;
  --pg-accent-soft: rgba(252, 165, 165, 0.15);
  --pg-code-bg: #0f172a;
  --pg-code-text: #e2e8f0;
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
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--pg-surface);
  border-right: 1px solid var(--pg-border);
  flex-shrink: 0;
}

.sidebar-header {
  flex-shrink: 0;
}

.method-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sidebar-header {
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
  margin-bottom: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pg-text-secondary);
}

.category-icon {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.category-methods {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.method-item {
  display: block;
  width: 100%;
  padding: 10px 12px 10px 36px;
  text-align: left;
  font-size: 0.875rem;
  color: var(--pg-text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.method-item:hover {
  background: var(--pg-surface-hover);
}

.method-item.active {
  background: var(--pg-accent-soft);
  color: var(--pg-accent);
  font-weight: 500;
}

/* Main Content */
.main-content {
  flex: 1;
  min-height: 0; /* 允许 flex 子元素收缩，启用滚动 */
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

.method-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.method-desc {
  font-size: 0.875rem;
  color: var(--pg-text-secondary);
}

.btn-toggle-code {
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

.btn-toggle-code:hover {
  background: var(--pg-accent);
  color: white;
}

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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--pg-text-secondary);
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

/* Code Example Section */
.code-example-section {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: #1e293b;
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
  background: #1e293b !important;
}

.shiki-wrapper :deep(code) {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

.dark .code-example-section {
  background: #0f172a;
}

.dark .shiki-wrapper :deep(pre) {
  background: #0f172a !important;
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
  max-height: 500px;
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
}

/* === 侧边栏：方法计数 + 搜索框 === */
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

/* === 复制按钮 === */
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

/* === 日期输入框：浅色 / 深色统一 === */
.param-input[type='date'] {
  /* 让原生 date input 与文本框视觉一致 */
  font-family: inherit;
  color-scheme: light;
}
.playground.dark .param-input[type='date'] {
  color-scheme: dark;
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
  background: linear-gradient(135deg, #f87171 0%, #fb923c 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(248, 113, 113, 0.35);
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(248, 113, 113, 0.45);
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
  background: rgba(34, 197, 94, 0.1);
  color: var(--pg-success);
}

.status-tag.error {
  background: rgba(239, 68, 68, 0.1);
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
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
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
  color: var(--pg-error);
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
    border-right: none;
    border-bottom: 1px solid var(--pg-border);
  }

  .method-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    overflow-y: visible;
  }

  .main-content {
    height: auto;
    overflow-y: visible;
  }

  .category {
    flex: 1;
    min-width: 200px;
  }

  .params-grid {
    grid-template-columns: 1fr;
  }
}

/* Toast 样式 */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  cursor: pointer;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}

.toast:hover {
  transform: translateX(-50%) scale(1.02);
}

/* Toast 动画 */
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

/* ============================================================
 * 主内容工具条（含移动端汉堡 + SDK 配置入口）
 * ============================================================ */
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

/* 移动端 only：默认隐藏 */
.mobile-only {
  display: none;
}

/* ============================================================
 * 抽屉公用：背景遮罩
 * ============================================================ */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
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

/* ============================================================
 * SDK 配置抽屉（右侧滑入）
 * ============================================================ */
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

/* ============================================================
 * 移动端响应式（≤ 768px）
 *  - sidebar 变为全屏覆盖抽屉
 *  - main-content 全宽，padding 收紧
 *  - 卡片头部允许换行
 *  - 隐藏快捷键提示和动作 hint，避免拥挤
 * ============================================================ */
@media (max-width: 768px) {
  .mobile-only {
    display: inline-flex;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 85vw;
    z-index: 60;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--pg-shadow-lg);
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
    /* 极窄屏只留图标 */
    display: none;
  }
}
</style>
