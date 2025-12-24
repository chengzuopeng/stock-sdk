# 代码列表

获取各市场股票代码列表，适合用于批量行情、筛选器或自动化任务。

## getAShareCodeList

获取全部 A 股代码列表（沪市、深市、北交所 5000+ 只股票）。

### 签名

```typescript
getAShareCodeList(includeExchange?: boolean): Promise<string[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `includeExchange` | `boolean` | `true` | 是否包含交易所前缀 |

### 示例

```typescript
// 包含交易所前缀
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj430047', ...]

// 不包含交易所前缀
const pureCodes = await sdk.getAShareCodeList(false);
// ['600000', '000001', '430047', ...]
```

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
getUSCodeList(includeMarket?: boolean): Promise<string[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `includeMarket` | `boolean` | `true` | 是否包含市场前缀（如 `105.`） |

### 示例

```typescript
// 包含市场前缀（默认）
const codes = await sdk.getUSCodeList();
// ['105.MSFT', '105.AAPL', '106.BABA', ...]

// 不包含市场前缀
const pureCodes = await sdk.getUSCodeList(false);
// ['MSFT', 'AAPL', 'BABA', ...]
```

::: tip 市场代码说明
- `105` = 纳斯达克
- `106` = 纽交所
- `107` = 其他
:::
