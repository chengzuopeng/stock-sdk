# Browser Usage

Stock SDK is designed to work seamlessly in browser environments.

## Direct Import

```html
<!DOCTYPE html>
<html>
<head>
  <title>Stock SDK Demo</title>
</head>
<body>
  <div id="app"></div>
  
  <script type="module">
    import { StockSDK } from 'https://unpkg.com/stock-sdk@1.10.1/dist/index.js';
    
    const sdk = new StockSDK();
    
    // Get quotes
    const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858']);
    
    document.getElementById('app').innerHTML = quotes
      .map(q => `<p>${q.name}: ${q.price}</p>`)
      .join('');
  </script>
</body>
</html>
```

## With Build Tools

### Vite

```typescript
// main.ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

async function fetchQuotes() {
  const quotes = await sdk.getSimpleQuotes(['sh000001']);
  console.log(quotes);
}

fetchQuotes();
```

### React

```tsx
import { useEffect, useState } from 'react';
import { StockSDK, SimpleQuote } from 'stock-sdk';

const sdk = new StockSDK();

function StockList() {
  const [quotes, setQuotes] = useState<SimpleQuote[]>([]);

  useEffect(() => {
    sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519'])
      .then(setQuotes);
  }, []);

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
```

### Vue

```vue
<template>
  <ul>
    <li v-for="q in quotes" :key="q.code">
      {{ q.name }}: {{ q.price }} ({{ q.changePercent }}%)
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { StockSDK, SimpleQuote } from 'stock-sdk';

const sdk = new StockSDK();
const quotes = ref<SimpleQuote[]>([]);

onMounted(async () => {
  quotes.value = await sdk.getSimpleQuotes(['sh000001', 'sz000858']);
});
</script>
```

## CORS Handling

When using in browser, you may encounter CORS issues. Solutions:

### 1. Backend Proxy (Recommended)

Set up a proxy in your backend or development server:

```typescript
// Vite config
export default {
  server: {
    proxy: {
      '/api/qt': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/qt/, ''),
      },
    },
  },
};

// Then use
const sdk = new StockSDK({
  baseUrl: '/api/qt',
});
```

### 2. Serverless Function

Deploy a serverless function (Vercel, Cloudflare Workers, etc.) to proxy requests.

### 3. Browser Extension

For development purposes, you can use CORS browser extensions.

::: warning
Never disable CORS in production. Always use proper proxy solutions.
:::

## Next Steps

- [Technical Indicators](/en/guide/indicators)
- [Batch Query](/en/guide/batch)
