# 浏览器使用

Stock SDK 完全支持在浏览器环境中使用，无需任何额外配置。

## CDN 引入

最简单的方式是通过 CDN 直接引入：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stock SDK Demo</title>
</head>
<body>
  <div id="result"></div>

  <script type="module">
    import { StockSDK } from 'https://unpkg.com/stock-sdk/dist/index.js';

    const sdk = new StockSDK();
    const quotes = await sdk.getFullQuotes(['sz000858', 'sh600519']);

    document.getElementById('result').innerHTML = quotes.map(q => 
      `<p>${q.name}: ${q.price} (${q.changePercent}%)</p>`
    ).join('');
  </script>
</body>
</html>
```

## 构建工具集成

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  // 无需特殊配置
});
```

```typescript
// main.ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
// ...
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  // 无需特殊配置
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
```

## React 示例

```tsx
import { useState, useEffect } from 'react';
import { StockSDK, SimpleQuote } from 'stock-sdk';

const sdk = new StockSDK();

function StockList() {
  const [quotes, setQuotes] = useState<SimpleQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const data = await sdk.getSimpleQuotes(['sh000001', 'sz000858']);
        setQuotes(data);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotes();
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <ul>
      {quotes.map(q => (
        <li key={q.code}>
          {q.name}: {q.price} ({q.changePercent}%)
        </li>
      ))}
    </ul>
  );
}

export default StockList;
```

## Vue 示例

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { StockSDK, SimpleQuote } from 'stock-sdk';

const sdk = new StockSDK();
const quotes = ref<SimpleQuote[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    quotes.value = await sdk.getSimpleQuotes(['sh000001', 'sz000858']);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="loading">加载中...</div>
  <ul v-else>
    <li v-for="q in quotes" :key="q.code">
      {{ q.name }}: {{ q.price }} ({{ q.changePercent }}%)
    </li>
  </ul>
</template>
```

## 注意事项

### CORS 跨域

SDK 调用的财经接口（腾讯、东方财富）通常允许跨域访问。如果遇到 CORS 问题，可以：

1. 使用代理服务器转发请求
2. 在开发环境配置 Vite/Webpack 代理

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/tencent': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent/, ''),
      },
    },
  },
});
```

然后在 SDK 中指定 `baseUrl`：

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK({
  baseUrl: '/api/tencent',
});
```

### GBK 编码

SDK 使用原生 `TextDecoder` 解码 GBK 编码数据，所有现代浏览器都支持，无需额外 polyfill。

### 请求频率

建议控制请求频率，避免触发接口限制：

```typescript
// 使用批量查询减少请求次数
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

// 而不是多次单独查询
// ❌ 不推荐
// const q1 = await sdk.getSimpleQuotes(['sh000001']);
// const q2 = await sdk.getSimpleQuotes(['sz000858']);
```
