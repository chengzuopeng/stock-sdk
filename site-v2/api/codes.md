# sdk.codes · 代码列表

`sdk.codes` 命名空间返回各市场的**全量代码列表**，用于构建自选清单、批量取数的输入，或本地检索。结果通常体积较大、变动较慢，适合配合 [缓存层](/api/) 设置较长 TTL。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const cn = await sdk.codes.cn()
```

## 方法表

| 方法 | 说明 |
|---|---|
| `codes.cn(opts?)` | A 股代码列表 |
| `codes.us(opts?)` | 美股代码列表 |
| `codes.hk()` | 港股代码列表 |
| `codes.fund()` | 基金代码列表 |

> v1 的 `getAShareCodeList(boolean)` / `getUSCodeList(boolean)` 旧布尔签名已移除，v2 统一使用 options 对象（无参或 `{...}`）。详见 [从 v1 迁移](/guide/migration-v1-to-v2)。

## 调用示例

```ts
// A 股全量代码
const cn = await sdk.codes.cn()
console.log(cn.length, cn[0]) // { code, name, ... }

// 美股 / 港股 / 基金
const us = await sdk.codes.us()
const hk = await sdk.codes.hk()
const fund = await sdk.codes.fund()
```

### 配合批量行情

代码列表常作为 [batch](/api/batch) 或 [quotes](/api/quotes) 的输入：

```ts
const cn = await sdk.codes.cn()
const top100 = cn.slice(0, 100).map((it) => it.code)
const quotes = await sdk.quotes.cnSimple(top100)
```

### 建议缓存

代码列表更新频率低，推荐启用缓存（默认 TTL 6 小时）：

```ts
const sdk = new StockSDK({
  cache: { enabled: true, policies: { codeList: { ttl: 6 * 3600_000 } } },
})
const cn = await sdk.codes.cn() // 首次拉取，后续命中缓存
```

## 返回说明

每个方法返回**代码项数组**，每项至少包含代码与名称等基础标识字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `string` | 纯代码（无前缀） |
| `name` | `string` | 名称 |
| `market` | `Market` | 所属市场 |

> 具体字段（如是否含 `exchange` / `pinyin` / 上市状态等）以实现为准，随 `src/sdk/namespaces` 与对应类型定义最终确定。
