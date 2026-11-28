# Node 增强版（stock-node-sdk） <Badge type="tip" text="Node 18.17+" /> <Badge type="warning" text="Beta" />

`stock-node-sdk` 是同仓 Monorepo 产出的 **Node.js 服务端增强版 SDK**，与 `stock-sdk` 共享统一符号体系、类型定义、指标/信号/选股回测引擎，并在 API 层保持 **100% 严格超集对齐**。

当你只需要浏览器端直连、零依赖、轻量体积时，继续使用 `stock-sdk`；当你运行在 Node.js 服务端、量化脚本、数据采集或 AI Agent / MCP 场景，需要**多源高可用自动容错**以及**突破浏览器限制的财报、快讯、公告、代理与本地缓存**时，直接切换到 `stock-node-sdk`。

## 选型对比

| 维度 | `stock-sdk` | `stock-node-sdk` |
|---|---|---|
| 运行环境 | 浏览器 + Node.js 18+ | 仅 Node.js 18.17+ |
| 运行时依赖 | **0 依赖** | 极简依赖（仅 `undici` 代理池） |
| 数据源容错 | A 股 K 线内置备源 | **能力驱动 `SourceRouter`**（A/HK/US 行情 3 源、K 线多源、快讯/公告双源，自动健康度冷却） |
| HTTP 能力 | 浏览器安全 GET / JSONP / `<script>` | 完整 `GET`/`POST`、按源默认 `Referer`/`Origin`、`CookieJar`、`SessionManager`、`ProxyPool` |
| 持久化缓存 | 内存缓存 | 内存 + 内置 **`FileCacheStore`** 本地磁盘缓存 |
| 专属数据域 | — | **`financial`**（财务指标/三大表/预告/快报）、**`news`**（7×24 快讯/公告）、**`corporate`**（股东）、**`bond`**（可转债） |
| CLI / MCP | `stock-sdk`（94 命令 / 93 工具） | `stock-node-sdk`（105 命令 / 104 工具） |

## 安装与快速开始

```bash
pnpm add stock-node-sdk@beta
# 或 npm install stock-node-sdk@beta
```

```ts
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk';

const sdk = new StockNodeSDK({
  timeout: 15_000,
  // 可选：启用本地磁盘持久化缓存（财务/股东/转债等低频数据自动落盘）
  cache: {
    store: new FileCacheStore({ dir: './.stock-cache' }),
  },
  // 可选：海外数据源（CNBC / Nasdaq / SEC EDGAR）默认开启；中国大陆无代理环境可主动关闭
  // overseas: false,
  // 可选：配置代理或代理池轮换
  // proxy: ['http://127.0.0.1:7890'],
});

// 1. 默认无需指定数据源，自动在腾讯 → 新浪 → 东财间容错并输出统一格式
const quotes = await sdk.quotes.cn(['600519', '000001']);

// 2. 财务指标、7×24 快讯、上市公司公告（Node 专属）
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 });
const flashes = await sdk.news.flash({ pageSize: 10 });
const notices = await sdk.news.announcements({ symbol: '600519', keyword: '分红' });

// 3. 优雅关闭代理连接池（可选）
await sdk.close();
```

## 能力驱动的多源路由与溯源

默认情况下你无需关心底层数据源；当你需要审计命中源、验证是否降级或锁定特定源时，可使用 `withMeta()` 与 `RouteOptions`：

```ts
// 并发安全的路由溯源（基于 AsyncLocalStorage，不污染数组返回类型）
const { data, trace } = await sdk.withMeta(() => sdk.quotes.cn(['600519']));
console.log(trace?.selectedProvider, trace?.degraded, trace?.attempts);

// 逃生舱：强制指定单一数据源或自定义优先级
const fromSina = await sdk.quotes.cn(['600519'], { source: 'sina' });
const ordered = await sdk.quotes.cn(['600519'], { source: ['eastmoney', 'sina', 'tencent'] });

// 字段完整性约束：要求选中的源必须提供换手率
const klines = await sdk.kline.cn('600519', { adjust: 'qfq' }, { requiredFields: ['turnoverRate'] });

// 查看源级健康状态与冷却期
console.log(sdk.getSourceHealth());
```

> [!TIP] 严格复权保护与海外源开关（`overseas`）
> - `StockNodeSDK` 的 K 线路由默认使用 `strictCapabilities: true`。A 股复权日、周、月 K 线会跳过新浪。A 股 5 至 60 分钟 K 线仅在 `adjust: ''` 时启用腾讯和新浪备源。腾讯历史 K 线必须含有请求的复权序列，或用于计算前复权的后复权序列。
> - A 股腾讯前复权以最新日线为锚点。严格模式下，CNBC 和 Nasdaq 仅用于指定了 `startDate` 且数据覆盖该起始日的日线查询。Nasdaq 会额外查询起始日前一周以处理非交易日，返回时按请求区间裁剪。
> - 海外数据源包（`CNBC` / `Nasdaq` / `SEC EDGAR`）**默认开启**，且行情/K 线优先级排在国内源之后（平时毫秒级走国内源零开销，故障时提供跨区域容灾）。如果你在中国大陆无代理直连环境运行且不希望降级时尝试海外源，传入 `new StockNodeSDK({ overseas: false })` 或 CLI `--overseas=false` 即可一键关闭（仅保留大陆可直连源：腾讯 / 东财 / 新浪 / 巨潮 / 港交所披露易）。

`requiredFields` 同时检查适配器声明和实际返回的每条记录。缺字段、`null`、空白字符串或非有限数值会触发切源。零值有效。

在支持路由选项的接口上传入 `{ signal: controller.signal }` 可取消单次调用。调用取消后返回 `ABORTED`，内置适配器会终止此次上游请求。

财务和公司治理接口按生效的来源策略缓存结果，包含实例的 `routing.forcedSource` 和单次调用的 `source`。`FileCacheStore.clear()` 和 `cleanup()` 仅移除可识别的缓存条目。

## 多源支持矩阵

| 能力 | 默认源优先级 | 路由约束说明 |
|---|---|---|
| `quotes.cn` / `quotes.cnSimple` | 腾讯 → 新浪 (`hq.sinajs.cn`) → 东财 (`push2`) | 统一手/万元/亿单位与时间戳 |
| `quotes.hk` | 腾讯 → 东财 → 新浪 → **CNBC** *(海外)* | 国内 3 源 + 海外 CNBC 跨区容错 |
| `quotes.us` | 腾讯 → 新浪 → 东财 → **CNBC** → **Nasdaq** *(海外)* | 国内 3 源 + 海外双源跨区容错 |
| `batch.cn` / `batch.hk` / `batch.us` | 腾讯分批 → 东财 `clist` 全市场分页 | 支持 `market` 过滤与 `onProgress` 回调 |
| `kline.cn`（日/周/月） | 东财 → 腾讯 → 新浪 | 严格模式：`qfq`/`hfq` 自动跳过新浪；`chips.cn` 通过 `requiredFields: ['turnoverRate']` 过滤 |
| `kline.hk` | 东财 → 腾讯 (`hkfqkline`) → **CNBC** *(海外)* | CNBC 的拆股调整日线用于 `qfq` |
| `kline.us` | 东财 → 腾讯 (`usfqkline`) → **CNBC** → **Nasdaq** *(海外)* | 海外拆股调整日线用于 `qfq`，Nasdaq 按日期区间分页 |
| `reference.dividendDetail` | **A 股**：东财 → 新浪 HTML<br>**港股**：东财 (`RPT_HKF10`)<br>**美股**：东财 (`RPT_USF10`) → **Nasdaq** *(海外)* | 自动识别 A/HK/US 三市场代码 |
| `financial.indicators` / `income` / `balance` / `cashflow` | **A/HK/US**：东财数据中心（自动识别三市场）<br>**美股三大表备源**：**Nasdaq** *(海外)* | 三市场统一 Schema（Nasdaq 千美元自动 ×1000 统一为美元） |
| `news.flash` | 东财 7×24 → 新浪 7×24 | `page > 1` 自动路由到支持翻页的新浪 |
| `news.announcements` | **A 股**：东财 → 巨潮 (`POST`)<br>**港股**：**港交所披露易 (`HKEXnews`)**<br>**美股**：**SEC EDGAR** *(海外)* | 按 `symbol` 市场自动路由三地官方披露源 |
| `corporate.*` / `bond.*` | 东方财富数据中心 | 支持通过 `registerAdapter()` 扩展额外数据源 |

## 自定义数据源适配器

可以通过 `registerAdapter` 接入自建数据网关或付费数据源，无缝复用统一路由与健康调度：

```ts
sdk.registerAdapter({
  id: 'custom:news.flash',
  capability: 'news.flash',
  provider: 'my-gateway',
  priority: 1, // 优先级高于内置源
  providedFields: new Set(['id', 'title', 'content']),
  supports: () => true,
  fetch: async () => [/* 返回符合 MarketNewsFlash 的数组 */],
});
```

## CLI 与 MCP

`stock-node-sdk` CLI 在兼容 `stock-sdk` 全部命令的基础上，新增 11 条 Node 专属命令与三个 Node 专属全局选项：`--source`（强制指定数据源）、`--proxy`（HTTP/HTTPS 代理或代理池）和 `--cache-dir`（启用本地磁盘缓存目录）：

```bash
# CLI（支持 --source / --proxy / --cache-dir 全局选项）
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4 --cache-dir ./.stock-cache --pretty
npx stock-node-sdk@beta news flash --pageSize 10
npx stock-node-sdk@beta news announcements --symbol 600519 --keyword 分红

# MCP Server（104 个全量工具，同样支持 --source / --proxy / --cache-dir）
npx stock-node-sdk@beta mcp --cache-dir ./.stock-cache
```

完整 Node 专属 API 与类型定义见 [Node 专属扩展 API](/api/node-extensions)。
