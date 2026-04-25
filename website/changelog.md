# 更新日志

本页面记录 Stock SDK 的版本更新历史。

## **[1.8.2](https://www.npmjs.com/package/stock-sdk/v/1.8.2)** (2026-04-25)

> 本版本不新增业务 API，重点面向系统架构、请求稳定性、类型兼容和文档工程化改造，现有用法保持兼容。

### 优化

**架构与请求治理**
- `StockSDK` 门面拆分为报价、K 线、板块、期货、期权和指标等领域 service，公开方法和调用方式保持不变
- 公共类型按领域拆分到 `src/types/`，原 `src/types.ts` 继续作为向后兼容出口
- 新增东方财富 host fallback，并让 retry / fallback 请求计入 `rateLimit` 预算

**类型兼容**
- `TodayTimelineResponse.preClose` 调整为可选字段，避免外部 mock 或手动构造对象时出现类型破坏
- `SearchResult.type` 保持腾讯接口原始类型字符串，新增 `category` 作为标准化资产分类，兼容旧的 `type === 'GP-A'` 等判断
- `OptionLHBItem` 和 `ComexInventory` 继续保留旧字段，并补充更清晰的新字段语义

**文档与工程**
- 新增文档元数据生成、文档一致性校验和 CI 工作流
- 修正搜索、期权、Timeline、重试与请求治理相关文档，并更新 GitHub Pages 部署流程

### 兼容性

- 本版本不包含破坏性变更
- 旧的 `StockSDK` 初始化方式、SDK 方法名、参数结构和主要返回结构保持兼容


## **[1.8.1](https://www.npmjs.com/package/stock-sdk/v/1.8.1)** (2026-04-22)

### 优化

**请求治理**
- `RequestClient` 新增可选 `providerPolicies` 配置，支持按 `tencent`、`eastmoney`、`sina` 等数据源覆盖超时、重试、限流、熔断、请求头与 UA 策略
- 保留原有全局 `timeout`、`retry`、`rateLimit`、`circuitBreaker` 配置语义，旧初始化方式无需修改
- provider 级熔断与限流状态改为相互隔离，避免某个数据源的失败状态污染其他数据源

**技术指标**
- 补齐 `getKlineWithIndicators` / `addIndicators` 对 `OBV`、`ROC`、`DMI`、`SAR`、`KC` 的一站式支持
- 同步补齐新增指标的 `IndicatorOptions` 类型与 lookback 估算逻辑

**批量查询**
- 全市场批量接口内部切换为稳定顺序执行，返回结果与输入代码顺序保持一致
- 公开导出的 `asyncPool` 保持旧调用兼容，避免对已有外部工具用法产生破坏性影响

**Provider 重构**
- 提取东方财富历史 K 线工厂与板块工厂，减少港股 / 美股 K 线和行业 / 概念板块实现中的重复代码
- 对外 API 名称、参数和返回结构保持不变


## **[1.8.0](https://www.npmjs.com/package/stock-sdk/v/1.8.0)** (2026-03-13)

### 新增功能

**期权数据**
- 新增中金所股指期权 T 型报价接口 `getIndexOptionSpot`，支持上证50(ho)、沪深300(io)、中证1000(mo)三大品种
- 新增股指期权合约日 K 线接口 `getIndexOptionKline`
- 新增中金所全部期权实时行情列表接口 `getCFFEXOptionQuotes`（东方财富数据源）
- 新增上交所 ETF 期权到期月份列表接口 `getETFOptionMonths`，支持 50ETF、300ETF、500ETF、科创50
- 新增 ETF 期权到期日与剩余天数接口 `getETFOptionExpireDay`
- 新增 ETF 期权当日分钟行情接口 `getETFOptionMinute`
- 新增 ETF 期权历史日 K 线接口 `getETFOptionDailyKline`
- 新增 ETF 期权 5 日分钟行情接口 `getETFOption5DayMinute`
- 新增商品期权 T 型报价接口 `getCommodityOptionSpot`，覆盖 30 个品种（黄金、白银、铜、豆粕、白糖等）
- 新增商品期权合约日 K 线接口 `getCommodityOptionKline`
- 新增期权龙虎榜接口 `getOptionLHB`

## **[1.7.0](https://www.npmjs.com/package/stock-sdk/v/1.7.0)** (2026-02-28)

### 新增功能

**期货行情**
- 新增国内期货历史 K 线接口 `getFuturesKline`，支持全部国内期货品种（上期所、大商所、郑商所、上海国际能源交易中心、中金所、广期所），支持主连合约（如 `RBM`）和具体合约（如 `rb2510`），支持日/周/月 K 线
- 新增全球期货实时行情接口 `getGlobalFuturesSpot`，覆盖 COMEX、NYMEX、CBOT、LME 等主要国际期货交易所，支持 600+ 个品种
- 新增全球期货历史 K 线接口 `getGlobalFuturesKline`，支持日/周/月 K 线
- 新增期货库存品种列表接口 `getFuturesInventorySymbols`
- 新增期货库存数据接口 `getFuturesInventory`，支持查询国内各期货品种的历史库存数据
- 新增 COMEX 黄金/白银库存接口 `getComexInventory`

### 优化

**Playground**
- 新增期货行情 API 演示

## **[1.6.2](https://www.npmjs.com/package/stock-sdk/v/1.6.2)** (2026-01-25)

### 新增功能

**基金数据**
- 新增 `getFundCodeList` 方法：获取全部基金代码列表（26000+ 只）

## **[1.6.1](https://www.npmjs.com/package/stock-sdk/v/1.6.1)** (2026-01-25)

### 新增功能

**防频控机制**
- 新增请求限流器（`rateLimit`）：基于令牌桶算法，支持配置每秒请求数和突发容量
- 新增 User-Agent 轮换（`rotateUserAgent`）：仅 Node.js 环境有效，降低被识别为同一客户端的风险
- 新增熔断器（`circuitBreaker`）：连续失败时自动暂停请求，防止雪崩效应（默认关闭，需显式配置）

**基础设施**
- 新增通用内存缓存模块，支持 TTL 过期和 LRU 淘汰策略

## **[1.6.0](https://www.npmjs.com/package/stock-sdk/v/1.6.0)** (2026-01-24)

### 新增功能

**分红数据**
- 新增 A 股分红派送详情接口 `getDividendDetail`，支持获取历史分红记录，涵盖现金分红、送转股份、财务指标（EPS、BPS、净利润同比等）、关键日期（登记日、除权日、派息日）及方案进度等 20+ 维度数据

## **[1.5.0](https://www.npmjs.com/package/stock-sdk/v/1.5.0)** (2026-01-18)

### 新增功能

**技术指标**
- 新增 5 个技术指标：**OBV** (能量潮)、**ROC** (变动率指标)、**DMI/ADX** (趋向指标)、**SAR** (抛物线转向)、**KC** (肯特纳通道)
- 完善了指标计算函数的文档和 Playground 演示

**批量查询增强**
- `getAShareCodeList`, `getUSCodeList` 参数升级为对象形式，支持更灵活的筛选：
  - `simple`: 是否移除交易所前缀
  - `market`: 按市场筛选（上证、深证、北证、科创、创业）
- `getAllAShareQuotes`, `getAllUSShareQuotes` 支持按 `market` 筛选全市场行情


## **[1.4.5](https://www.npmjs.com/package/stock-sdk/v/1.4.5)** (2026-01-15)

### 变更

**默认复权方式调整**
- 所有 K 线接口的默认复权方式由**后复权 (`hfq`)** 调整为**前复权 (`qfq`)**
- 受影响接口：`getHistoryKline`、`getHKHistoryKline`、`getUSHistoryKline`、`getMinuteKline`、`getKlineWithIndicators`


## **[1.4.4](https://www.npmjs.com/package/stock-sdk/v/1.4.4)** (2026-01-14)

### 优化
- 一些代码优化，包体积减小


## **[1.4.3](https://www.npmjs.com/package/stock-sdk/v/1.4.3)** (2026-01-08)

### 优化

**请求方法优化**
- 支持配置错误重试策略，包括重试次数、重试间隔等
- 优化错误处理，提供更详细的错误信息
- 支持自定义 headers 与 userAgent

**单测结构优化**
- 集成/单测分离
- 新增 MSW mock 层，拦截真实请求进行单测

**缓存优化**
- 代码列表/交易日历内存缓存：减少重复请求


## **[1.4.2](https://www.npmjs.com/package/stock-sdk/v/1.4.2)** (2026-01-07)

### 新增功能

**搜索功能**
- 新增股票搜索接口 `search`，支持 A股、港股、美股的代码、名称及拼音搜索


## **[1.4.1](https://www.npmjs.com/package/stock-sdk/v/1.4.1)** (2025-12-29)

### 新增功能

**扩展数据**
- 新增 A 股交易日历接口 `getTradingCalendar`

## **[1.4.0](https://www.npmjs.com/package/stock-sdk/v/1.4.0)** (2025-12-26)

### 新增功能

**板块数据**
- 新增行业板块接口：`getIndustryList`、`getIndustrySpot`、`getIndustryConstituents`、`getIndustryKline`、`getIndustryMinuteKline`
- 新增概念板块接口：`getConceptList`、`getConceptSpot`、`getConceptConstituents`、`getConceptKline`、`getConceptMinuteKline`

### 优化

**Playground**
- 新增板块数据 API 演示
- Playground 支持本地开发模式，可直接引用本地源码调试


## **[1.3.1](https://www.npmjs.com/package/stock-sdk/v/1.3.1)** (2025-12-24)

### 优化

**文档优化**
- 官方网站上线，[https://stock-sdk.linkdiary.cn/](https://stock-sdk.linkdiary.cn/)
- 优化 API 文档介绍
- 一个 bigfix

## **[1.3.0](https://www.npmjs.com/package/stock-sdk/v/1.3.0)** (2025-12-23)

### 新增功能

**K 线数据**
- 新增美股和港股历史 K 线接口 `getHKHistoryKline`、`getUSHistoryKline`（日/周/月）
- 新增获取全部美股和港股股实时行情接口 `getAllUSShareQuotes`、`getAllHKShareQuotes`（支持并发控制、进度回调）

**技术指标**
- 新增一站式技术指标接口 `getKlineWithIndicators`（自动获取 K 线并计算指标）
- 新增均线计算函数 `calcMA`（支持 SMA/EMA/WMA）、`calcSMA`、`calcEMA`、`calcWMA`
- 新增技术指标计算函数 `calcMACD`、`calcBOLL`、`calcKDJ`、`calcRSI`、`calcWR` 等

### 优化

- 新增中英文文档切换支持

## **[1.2.0](https://www.npmjs.com/package/stock-sdk/v/1.2.0)** (2025-12-18)

### 新增功能

**K 线数据**
- 新增 A 股历史 K 线接口 `getHistoryKline`（日/周/月，数据来源：东方财富）
- 新增分钟 K 线接口 `getMinuteKline`（1/5/15/30/60 分钟）
- 新增当日分时走势接口 `getTodayTimeline`

### 优化

- 完全重构 API 文档结构，使用表格形式更清晰展示

## **[1.1.0](https://www.npmjs.com/package/stock-sdk/v/1.1.0)** (2025-12-12)

### 功能

**实时行情**
- A 股/指数全量行情 `getFullQuotes`
- A 股/指数简要行情 `getSimpleQuotes`
- 港股行情 `getHKQuotes`
- 美股行情 `getUSQuotes`
- 公募基金行情 `getFundQuotes`

**扩展数据**
- 资金流向 `getFundFlow`
- 盘口大单占比 `getPanelLargeOrder`

**批量查询**
- 全部 A 股代码列表 `codeList`
- 获取全部 A 股实时行情 `getAllAShareQuotes`（支持并发控制、进度回调）
- 批量获取指定股票行情 `getAllQuotesByCodes`
- 批量混合查询 `batchRaw`

**特性**
- 零依赖，轻量级
- 支持浏览器和 Node.js 18+ 双端运行
- 同时提供 ESM 和 CommonJS 两种模块格式
- 完整的 TypeScript 类型定义

---

::: tip 版本规范
Stock SDK 遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。
- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正
:::

<script setup>
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.body.classList.add('changelog-page')
})

onUnmounted(() => {
  document.body.classList.remove('changelog-page')
})
</script>

<style>
/* 更新日志页面专属样式 */

/* 增加背景：极淡的浅灰色背景和微弱的装饰性渐变 */
body.changelog-page {
  --vp-layout-max-width: 1400px;
  background-color: var(--vp-c-bg-alt) !important;
  background-image: radial-gradient(circle at 50% -20%, var(--vp-c-brand-soft) 0%, transparent 40%) !important;
  background-attachment: fixed !important;
}

/* 让内容卡片有白色背景和轻微圆角，形成对比 */
body.changelog-page .VPDoc .content {
  padding: 2rem 3rem !important;
  background: var(--vp-c-bg) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
  margin-top: 2rem !important;
  margin-bottom: 3rem !important;
}

/* 深色模式适配 */
.dark body.changelog-page .VPDoc .content {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

body.changelog-page .VPDoc {
  padding: 0 32px !important;
}

body.changelog-page .VPDoc > .container {
  max-width: 100% !important;
}

body.changelog-page .VPDoc > .container > .content {
  max-width: 1100px !important;
}

body.changelog-page .vp-doc {
  max-width: 100% !important;
}

/* 标题样式微调 */
body.changelog-page .vp-doc h1 {
  margin-top: 0 !important;
  margin-bottom: 1.5rem !important;
  text-align: center;
}

body.changelog-page .vp-doc h2 {
  margin-top: 2.5rem !important;
  margin-bottom: 1rem !important;
  padding-bottom: 0.5rem !important;
  border-bottom: 1px solid var(--vp-c-divider) !important;
  display: flex !important;
  align-items: center !important;
  border-top: 0 !important;
}

/* 为版本号添加一个小点装饰 */
body.changelog-page .vp-doc h2::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: var(--vp-c-brand);
  border-radius: 50%;
  margin-right: 12px;
}

body.changelog-page .vp-doc h3 {
  margin-top: 1.5rem !important;
  margin-bottom: 0.75rem !important;
  color: var(--vp-c-brand) !important;
}

body.changelog-page .vp-doc p {
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}

body.changelog-page .vp-doc ul,
body.changelog-page .vp-doc ol {
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}

body.changelog-page .vp-doc li {
  margin-top: 0.25rem !important;
  margin-bottom: 0.25rem !important;
}

body.changelog-page .vp-doc hr {
  margin-top: 2rem !important;
  margin-bottom: 2rem !important;
  border: 0 !important;
  border-top: 2px dashed var(--vp-c-divider) !important;
}

body.changelog-page .vp-doc .custom-block {
  margin-top: 1.5rem !important;
  margin-bottom: 1.5rem !important;
}

body.changelog-page .vp-doc h2 a {
  margin-right: 8px;
}
</style>
