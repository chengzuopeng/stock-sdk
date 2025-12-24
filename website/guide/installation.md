# 安装

## 包管理器安装

::: code-group

```bash [npm]
npm install stock-sdk
```

```bash [yarn]
yarn add stock-sdk
```

```bash [pnpm]
pnpm add stock-sdk
```

:::

## CDN 引入

你也可以直接在浏览器中通过 CDN 使用：

```html
<script type="module">
  import { StockSDK } from 'https://unpkg.com/stock-sdk/dist/index.js';

  const sdk = new StockSDK();
  const quotes = await sdk.getFullQuotes(['sz000858']);
  console.log(quotes[0].name, quotes[0].price);
</script>
```

## 环境要求

- **Node.js**: >= 18.0.0（依赖原生 `fetch` / `AbortController` / `TextDecoder`）
- **浏览器**: 所有现代浏览器（Chrome, Firefox, Safari, Edge）

::: tip 关于 GBK 编码
SDK 使用原生 `TextDecoder` 解码 GBK 编码数据，无需额外 polyfill。
:::

::: tip 旧版 Node.js
若你需要在 Node 18 以下运行，请自行补齐 `fetch` 与 `TextDecoder` 的 polyfill（不作为官方支持范围）。
:::

## TypeScript 支持

Stock SDK 使用 TypeScript 编写，提供完整的类型定义：

```typescript
import { StockSDK, FullQuote, HistoryKline } from 'stock-sdk';

const sdk = new StockSDK();

// 类型自动推断
const quotes: FullQuote[] = await sdk.getFullQuotes(['sz000858']);
const klines: HistoryKline[] = await sdk.getHistoryKline('sz000858');
```

## 模块格式

SDK 同时提供 ESM 和 CommonJS 两种格式：

```javascript
// ESM
import { StockSDK } from 'stock-sdk';

// CommonJS
const { StockSDK } = require('stock-sdk');
```
