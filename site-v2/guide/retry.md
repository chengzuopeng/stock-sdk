# 错误处理与重试

v2 对外只抛**一种错误类型**：`SdkError`。无论是网络故障、超时、HTTP 4xx/5xx、上游空数据 / 结构化错误、参数 / 符号非法，还是被熔断器短路，都会被归一化成带 `code` 的 `SdkError`（或其子类）。你不再需要去识别裸 `TypeError` / `DOMException`。

错误相关的类型与工具从 `stock-sdk/errors` subpath 导出：

```ts
import { SdkError, getSdkErrorCode, isSdkError } from 'stock-sdk/errors'
```

## SdkError

所有 SDK 错误的基类。关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `SdkErrorCode` | 标准错误码（见下表），**分支判断的首选** |
| `message` | `string` | 人类可读的描述 |
| `provider` | `ProviderName?` | 触发错误的数据源 |
| `url` | `string?` | 出错的请求 URL |
| `status` | `number?` | HTTP 错误时的状态码 |
| `details` | `Record<string, unknown>?` | 附加上下文（如 `statusText` / `symbol` / `timeout`） |
| `cause` | `unknown?` | 原始底层错误（如有） |

```ts
import { SdkError } from 'stock-sdk/errors'

try {
  const q = await sdk.quotes.cn(['600519'])
} catch (e) {
  if (e instanceof SdkError) {
    console.error(e.code, e.message, e.provider, e.status)
  }
}
```

## 错误码

`SdkErrorCode` 是一个字符串字面量联合，覆盖请求层与契约层的全部失败场景：

| 错误码 | 含义 | 是否默认可重试 |
|---|---|---|
| `NETWORK_ERROR` | 网络层失败（DNS / 连接 / 裸 `TypeError`） | 是（`retryOnNetworkError`） |
| `TIMEOUT` | 内部超时（达到 `timeout`） | 是（`retryOnTimeout`） |
| `ABORTED` | **被外部 `signal` 主动取消**（区别于超时） | 否 |
| `HTTP_ERROR` | HTTP 非 2xx（非 429） | 视状态码（`retryableStatusCodes`） |
| `RATE_LIMITED` | HTTP 429（被上游频控） | 视是否在 `retryableStatusCodes`（默认含 429） |
| `CIRCUIT_OPEN` | 熔断器打开，请求被短路 | 否 |
| `UPSTREAM_EMPTY` | 上游返回**空数据** | 否 |
| `UPSTREAM_ERROR` | 上游返回**结构化错误**（`code != 0` / 带 `msg`） | 否 |
| `PARSE_ERROR` | 响应解析失败 | 否 |
| `INVALID_SYMBOL` | 标的 / 代码无法解析 | 否 |
| `INVALID_ARGUMENT` | 参数非法（范围 / 类型） | 否 |
| `NOT_FOUND` | 资源不存在 | 否 |

> v2 相对 v1 **新增两个码**：`ABORTED`（外部取消，区别于内部超时 `TIMEOUT`）与 `UPSTREAM_ERROR`（上游结构化错误，区别于空数据 `UPSTREAM_EMPTY`）。

## 错误子类

`SdkError` 有若干语义化子类，构造时自动带上对应 `code`。用 `instanceof` 或 `code` 判断皆可。

| 子类 | `code` | 场景 |
|---|---|---|
| `HttpError` | `HTTP_ERROR` / `RATE_LIMITED`（429） | HTTP 非 2xx，带 `status` / `statusText` |
| `UpstreamEmptyError` | `UPSTREAM_EMPTY` | 上游返回空数据 |
| `UpstreamError` | `UPSTREAM_ERROR` | 上游结构化错误 |
| `NotFoundError` | `NOT_FOUND` | 资源不存在 |
| `InvalidArgumentError` | `INVALID_ARGUMENT` | 参数非法 |
| `InvalidSymbolError` | `INVALID_SYMBOL` | 标的非法（`details.symbol` 带原始入参） |
| `AbortedError` | `ABORTED` | 外部 signal 取消 |
| `CircuitBreakerError` | `CIRCUIT_OPEN` | 熔断打开 |

```ts
import { HttpError, isSdkError } from 'stock-sdk/errors'

try {
  await sdk.kline.cn('600519', { period: 'daily' })
} catch (e) {
  if (e instanceof HttpError) {
    console.error(`HTTP ${e.status} ${e.statusText}`)
  } else if (isSdkError(e)) {
    console.error(e.code, e.message)
  }
}
```

## getSdkErrorCode

读取任意错误上的标准错误码，返回 `SdkErrorCode | undefined`。比 `instanceof` 更鲁棒：它能识别 `SdkError`、`HttpError`，也能从被附加了元数据的网络错误中读出 `sdkCode`，并把 abort 形态的 `DOMException` 归为 `TIMEOUT`、裸 `TypeError` 兜底为 `NETWORK_ERROR`。

```ts
import { getSdkErrorCode } from 'stock-sdk/errors'

try {
  await sdk.quotes.cn(['600519'])
} catch (e) {
  switch (getSdkErrorCode(e)) {
    case 'RATE_LIMITED':
      // 被频控：退避后再试
      break
    case 'INVALID_SYMBOL':
      // 代码写错了，提示用户
      break
    case 'ABORTED':
      // 用户主动取消，静默处理
      break
    case undefined:
      // 非 SDK 错误（如业务代码自身的 bug）
      throw e
  }
}
```

`isSdkError(e)` 是 `e instanceof SdkError` 的便捷类型守卫，配合 `getSdkErrorCode` 覆盖「即便不是 SdkError 也想拿到码」的场景。

## 重试策略

重试在请求层**自动**进行，由构造 `StockSDK` 时的 `retry`（`RetryOptions`）控制，采用指数退避。完整字段表与配置示例见 [请求治理 · 重试](/guide/request-governance#重试)。

**哪些错误会被重试**（默认）：

- `NETWORK_ERROR` —— 当 `retryOnNetworkError !== false`。
- `TIMEOUT` —— 当 `retryOnTimeout !== false`。
- `HTTP_ERROR` / `RATE_LIMITED` —— 当状态码命中 `retryableStatusCodes`（默认 `[408, 429, 500, 502, 503, 504]`）。

**不会重试**的错误（重试无意义，重试只会浪费配额）：

- `ABORTED` —— 用户主动取消，重试违背意图。
- `CIRCUIT_OPEN` —— 熔断已打开，等冷却而非硬冲。
- `INVALID_SYMBOL` / `INVALID_ARGUMENT` / `NOT_FOUND` —— 参数 / 资源问题，重试结果不变。
- `PARSE_ERROR` / `UPSTREAM_EMPTY` / `UPSTREAM_ERROR` —— 上游数据问题，重试同样无效。

退避时间约为 `baseDelay × backoffMultiplier^(attempt-1)`，并受 `maxDelay` 截顶。每次重试前会触发 `RetryOptions.onRetry(attempt, error, delay)` 以及 client 级 `hooks.onRetry(ctx, error, delay)`（详见 [请求治理 · hooks](/guide/request-governance#v2-新增-请求生命周期-hooks)）。

```ts
const sdk = new StockSDK({
  retry: {
    maxRetries: 4,
    baseDelay: 500,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: (attempt, error, delay) =>
      console.warn(`重试 #${attempt}，${delay}ms 后；原因 ${error.message}`),
  },
})
```

### 应用层的退避补充

请求层重试用尽后仍失败，会把最后一个 `SdkError` 抛给调用方。若你想在应用层针对 `RATE_LIMITED` 做更长的退避，可结合 `getSdkErrorCode` 自行处理：

```ts
import { getSdkErrorCode } from 'stock-sdk/errors'

async function withBackoff<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (getSdkErrorCode(e) === 'RATE_LIMITED' && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
        continue
      }
      throw e
    }
  }
  throw new Error('unreachable')
}

const q = await withBackoff(() => sdk.quotes.cn(['600519']))
```

## 错误处理实践

- **按 `code` 分支，而非 `message`**：`message` 文案可能变化，`code` 是稳定契约。
- **首选 `getSdkErrorCode`**：覆盖 `instanceof` 漏判的边角（如被附加元数据的原生错误）。
- **区分用户取消与超时**：`ABORTED`（外部 `signal`）≠ `TIMEOUT`（内部超时），前者通常应静默。
- **空数据 vs 错误**：`UPSTREAM_EMPTY` 表示「查到了但没数据」，`UPSTREAM_ERROR` 表示「上游明确报错」，二者处理策略不同。

> v2 SDK 仍在实现中：错误码集合、子类与 `getSdkErrorCode` / `isSdkError` 行为稳定；**个别 throw 点的精确归类以最终实现为准**。

## 相关阅读

- [请求治理](/guide/request-governance) —— 超时 / 重试 / 限流 / 熔断 / host fallback / hooks 的完整配置。
