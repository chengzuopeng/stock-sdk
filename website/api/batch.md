# 批量查询

Stock SDK 提供全市场批量行情、指定代码批量行情和底层原始混合查询接口。

::: tip 代码列表
获取各市场代码列表请查看 [代码列表](/api/code-lists)。
:::

## getAllAShareQuotes

```ts
getAllAShareQuotes(options?: {
  market?: AShareMarket;
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<FullQuote[]>
```

适合一次性拉取全市场 A 股行情，并支持 `market`、`batchSize`、`concurrency` 和 `onProgress`。

## getAllQuotesByCodes

```ts
getAllQuotesByCodes(
  codes: string[],
  options?: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<FullQuote[]>
```

### 返回顺序

`getAllQuotesByCodes` 的返回顺序与传入 codes 一致，便于和你自己的 watchlist、表格行或缓存索引直接对齐。

```ts
const codes = ['sz000858', 'sh600519', 'sh600000', 'sz000001'];
const quotes = await sdk.getAllQuotesByCodes(codes, {
  batchSize: 100,
  concurrency: 2,
});

console.log(quotes.map((item) => item.code));
// ['sz000858', 'sh600519', 'sh600000', 'sz000001']
```

## getAllHKShareQuotes

```ts
getAllHKShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<HKQuote[]>
```

## getAllUSShareQuotes

```ts
getAllUSShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  market?: 'NASDAQ' | 'NYSE' | 'AMEX';
}): Promise<USQuote[]>
```

## batchRaw

```ts
batchRaw(params: string): Promise<{ key: string; fields: string[] }[]>
```

`batchRaw` 用于发送底层混合行情请求，适合需要自行解析原始字段的高级场景。

```ts
const raw = await sdk.batchRaw('sz000858,s_sh000001,jj000001');

console.log(raw[0].key);
console.log(raw[0].fields);
```

## 性能建议

- 网络较弱时降低 `concurrency`
- 单次请求过大时降低 `batchSize`
- 需要更细的策略控制时，配合 [请求治理](/guide/request-governance) 中的 `providerPolicies`

## 相关页面

- [代码列表](/api/code-lists)
- [请求治理](/guide/request-governance)
