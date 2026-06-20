# search · 股票搜索

`sdk.search(keyword)` 是挂在 SDK 顶层的快捷方法，按代码、名称或拼音缩写搜索标的，覆盖 A 股、港股、美股、基金与指数。

| 方法 | 说明 |
|---|---|
| `sdk.search(keyword)` | 关键词搜索，返回 `SearchResult[]` |
| `generateSearchExternalLinks(result)` | 纯工具函数：把单条结果转成东方财富 / 雪球等外部链接 |

## sdk.search

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | `string` | 是 | 关键词，如 `'600519'` / `'maotai'` / `'腾讯'` / `'00700'` |

### 调用示例

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 搜索茅台
const results = await sdk.search('maotai');
console.log(results);
// [
//   {
//     code: 'sh600519',
//     name: '贵州茅台',
//     market: 'sh',
//     type: 'GP-A',      // 上游原始资产类型
//     category: 'stock'  // 标准化分类
//   }
// ]

// 搜索港股腾讯
const hk = await sdk.search('00700');

// 推荐用 category 做稳定分类判断
const stocks = results.filter((r) => r.category === 'stock');
```

### 返回说明

返回 `Promise<SearchResult[]>`：

```ts
interface SearchResult {
  code: string;               // 完整代码，如 'sh600519'
  name: string;               // 名称
  market: string;             // 市场标识（sh/sz/hk/us）
  type: string;               // 上游原始资产类型字符串（如 'GP-A' / 'ZS' / 'KJ'）
  category?: SearchResultType; // 标准化分类，便于跨源统一判断
}

type SearchResultType =
  | 'stock'
  | 'index'
  | 'fund'
  | 'bond'
  | 'futures'
  | 'option'
  | 'other';
```

::: tip type vs category
`type` 透传上游原始字符串（不做 union 收紧，上游新增类型也能照常传出）；`category` 是 SDK 归一化后的稳定分类。**做分类判断请优先用 `category`。**
:::

`type` 常见取值与 `category` 归并关系：

| 分类 | 原始 `type` 取值 | 归并到 `category` |
|---|---|---|
| 股票 | `GP-A` / `GP-B` / `GP` | `stock` |
| 指数 | `ZS` | `index` |
| 场内基金 | `ETF` / `LOF` / `QDII-ETF` / `QDII-LOF` | `fund` |
| 场外基金 | `KJ` / `KJ-HB` / `KJ-CX` / `QDII` / `QDII-FOF` | `fund` |
| 债券 | `ZQ*` | `bond` |
| 期货 | `QH*` | `futures` |
| 期权 | `QZ*` / `OPTION*` | `option` |
| 其他 | 上述未覆盖 | `other` |

> 具体字段以实现为准。

## generateSearchExternalLinks

纯工具函数，根据单条 `SearchResult` 生成跳转到东方财富、雪球等外部财经站点的链接；不修改搜索结果本身，无法直达的市场会退回站内搜索页。

### 导入与签名

```ts
import { generateSearchExternalLinks } from 'stock-sdk';

interface ExternalLink {
  name: string;
  url: string;
}

function generateSearchExternalLinks(result: SearchResult): ExternalLink[];
```

### 调用示例

```ts
import { StockSDK, generateSearchExternalLinks } from 'stock-sdk';

const sdk = new StockSDK();
const [maotai] = await sdk.search('maotai');
const links = generateSearchExternalLinks(maotai);

console.log(links);
// [
//   { name: '东方财富', url: 'https://quote.eastmoney.com/sh600519.html' },
//   { name: '雪球',     url: 'https://xueqiu.com/S/SH600519' }
// ]
```

## 注意事项

1. **跨域**：浏览器环境下通过 Script Tag Injection（JSONP）实现，无需配置代理即可跨域调用；Node.js 环境下走标准 HTTP 请求。
2. **错误统一**：浏览器端 JSONP 路径的网络失败也会归一化为 `SdkError`（`NETWORK_ERROR`），与 Node 端一致，见 [错误处理](../guide/retry.md)。
3. **分类判断**：跨数据源做类型判断请用 `category`，不要依赖原始 `type` 字符串。
4. **取行情下一步**：拿到 `SearchResult.code` 后，可据 `category` 选对应行情方法——股票走 [`sdk.quotes.*`](./quotes.md)，基金走 [`sdk.quotes.fund()`](./quotes.md) / [`sdk.fund.*`](./fund.md)。
