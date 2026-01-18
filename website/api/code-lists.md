# 代码列表

获取各市场股票代码列表，适合用于批量行情、筛选器或自动化任务。

## getAShareCodeList

获取全部 A 股代码列表（沪市、深市、北交所 5000+ 只股票）。

### 签名

```typescript
getAShareCodeList(options?: GetAShareCodeListOptions): Promise<string[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `options.simple` | `boolean` | `false` | 是否返回简化代码（不含交易所前缀） |
| `options.market` | `AShareMarket` | - | 筛选特定交易所或板块 |

### AShareMarket 类型

```typescript
type AShareMarket = 'sh' | 'sz' | 'bj' | 'kc' | 'cy';
```

| 值 | 说明 | 代码特征 |
|----|------|----------|
| `'sh'` | 上交所 | 6 开头（包含科创板） |
| `'sz'` | 深交所 | 0 和 3 开头（包含创业板） |
| `'bj'` | 北交所 | 92 开头 |
| `'kc'` | 科创板 | 688 开头 |
| `'cy'` | 创业板 | 30 开头 |

### 示例

```typescript
// 获取全部 A 股（带交易所前缀）
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj920001', ...]

// 获取全部 A 股（不带交易所前缀）
const pureCodes = await sdk.getAShareCodeList({ simple: true });
// ['600000', '000001', '920001', ...]

// 获取科创板股票
const kcCodes = await sdk.getAShareCodeList({ market: 'kc' });
// ['sh688001', 'sh688002', ...]

// 获取创业板股票（不带前缀）
const cyCodes = await sdk.getAShareCodeList({ simple: true, market: 'cy' });
// ['300001', '300002', ...]

// 获取上交所股票
const shCodes = await sdk.getAShareCodeList({ market: 'sh' });
// ['sh600000', 'sh688001', ...]

// 获取北交所股票
const bjCodes = await sdk.getAShareCodeList({ market: 'bj' });
// ['bj920001', 'bj920002', ...]
```

::: tip 向后兼容
该方法仍支持旧 API 签名 `getAShareCodeList(includeExchange?: boolean)`，传入布尔值将自动转换。
:::

---

## getHKCodeList

获取全部港股代码列表。

### 签名

```typescript
getHKCodeList(): Promise<string[]>
```

### 示例

```typescript
const codes = await sdk.getHKCodeList();
// ['00700', '09988', '03690', ...]
```

---

## getUSCodeList

获取全部美股代码列表。

### 签名

```typescript
getUSCodeList(options?: GetUSCodeListOptions): Promise<string[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `options.simple` | `boolean` | `false` | 是否移除市场前缀（如 `105.`） |
| `options.market` | `USMarket` | - | 筛选特定市场 |

### USMarket 类型

```typescript
type USMarket = 'NASDAQ' | 'NYSE' | 'AMEX';
```

| 值 | 说明 | 代码前缀 |
|----|------|----------|
| `'NASDAQ'` | 纳斯达克 | `105.` |
| `'NYSE'` | 纽交所 | `106.` |
| `'AMEX'` | 美交所/NYSE Arca | `107.` |

### 示例

```typescript
// 获取全部美股（带市场前缀）
const codes = await sdk.getUSCodeList();
// ['105.MSFT', '105.AAPL', '106.BABA', ...]

// 获取全部美股（不带市场前缀）
const pureCodes = await sdk.getUSCodeList({ simple: true });
// ['MSFT', 'AAPL', 'BABA', ...]

// 筛选纳斯达克股票
const nasdaqCodes = await sdk.getUSCodeList({ market: 'NASDAQ' });
// ['105.AAPL', '105.MSFT', ...]

// 筛选纽交所股票
const nyseCodes = await sdk.getUSCodeList({ market: 'NYSE' });
// ['106.BABA', ...]

// 获取纳斯达克股票（不带前缀）
const nasdaqPure = await sdk.getUSCodeList({ simple: true, market: 'NASDAQ' });
// ['AAPL', 'MSFT', ...]
```

::: tip 向后兼容
该方法仍支持旧 API 签名 `getUSCodeList(includeMarket?: boolean)`，传入布尔值将自动转换。
:::

::: tip 市场代码说明
- `NASDAQ` (105) = 纳斯达克
- `NYSE` (106) = 纽交所
- `AMEX` (107) = 美交所/NYSE Arca
:::
