# Dividend & Trading Calendar

Stock SDK also includes time-oriented data that is useful for research dashboards and reminder workflows, especially `getDividendDetail` and `getTradingCalendar`.

## getDividendDetail

```ts
const dividends = await sdk.getDividendDetail('600519');
const latest = dividends[0];

console.log(latest.dividendPretax);
console.log(latest.assignProgress);
console.log(latest.exDividendDate);
```

`getDividendDetail` is useful for:

- Tracking historical dividend records for one stock
- Displaying record date, ex-dividend date, and payment date
- Reading support fields such as EPS, BPS, and net profit YoY

## getTradingCalendar

```ts
const calendar = await sdk.getTradingCalendar();

const today = calendar.find((item) => item.date === '2026-04-22');
console.log(today?.isOpen);
```

`getTradingCalendar` is useful for:

- Checking whether a given day is a trading day
- Skipping market holidays
- Filtering scheduled jobs and alerts

## Combined Workflows

### Dividend Event Reminders

- Use `getDividendDetail` for the latest notice and key dates
- Use `getTradingCalendar` to verify whether those dates fall on trading days
- Feed the result into your own reminder or automation flow

### Long-term Return Dashboard

- Use `getHistoryKline` for price history
- Use `getDividendDetail` to annotate dividend events
- Overlay ex-dividend dates and payouts on the chart

### Trading-day Scheduling

- Call `getTradingCalendar` before a scheduled job starts
- Skip full-market fetches on non-trading days
- Run `getAllAShareQuotes` or `getAllUSShareQuotes` only on trading sessions

## Related Pages

- [Dividend API](/en/api/dividend)
- [Batch Query](/en/guide/batch)
- [Quick Start](/en/guide/getting-started)
