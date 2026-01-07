# 搜索

## search

搜索股票代码、名称或拼音缩写。支持 A 股、港股、美股。

### 类型定义

```ts
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
  /** 资产类别 (GP-A/GP/KJ 等) */
  type: string;
}

function search(keyword: string): Promise<SearchResult[]>;
```

### 参数

| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `keyword` | `string` | 关键词（如 `600519`, `maotai`, `腾讯`） |

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
//     type: 'GP-A'
//   }
// ]

// 搜索港股腾讯
const hkResults = await sdk.search('00700');
```

### 跨域说明

此接口在浏览器环境下通过 **Script Tag Injection (JSONP)** 模式实现，无需配置代理即可直接跨域调用。在 Node.js 环境下使用标准 HTTP 请求。
