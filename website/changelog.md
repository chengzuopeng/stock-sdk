# 更新日志

本页面记录 Stock SDK 的版本更新历史。

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

