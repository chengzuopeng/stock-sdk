# Installation

## Package Manager

::: code-group

```bash [npm]
npm install stock-sdk@1.10.1
```

```bash [yarn]
yarn add stock-sdk@1.10.1
```

```bash [pnpm]
pnpm add stock-sdk@1.10.1
```

:::

## CDN

For browser usage, you can use unpkg or jsDelivr:

```html
<!-- unpkg -->
<script type="module">
  import { StockSDK } from 'https://unpkg.com/stock-sdk@1.10.1/dist/index.js';
  const sdk = new StockSDK();
</script>

<!-- jsDelivr -->
<script type="module">
  import { StockSDK } from 'https://cdn.jsdelivr.net/npm/stock-sdk@1.10.1/dist/index.js';
  const sdk = new StockSDK();
</script>
```

## Requirements

- **Node.js**: >= 18.0.0
- **Browser**: Modern browsers with ES Module support

## TypeScript

Stock SDK is written in TypeScript and provides complete type definitions. No additional `@types` packages needed.

```typescript
import { StockSDK, FullQuote, KlineData } from 'stock-sdk';

const sdk = new StockSDK();
const quotes: FullQuote[] = await sdk.getFullQuotes(['sz000858']);
```

## Next Steps

- [Quick Start](/en/guide/getting-started) - Start using Stock SDK
- [Browser Usage](/en/guide/browser) - Using in browser environment
