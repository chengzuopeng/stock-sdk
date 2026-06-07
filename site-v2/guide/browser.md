# 浏览器使用

stock-sdk 是**浏览器 + Node.js 18+ 双端**的零依赖 SDK，同一套代码两端可用。但浏览器环境有它自己的约束——主要是跨域（CORS）与部分数据源的取数方式差异。本页讲清楚这些差异以及如何应对。

## 基本用法

浏览器里用法与 Node 一致，直接 `import` 即可（ESM）：

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const quotes = await sdk.quotes.cn(['600519', '000001'])
```

主入口纯库、零运行时依赖，配合 subpath 导出（`stock-sdk/indicators`、`stock-sdk/signals`、`stock-sdk/symbols`），只用纯计算时 bundle 不会拖入网络层。

## CORS：浏览器的核心约束

行情数据来自第三方上游（腾讯 / 东财 / 新浪等）。这些接口**不一定为你的页面域名开放 CORS**，浏览器会因同源策略拦下跨域响应。这是浏览器环境与 Node 最大的区别——Node 端没有同源策略，直接请求即可。

应对方式：

1. **走自建代理**：在你自己的后端 / 边缘函数转发请求，由服务端去取上游数据，再以同源方式返回给前端。这是生产环境最稳妥的做法。

2. **注入自定义 `fetch`**：v2 请求层支持注入 `fetchImpl`，你可以把请求改道到自己的代理：

   ```ts
   const sdk = new StockSDK({
     fetchImpl: (url, init) => {
       // 改写为自家代理地址
       const proxied = `https://your-proxy.example.com/?u=${encodeURIComponent(String(url))}`
       return fetch(proxied, init)
     },
   })
   ```

   `fetchImpl` 也可在单次调用通过 `GetOptions` 覆盖。详见[请求治理](/guide/request-governance)。

3. **对支持的源用 `<script>` 注入取数**：部分数据源天然以「JS 全局变量 / JSONP」形式提供数据，可绕过 CORS（见下）。

::: warning 不要硬刚 CORS
浏览器端无法用前端代码「关闭」CORS。直接请求不开放跨域的接口必然失败，必须通过代理或下面的 `<script>` 注入方式取数。
:::

## `<script>` 注入式数据源

部分上游数据源（如新浪的部分行情、腾讯搜索 smartbox、基金估值 fundgz）以 **JSONP / 全局变量** 形式提供数据。这类源**不走标准 `fetch`**，而是浏览器端通过动态插入 `<script>` 标签、读取脚本执行后挂在 `window` 上的全局变量来取数——因为 `<script>` 加载不受同源策略限制，从而绕过 CORS。

stock-sdk 内部封装了这套机制（`core/jsVars.ts` + `core/scriptMutex.ts`），对调用方透明：你照常调用对应方法即可，SDK 自动按当前环境选取正确的取数路径。

- **浏览器端**：自动用 `<script>` 注入读取全局变量 / JSONP。
- **Node 端**：这些源走普通 HTTP 取数后解析，无需 `<script>`。

::: tip 错误处理
`<script>` 注入路径不经过 `RequestClient`，但 v2 已对这些路径单独收编错误：脚本加载失败抛 `NETWORK_ERROR`，超时抛 `TIMEOUT`，都是统一的 `SdkError`。错误码与重试见[错误处理与重试](/guide/retry)。
:::

## 双端差异一览

| 维度 | 浏览器 | Node.js 18+ |
|---|---|---|
| 同源策略 / CORS | 受限，需代理或 `<script>` 注入 | 无限制，直接请求 |
| `<script>` 注入式源 | 用动态 `<script>` 读全局变量 | 走普通 HTTP 取数解析 |
| 默认 `fetch` | 浏览器原生 `fetch` | Node 原生 `fetch`（18+ 内置） |
| `AbortSignal.any` | 现代浏览器支持 | 18.17+ 支持，更低版本由 SDK 内置降级 |
| CLI / MCP | 不涉及（Node-only） | `stock-sdk` 命令与 `stock-sdk mcp` |

SDK 在内部根据运行环境自动选择取数路径，**业务调用代码两端完全一致**——你不需要为浏览器写一套、为 Node 写另一套。

## 实践建议

- **生产环境优先用自建代理**，把上游请求收敛到服务端，既解决 CORS，也便于加缓存、限流与密钥保护。
- **纯前端 Demo / 内网工具**可考虑 `<script>` 注入式源，或用公共代理（注意稳定性与合规）。
- **按需 subpath 导入**：浏览器侧只用指标 / 信号 / 符号解析时，从 `stock-sdk/indicators` 等子入口引入，避免把请求层打进 bundle。
- **统一注入 `fetchImpl`** 做代理改道、日志或 mock，详见[请求治理](/guide/request-governance)。
