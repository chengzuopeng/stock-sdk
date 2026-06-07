# 请求治理

v2 把请求层的「超时 / 重试 / 限流 / 熔断 / host fallback」统一收口在 `RequestClient`，并在构造 `StockSDK` 时一次性配置。所有治理能力既可以**全局**生效，也可以按**数据源（provider）**单独覆盖；v2 还新增了三项可组合的扩展点：`fetchImpl`（注入自定义 fetch）、`signal`（外部取消信号）和请求生命周期 `hooks`（观测）。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK({
  timeout: 8000,
  retry: { maxRetries: 3 },
  rateLimit: { requestsPerSecond: 5 },
})
```

> 治理配置全部走 `new StockSDK(options)` 的构造参数（即 `RequestClientOptions`）。所有字段皆为可选，不配则用内置默认值。

## 配置层级与优先级

治理策略分三层，**就近覆盖**：

1. **全局默认**：构造时的顶层字段（`timeout` / `retry` / `rateLimit` / `circuitBreaker` / `headers` / `userAgent` / `rotateUserAgent`），对所有 provider 生效。
2. **provider 级**：`providerPolicies` 为单个数据源覆盖策略，未列出的 provider 回退到全局默认。合并是**浅合并** —— provider 级只需写要改的字段，其余继承全局。
3. **单次请求级**：`fetchImpl` / `signal` 可在每次取数时单独传入，优先级高于 client 级同名配置（具体单次入参以实现为准）。

```ts
const sdk = new StockSDK({
  // 全局默认
  timeout: 8000,
  retry: { maxRetries: 3, baseDelay: 1000 },
  // 按 provider 覆盖
  providerPolicies: {
    eastmoney: {
      timeout: 12000,                       // 东财接口慢一点，单独放宽超时
      rateLimit: { requestsPerSecond: 3 },  // 单独限流，其余继承全局
    },
    tencent: {
      retry: { maxRetries: 5 },             // 腾讯源多重试两次
    },
  },
})
```

已知的 provider 名称：`tencent` / `eastmoney` / `sina` / `linkdiary`（未识别归 `unknown`）。`providerPolicies` 的 key 即这些名称。

## 超时

`timeout`（毫秒）控制单次请求的最长等待。超时由内部 `AbortController` 触发，归类为错误码 `TIMEOUT`（与外部主动取消的 `ABORTED` 区分开）。

```ts
const sdk = new StockSDK({ timeout: 8000 }) // 全局 8s
// provider 级覆盖
new StockSDK({ providerPolicies: { eastmoney: { timeout: 12000 } } })
```

## 重试

重试策略由 `RetryOptions` 描述，采用**指数退避**。可重试的错误默认包括网络错误、超时、以及可重试的 HTTP 状态码。

| 字段 | 说明 | 默认 |
|---|---|---|
| `maxRetries` | 最大重试次数 | `3` |
| `baseDelay` | 初始退避（毫秒） | `1000` |
| `maxDelay` | 退避上限（毫秒） | `30000` |
| `backoffMultiplier` | 退避系数 | `2` |
| `retryableStatusCodes` | 可重试的 HTTP 状态码 | `[408, 429, 500, 502, 503, 504]` |
| `retryOnNetworkError` | 网络错误是否重试 | `true` |
| `retryOnTimeout` | 超时是否重试 | `true` |
| `onRetry` | 每次重试前的回调 `(attempt, error, delay) => void` | — |

```ts
const sdk = new StockSDK({
  retry: {
    maxRetries: 4,
    baseDelay: 500,
    backoffMultiplier: 2,
    onRetry: (attempt, error, delay) => {
      console.warn(`第 ${attempt} 次重试，${delay}ms 后，原因：${error.message}`)
    },
  },
})
```

> 退避时间约为 `baseDelay × backoffMultiplier^(attempt-1)`，并受 `maxDelay` 截顶。详细的错误分类与「哪些错误该重试」见 [错误处理与重试](/guide/retry)。

## 限流

`rateLimit` 用令牌桶算法平滑请求速率，避免被上游频控。

| 字段 | 说明 | 默认 |
|---|---|---|
| `requestsPerSecond` | 每秒最大请求数 | `5` |
| `maxBurst` | 令牌桶容量（允许的突发量） | 等于 `requestsPerSecond` |

```ts
const sdk = new StockSDK({
  rateLimit: { requestsPerSecond: 3, maxBurst: 6 },
})
```

桶空时请求会排队等待，而非直接失败；因此限流是「减速」而不是「拒绝」。

## 熔断

`circuitBreaker` 在连续失败时短路请求，防止把已经不健康的上游打挂（雪崩）。状态机为 `CLOSED → OPEN → HALF_OPEN`：连续失败达阈值后 `OPEN`（直接拒绝、抛 `CIRCUIT_OPEN`），冷却后进入 `HALF_OPEN` 放行少量探测，探测成功则恢复 `CLOSED`。

| 字段 | 说明 | 默认 |
|---|---|---|
| `failureThreshold` | 触发熔断的连续失败次数 | `5` |
| `resetTimeout` | 熔断持续时间（毫秒） | `30000` |
| `halfOpenRequests` | 半开状态放行的探测请求数 | `1` |
| `onStateChange` | 状态变化回调 `(from, to) => void` | — |

```ts
const sdk = new StockSDK({
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    onStateChange: (from, to) => console.warn(`熔断器：${from} → ${to}`),
  },
})
```

熔断打开期间的请求会立即抛出错误码 `CIRCUIT_OPEN`，无需真正发起网络请求。

## host fallback

部分数据源有多个可用域名。当主 host 失败时，请求层会自动切换到下一个候选 host 重试。这一过程对调用方透明，会通过 `hooks.trace('fallback', ctx)` 上报（见下文）。host 候选与切换策略内置在请求层，无需手动配置。

## v2 新增：fetchImpl

`fetchImpl` 允许注入自定义的 `fetch` 实现，用于**代理 / mock / 抓包日志**等场景。默认使用运行时全局 `fetch`（浏览器与 Node 18+ 双端皆有）。

```ts
const sdk = new StockSDK({
  fetchImpl: async (input, init) => {
    console.log('[fetch]', input)
    return fetch(input, init) // 包一层日志，再走原生
  },
})
```

- 类型为 `typeof fetch`。
- 优先级：单次请求 > client 级 `fetchImpl` > 运行时全局 `fetch`。
- 注入的实现即便抛出裸 `TypeError`，出口也会被归一化为 `SdkError`（见 [错误处理与重试](/guide/retry)）。

## v2 新增：signal（外部取消）

`signal` 接收一个外部 `AbortSignal`，触发后请求被主动取消。它与内部 timeout 信号**合并**：任一触发即中止。由外部 signal 触发的取消归类为错误码 `ABORTED`（与超时 `TIMEOUT` 区分）。

```ts
const controller = new AbortController()

const sdk = new StockSDK({ signal: controller.signal }) // client 级
// 或单次：sdk.quotes.cn(['600519'], { signal: controller.signal })（单次入参以实现为准）

// 某处触发取消
controller.abort()
```

> 信号合并优先使用原生 `AbortSignal.any`；在 Node 18.0–18.16（缺该 API）上自动退回手写联动并在请求结束后清理监听，避免长生命周期 signal 泄漏。SDK Node baseline 仍为 `>=18`。

## v2 新增：请求生命周期 hooks

`hooks` 是 **client 级**的观测钩子，用于日志、埋点、链路追踪。所有回调都在 `try/catch` 中调用，**回调内抛错不影响主请求流程**。

```ts
interface RequestLifecycleContext {
  provider: ProviderName
  url: string
  timeout: number
  attempt: number
  responseType?: 'text' | 'json' | 'arraybuffer'
}

interface RequestHooks {
  onRequest?(ctx: RequestLifecycleContext): void
  onResponse?(ctx: RequestLifecycleContext, meta: { status: number; durationMs: number }): void
  onError?(ctx: RequestLifecycleContext, error: SdkError): void
  onRetry?(ctx: RequestLifecycleContext, error: SdkError, delay: number): void
  trace?(event: 'request' | 'response' | 'error' | 'retry' | 'fallback', ctx: RequestLifecycleContext): void
}
```

| 钩子 | 触发时机 |
|---|---|
| `onRequest` | 每次发起请求前 |
| `onResponse` | 收到响应后（带 `status` 与 `durationMs`） |
| `onError` | 请求失败时（错误已归一化为 `SdkError`） |
| `onRetry` | 每次重试前（带本次 `delay`） |
| `trace` | 统一事件流：`request` / `response` / `error` / `retry` / `fallback`（host 切换） |

```ts
const sdk = new StockSDK({
  hooks: {
    onRequest: (ctx) => console.log(`→ ${ctx.provider} ${ctx.url} (第 ${ctx.attempt} 次)`),
    onResponse: (ctx, meta) => console.log(`← ${meta.status} in ${meta.durationMs}ms`),
    onError: (ctx, err) => console.error(`✗ ${err.code}: ${err.message}`),
    trace: (event, ctx) => {
      if (event === 'fallback') console.warn(`host fallback on ${ctx.provider}`)
    },
  },
})
```

- `hooks` 仅在 client 级配置（不进单次请求选项，避免过胖）。
- `onRetry` 与 `RetryOptions.onRetry` 兼容并复用，`hooks.onRetry` 是更完整的超集（带 `ctx`）。
- `onError` / `onRetry` 收到的 `error` 已是 `SdkError`，可直接读 `error.code`。

## 与 v1 的兼容性

- 旧的全局 `timeout` / `retry` / `rateLimit` / `circuitBreaker` 配置**继续有效**，语义不变。
- `providerPolicies` 是新增能力，与全局配置正交；不配则无影响。
- `fetchImpl` / `signal` / `hooks` 全部为可选项，与既有 provider 策略正交，新增字段不破坏既有调用。

> v2 SDK 仍在实现中：上述配置字段与默认值稳定，**单次请求级入参的精确形态以最终实现为准**。

## 相关阅读

- [错误处理与重试](/guide/retry) —— `SdkError`、错误码、`getSdkErrorCode`、重试判定。
- [浏览器使用](/guide/browser) —— 双端 fetch 与 JSONP 的差异。
