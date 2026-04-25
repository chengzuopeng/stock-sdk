# 搜索

## search

搜索股票代码、名称或拼音缩写。支持 A 股、港股、美股、基金和指数。

### 类型定义

```ts
/**
 * 标准化后的资产分类
 * - 由 SDK 在原始 `type` 字符串基础上做归一化
 */
type SearchResultType =
  | 'stock'
  | 'index'
  | 'fund'
  | 'bond'
  | 'futures'
  | 'option'
  | 'other';

/**
 * 股票搜索结果
 */
export interface SearchResult {
  /** 股票代码（完整，如 sh600519） */
  code: string;
  /** 股票名称 */
  name: string;
  /** 市场标识 (sh/sz/hk/us) */
  market: string;
  /** 上游原始资产类型字符串（如 'GP-A' / 'ZS' / 'KJ' 等） */
  type: string;
  /** 标准化后的资产分类，便于跨数据源统一判断 */
  category?: SearchResultType;
}

function search(keyword: string): Promise<SearchResult[]>;
```

### 参数

| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `keyword` | `string` | 关键词（如 `600519`, `maotai`, `腾讯`） |

### `type` 字段（原始值）

`type` 保留腾讯接口返回的原始资产类型字符串，常见取值如下：

| 分类 | 值 | 说明 |
| :--- | :--- | :--- |
| **股票** | `GP-A` | A 股（沪深主板 / 创业板 / 科创板） |
| | `GP-B` | B 股 |
| | `GP` | 通用股票（港股 / 美股 / 其他） |
| **指数** | `ZS` | 指数 |
| **场内基金** | `ETF` | ETF |
| | `LOF` | LOF |
| | `QDII-ETF` | 跨境 ETF |
| | `QDII-LOF` | 跨境 LOF |
| **场外基金** | `KJ` | 开放式基金（混合/股票/债券等） |
| | `KJ-HB` | 货币基金 |
| | `KJ-CX` | 创新基金 |
| | `QDII` | QDII 基金 |
| | `QDII-FOF` | QDII-FOF 基金 |

::: tip
`type` 是 `string`，未做 union 收紧；上游若新增类型也能正常透传。如需稳定的分类判断，请使用下方的 `category`。
:::

### `category` 字段（标准化分类）

`category` 是 SDK 在原始 `type` 基础上做的归一化结果，便于跨数据源统一处理：

| 值 | 含义 | 归并自 |
| :--- | :--- | :--- |
| `stock` | 股票 | `GP-A` / `GP-B` / `GP` |
| `index` | 指数 | `ZS` |
| `fund` | 基金 | `ETF` / `LOF` / `KJ` / `QDII*` 等 |
| `bond` | 债券 | `ZQ*` |
| `futures` | 期货 | `QH*` |
| `option` | 期权 | `QZ*` / `OPTION*` |
| `other` | 其他 | 上述未覆盖的类型 |

### 示例

```ts
// 搜索茅台
const results = await sdk.search('maotai');
console.log(results);
// 输出:
// [
//   {
//     code: 'sh600519',
//     name: '贵州茅台',
//     market: 'sh',
//     type: 'GP-A',     // 原始资产类型
//     category: 'stock' // 标准化分类
//   }
// ]

// 搜索港股腾讯
const hkResults = await sdk.search('00700');

// 推荐用 category 做分类判断
const stocks = results.filter(r => r.category === 'stock');
```

### 跨域说明

此接口在浏览器环境下通过 **Script Tag Injection (JSONP)** 模式实现，无需配置代理即可直接跨域调用。在 Node.js 环境下使用标准 HTTP 请求。
