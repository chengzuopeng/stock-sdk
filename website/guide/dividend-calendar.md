# 分红与交易日历

除了行情和 K 线，Stock SDK 也提供适合投研和提醒类场景的时间维度数据，包括 `getDividendDetail` 和 `getTradingCalendar`。

## getDividendDetail

```ts
const dividends = await sdk.getDividendDetail('600519');
const latest = dividends[0];

console.log(latest.dividendPretax);
console.log(latest.assignProgress);
console.log(latest.exDividendDate);
```

`getDividendDetail` 适合：

- 跟踪单只股票的历史分红记录
- 展示股权登记日、除权除息日、派息日
- 读取每股收益、每股净资产、净利润同比等辅助字段

## getTradingCalendar

```ts
const calendar = await sdk.getTradingCalendar();

const today = calendar.find((item) => item.date === '2026-04-22');
console.log(today?.isOpen);
```

`getTradingCalendar` 适合：

- 判断某天是否开市
- 排除节假日任务
- 在定时抓取或提醒系统中做交易日过滤

## 组合用法

### 分红事件提醒

- 用 `getDividendDetail` 读取最近公告和关键日期
- 用 `getTradingCalendar` 判断除权除息日前后是否为交易日
- 再结合你自己的任务系统生成提醒

### 长期收益看板

- 用 `getHistoryKline` 获取价格走势
- 用 `getDividendDetail` 标注分红事件
- 在图表上叠加除权除息日和派息金额

### 交易日调度

- 定时任务启动前先调用 `getTradingCalendar`
- 当天不开市时跳过全市场拉取
- 开市日再执行 `getAllAShareQuotes` 或 `getAllUSShareQuotes`

## 相关页面

- [分红派送 API](/api/dividend)
- [批量查询](/guide/batch)
- [快速开始](/guide/getting-started)
