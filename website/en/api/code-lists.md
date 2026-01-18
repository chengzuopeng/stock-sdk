# Code Lists

Get stock code lists for different markets.

## getAShareCodeList

Get all A-Share stock codes (Shanghai, Shenzhen, Beijing exchanges).

### Signature

```typescript
getAShareCodeList(options?: GetAShareCodeListOptions): Promise<string[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.simple` | `boolean` | `false` | Return simplified codes without exchange prefix |
| `options.market` | `AShareMarket` | - | Filter by specific exchange or board |

### AShareMarket Type

```typescript
type AShareMarket = 'sh' | 'sz' | 'bj' | 'kc' | 'cy';
```

| Value | Description | Code Pattern |
|-------|-------------|--------------|
| `'sh'` | Shanghai Stock Exchange | Starts with 6 (includes STAR Market) |
| `'sz'` | Shenzhen Stock Exchange | Starts with 0 or 3 (includes ChiNext) |
| `'bj'` | Beijing Stock Exchange | Starts with 92 |
| `'kc'` | STAR Market (科创板) | Starts with 688 |
| `'cy'` | ChiNext (创业板) | Starts with 30 |

### Examples

```typescript
// Get all A-Share codes with exchange prefix
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj920001', ...]

// Without exchange prefix
const pureCodes = await sdk.getAShareCodeList({ simple: true });
// ['600000', '000001', '920001', ...]

// Get STAR Market stocks
const kcCodes = await sdk.getAShareCodeList({ market: 'kc' });
// ['sh688001', 'sh688002', ...]

// Get ChiNext stocks without prefix
const cyCodes = await sdk.getAShareCodeList({ simple: true, market: 'cy' });
// ['300001', '300002', ...]
```

::: tip Backward Compatibility
This method still supports the legacy signature `getAShareCodeList(includeExchange?: boolean)` for backward compatibility.
:::

## getHKCodeList

Get all Hong Kong stock codes.

```typescript
const codes = await sdk.getHKCodeList();
// ['00001', '00002', ..., '00700', ...]
```

## getUSCodeList

Get all US stock codes.

### Signature

```typescript
getUSCodeList(options?: GetUSCodeListOptions): Promise<string[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.simple` | `boolean` | `false` | Remove market prefix (e.g. `105.`) |
| `options.market` | `USMarket` | - | Filter by specific market |

### USMarket Type

```typescript
type USMarket = 'NASDAQ' | 'NYSE' | 'AMEX';
```

| Value | Description | Code Prefix |
|-------|-------------|-------------|
| `'NASDAQ'` | NASDAQ | `105.` |
| `'NYSE'` | NYSE | `106.` |
| `'AMEX'` | AMEX/NYSE Arca | `107.` |

### Example

```typescript
// Get all US stocks (with market prefix)
const codes = await sdk.getUSCodeList();
// ['105.AAPL', '105.MSFT', '106.BABA', ...]

// Get all US stocks (without market prefix)
const pureCodes = await sdk.getUSCodeList({ simple: true });
// ['AAPL', 'MSFT', 'BABA', ...]

// Filter NASDAQ stocks
const nasdaqCodes = await sdk.getUSCodeList({ market: 'NASDAQ' });
// ['105.AAPL', '105.MSFT', ...]

// Filter NYSE stocks
const nyseCodes = await sdk.getUSCodeList({ market: 'NYSE' });
// ['106.BABA', ...]

// Get NASDAQ stocks without prefix
const nasdaqPure = await sdk.getUSCodeList({ simple: true, market: 'NASDAQ' });
// ['AAPL', 'MSFT', ...]
```

::: tip Backward Compatibility
This method still supports legacy API signature `getUSCodeList(includeMarket?: boolean)`.
:::

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Get A-Share codes
const aCodes = await sdk.getAShareCodeList();
console.log(`A-Share: ${aCodes.length} stocks`);

// Get HK codes
const hkCodes = await sdk.getHKCodeList();
console.log(`HK: ${hkCodes.length} stocks`);

// Get US codes
const usCodes = await sdk.getUSCodeList();
console.log(`US: ${usCodes.length} stocks`);
```

