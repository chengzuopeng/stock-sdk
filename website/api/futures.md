# 期货行情

## getFuturesKline

获取国内期货历史 K 线（日/周/月），数据来源：东方财富。

支持上期所(SHFE)、大商所(DCE)、郑商所(CZCE)、上期能源(INE)、中金所(CFFEX)、广期所(GFEX)全部品种。

### 签名

```typescript
getFuturesKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
  }
): Promise<FuturesKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 合约代码，如 `'rb2605'`（具体合约）或 `'RBM'`（主连） |
| `period` | `string` | `'daily'` | K 线周期：`'daily'` / `'weekly'` / `'monthly'` |
| `startDate` | `string` | - | 开始日期 `YYYYMMDD` |
| `endDate` | `string` | - | 结束日期 `YYYYMMDD` |

### symbol 格式

| 输入格式 | 说明 | 示例 |
|----------|------|------|
| `品种 + 合约月份` | 具体合约 | `rb2605`、`IF2604`、`TA509` |
| `品种 + M` | 主力连续合约 | `RBM`、`IFM`、`TAM`、`scM` |

### 返回类型

```typescript
interface FuturesKline {
  date: string;               // 日期 YYYY-MM-DD
  code: string;               // 合约代码
  name: string;               // 合约名称
  open: number | null;        // 开盘价
  close: number | null;       // 收盘价
  high: number | null;        // 最高价
  low: number | null;         // 最低价
  volume: number | null;      // 成交量
  amount: number | null;      // 成交额
  amplitude: number | null;   // 振幅 %
  changePercent: number | null;  // 涨跌幅 %
  change: number | null;         // 涨跌额
  turnoverRate: number | null;   // 换手率 %
  openInterest: number | null;   // 持仓量
}
```

### 示例

```typescript
// 获取螺纹钢主连日 K
const klines = await sdk.getFuturesKline('RBM');

// 获取沪深300期货具体合约周 K
const weeklyKlines = await sdk.getFuturesKline('IF2604', {
  period: 'weekly',
  startDate: '20250101',
});

klines.forEach(k => {
  console.log(`${k.date}: 收 ${k.close} 持仓 ${k.openInterest}`);
});
```

---

## getGlobalFuturesSpot

获取全球期货实时行情（COMEX、NYMEX、CBOT、SGX、NYBOT、LME、MDEX、TOCOM、IPE），数据来源：东方财富。

### 签名

```typescript
getGlobalFuturesSpot(
  options?: {
    pageSize?: number;
  }
): Promise<GlobalFuturesQuote[]>
```

### 返回类型

```typescript
interface GlobalFuturesQuote {
  code: string;               // 合约代码
  name: string;               // 名称
  price: number | null;       // 最新价
  change: number | null;      // 涨跌额
  changePercent: number | null;  // 涨跌幅 %
  open: number | null;        // 今开
  high: number | null;        // 最高
  low: number | null;         // 最低
  prevSettle: number | null;  // 昨结算价
  volume: number | null;      // 成交量
  buyVolume: number | null;   // 买盘量
  sellVolume: number | null;  // 卖盘量
  openInterest: number | null;   // 持仓量
}
```

### 示例

```typescript
const quotes = await sdk.getGlobalFuturesSpot();
quotes.forEach(q => {
  console.log(`${q.name} (${q.code}): ${q.price} ${q.changePercent}%`);
});
```

---

## getGlobalFuturesKline

获取全球期货历史 K 线（日/周/月），数据来源：东方财富。

### 签名

```typescript
getGlobalFuturesKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
    marketCode?: number;
  }
): Promise<FuturesKline[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 合约代码，如 `'HG00Y'`（COMEX铜连续） |
| `period` | `string` | `'daily'` | K 线周期 |
| `marketCode` | `number` | - | 东方财富市场代码（用于未内置的品种） |

### 内置品种

| 市场 | 品种 | 市场代码 |
|------|------|----------|
| COMEX | HG, GC, SI, QI, QO, MGC | 101 |
| NYMEX | CL, NG, RB, HO, PA, PL | 102 |
| CBOT | ZW, ZM, ZS, ZC, ZL, ZR, YM, NQ, ES | 103 |
| NYBOT | SB, CT | 108 |
| LME | LCPT, LZNT, LALT | 109 |

### 示例

```typescript
// 获取 COMEX 铜连续日 K
const klines = await sdk.getGlobalFuturesKline('HG00Y');

// 获取纽约原油周 K
const oilKlines = await sdk.getGlobalFuturesKline('CL00Y', {
  period: 'weekly',
  startDate: '20250101',
});
```

---

## getFuturesInventorySymbols

获取期货库存品种列表，数据来源：东方财富数据中心。

### 签名

```typescript
getFuturesInventorySymbols(): Promise<FuturesInventorySymbol[]>
```

### 返回类型

```typescript
interface FuturesInventorySymbol {
  code: string;       // 品种代码
  name: string;       // 品种名称
  marketCode: string; // 市场代码
}
```

### 示例

```typescript
const symbols = await sdk.getFuturesInventorySymbols();
symbols.forEach(s => {
  console.log(`${s.name} (${s.code})`);
});
```

---

## getFuturesInventory

获取期货库存数据，数据来源：东方财富数据中心。

### 签名

```typescript
getFuturesInventory(
  symbol: string,
  options?: {
    startDate?: string;
    pageSize?: number;
  }
): Promise<FuturesInventory[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | - | 品种代码（从 `getFuturesInventorySymbols` 获取） |
| `startDate` | `string` | `'2020-10-28'` | 开始日期 `YYYY-MM-DD` |

### 返回类型

```typescript
interface FuturesInventory {
  code: string;             // 品种代码
  date: string;             // 日期
  inventory: number | null; // 库存量
  change: number | null;    // 增减
}
```

### 示例

```typescript
const inventory = await sdk.getFuturesInventory('rb');
inventory.forEach(item => {
  console.log(`${item.date}: 库存 ${item.inventory} 增减 ${item.change}`);
});
```

---

## getComexInventory

获取 COMEX 黄金/白银库存数据，数据来源：东方财富数据中心。

### 签名

```typescript
getComexInventory(
  symbol: 'gold' | 'silver',
  options?: {
    pageSize?: number;
  }
): Promise<ComexInventory[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | `'gold'`（黄金）或 `'silver'`（白银） |

### 返回类型

```typescript
interface ComexInventory {
  date: string;                // 日期
  name: string;                // 品种名称
  storageTon: number | null;   // 库存量（吨）
  storageOunce: number | null; // 库存量（盎司）
}
```

### 示例

```typescript
// 获取 COMEX 黄金库存
const goldInventory = await sdk.getComexInventory('gold');
goldInventory.forEach(item => {
  console.log(`${item.date}: ${item.storageTon} 吨`);
});

// 获取 COMEX 白银库存
const silverInventory = await sdk.getComexInventory('silver');
```
