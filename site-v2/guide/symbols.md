# 符号与代码规则

stock-sdk v2 把「股票代码该怎么写」这件事彻底收敛到一个入口：`normalizeSymbol`。无论你写 `sh600519`、`600519`、`600519.SH` 还是 `{ code: '600519' }`，最终都会被解析成同一个内部表示，再交给各 provider 适配。

本页讲清楚两件事：

1. 入参怎么写（`string` 一等公民 + 可选 `SymbolRef`）；
2. 容错解析的规则、纯码歧义，以及哪些场景**必须**加 hint。

## 入参：string 一等公民 + SymbolRef

所有接受符号的方法都接受 `string | SymbolRef`：

```ts
type SymbolInput = string | SymbolRef;

interface SymbolRef {
  code: string;
  market?: 'CN' | 'HK' | 'US' | 'GLOBAL';
  assetType?: 'stock' | 'index' | 'fund' | 'bond' | 'futures' | 'option' | 'board';
  exchange?: string; // 'SSE' | 'SZSE' | 'BSE' | 'HKEX' | 'NASDAQ' | ...
}
```

裸 `string` 是首选写法，覆盖绝大多数日常场景：

```ts
await sdk.quotes.cn('600519');        // A 股
await sdk.quotes.cn(['sh600519', '000001']);
await sdk.quotes.hk('00700');         // 港股
await sdk.quotes.us('AAPL');          // 美股
```

`SymbolRef` 不是另一套体系，而是「**带提示的 string**」——它的 `code` 同样走 `normalizeSymbol`，只是额外携带 `market` / `assetType` / `exchange` 提示，用于消解歧义。两种写法共用同一套推断逻辑，不存在双实现漂移。

```ts
// 仅在纯码无法区分时才需要 SymbolRef
await sdk.quotes.fund({ code: '510300', assetType: 'fund' });
```

## normalizeSymbol：统一容错解析

`normalizeSymbol` 从 `stock-sdk/symbols` 导出，是纯函数、零网络、双端可用。SDK 内部每个 provider 第一步都会调用它，你也可以直接拿来做符号规范化。

```ts
import { normalizeSymbol } from 'stock-sdk/symbols';

normalizeSymbol('sh600519');
// → { market: 'CN', exchange: 'SSE', assetType: 'stock', code: '600519', input: 'sh600519' }

normalizeSymbol('AAPL');
// → { market: 'US', exchange: 'US', assetType: 'stock', code: 'AAPL', input: 'AAPL' }
```

返回的 `NormalizedSymbol` 是 SDK 内部唯一表示：

```ts
interface NormalizedSymbol {
  market: 'CN' | 'HK' | 'US' | 'GLOBAL';
  exchange: string;  // 强判别字段
  assetType: 'stock' | 'index' | 'fund' | 'bond' | 'futures' | 'option' | 'board';
  code: string;      // 纯代码，无前缀
  variety?: string;  // 期货品种（如 'IF' / 'RB'）
  input: string;     // 原始入参，便于报错与调试
}
```

> `market` 表示交易区域 / 体系，`exchange` 才是强判别字段。例如海外期货归 `market: 'GLOBAL'`，靠 `exchange`（COMEX / NYMEX / CBOT / LME …）区分交易所。

### 解析优先级链（命中即停）

`normalizeSymbol(input, hint?)` 按下面的顺序逐条尝试，命中即返回。`hint` 与 `SymbolRef` 字段冲突时，**显式入参（SymbolRef）优先**。

| 顺序 | 规则 | 示例 |
|---|---|---|
| 1 | 点分形式：东财 secid / 后缀 / 期货交易所 / 板块 | `1.600519`、`600519.SH`、`CFFEX.IF2412`、`90.BK0475` |
| 2 | 字母前缀 | `sh600519`、`sz000001`、`bj430047`、`hk00700`、`usAAPL` |
| 3 | 纯数字 | `600519`、`000001`、`00700` |
| 4 | 带 hint 的期货裸合约 | `rb2510`（配 `assetType:'futures'`） |
| 5 | 纯字母 → 美股 | `AAPL`、`MSFT` |
| 6 | 解析失败 → `throw InvalidSymbolError` | `''`、`@@@` |

### 各市场写法速查

| 市场 | 可接受写法 | 规范化结果 |
|---|---|---|
| A 股（上交所） | `sh600519`、`600519`、`600519.SH`、`1.600519` | `CN` / `SSE` / `600519` |
| A 股（深交所） | `sz000001`、`000001`、`000001.SZ`、`0.000001` | `CN` / `SZSE` / `000001` |
| A 股（北交所） | `bj430047`、`430047`、`920819` | `CN` / `BSE` / `430047` |
| 港股 | `00700`、`hk00700`、`700`、`00700.HK`、`116.00700` | `HK` / `HKEX` / `00700` |
| 美股 | `AAPL`、`usAAPL`、`105.AAPL`、`106.BABA` | `US` / `US`（或 NASDAQ / NYSE / AMEX） |
| 国内期货 | `rb2510`（配 hint）、`CFFEX.IF2412` | `CN` / `SHFE`、`CFFEX` … |
| 板块 | `90.BK0475` | `CN` / `SSE` / `board` |

> 港股不足 5 位会自动补零：`700` → `00700`、`hk700` → `00700`。
> 美股 ticker 会统一转大写：`aapl` → `AAPL`。

## 纯码推断与歧义

只给纯代码（无前缀、无后缀、无 hint）时，按如下默认规则推断：

| 形态 | 默认推断 | 交易所细分 |
|---|---|---|
| 6 位纯数字 | A 股 stock | `6/5/9` 开头 → SSE；`0/3` 开头 → SZSE；`4/8`、`92` 段 → BSE |
| 5 位 / 4 位纯数字 | 港股 stock | 补零到 5 位 |
| 纯字母 | 美股 stock | — |

纯码推断是「最常见即默认」，因此**某些场景天然无法从代码本身区分**，必须用 hint 或 `SymbolRef` 显式指明。

### 必须加 hint 的已知歧义

**① 基金 vs 股票（代码段重叠）**

场内基金 / ETF 的代码段与股票代码段重叠，纯码无法区分，需显式标注资产类型：

```ts
// 没有 hint 会被当成股票
await sdk.quotes.fund({ code: '510300', assetType: 'fund' });
// 或
normalizeSymbol('510300', { assetType: 'fund' });
```

**② 指数 vs 股票（同为 6 位）**

例如 `000001` 既是上证指数也是平安银行。纯码默认按股票推断，想当指数需加 hint：

```ts
normalizeSymbol('000001', { assetType: 'index' });
```

**③ 5 位数想当 A 股 B 股而非港股**

5 位纯数字默认推断为港股。若你确实想表达某个 5 位 A 股 / B 股代码，需显式指定市场：

```ts
normalizeSymbol('90001', { market: 'CN' });
```

**④ 海外期货裸合约**

`market: 'GLOBAL'` 的期货必须显式给出 `exchange`，不能默认为国内交易所：

```ts
normalizeSymbol('GC', { market: 'GLOBAL', exchange: 'COMEX' });
// 缺 exchange 会抛 InvalidSymbolError
```

> 规则：**能用前缀 / 后缀 / secid 明确表达的，优先用明确写法**（如 `sh000001` 表上证指数）；只有在系统拿不到足够信息时才需要 hint。

## 解析失败：InvalidSymbolError

无法解析的入参会抛出 `InvalidSymbolError`（继承自 `SdkError`，`code` 为 `INVALID_SYMBOL`），其中携带原始入参便于排查：

```ts
import { normalizeSymbol } from 'stock-sdk/symbols';
import { InvalidSymbolError } from 'stock-sdk/errors';

try {
  normalizeSymbol('');
} catch (e) {
  if (e instanceof InvalidSymbolError) {
    console.log(e.code); // 'INVALID_SYMBOL'
  }
}
```

错误体系详见[错误处理与重试](/guide/retry)。

> 上述类型字段以最终实现为准；解析优先级与已知歧义为稳定约定。
