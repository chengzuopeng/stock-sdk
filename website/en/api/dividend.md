# Dividend Details

Get A-share stock dividend distribution details, including historical dividend records, bonus shares, financial indicators, and key dates.

## Get Dividend Details

The `getDividendDetail(symbol)` method retrieves the dividend distribution history for a specified stock.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | `string` | ✅ | Stock code (pure digits or with exchange prefix), e.g., `'600519'` or `'sh600519'` |

### Return Value

Returns `Promise<DividendDetail[]>`, a list of dividend details sorted by report date in descending order.

### Data Structure

```typescript
interface DividendDetail {
  /** Stock code */
  code: string;
  /** Stock name */
  name: string;
  /** Report date YYYY-MM-DD */
  reportDate: string | null;
  /** Plan announcement date YYYY-MM-DD */
  planNoticeDate: string | null;
  /** Earnings disclosure date YYYY-MM-DD */
  disclosureDate: string | null;

  // === Share Transfer Info ===
  /** Total transfer ratio (bonus + transfer per 10 shares) */
  assignTransferRatio: number | null;
  /** Bonus shares per 10 shares */
  bonusRatio: number | null;
  /** Transferred shares per 10 shares */
  transferRatio: number | null;

  // === Cash Dividend Info ===
  /** Cash dividend per 10 shares (pre-tax), in CNY */
  dividendPretax: number | null;
  /** Dividend description (e.g., 10派2.36元(含税,扣税后2.124元)) */
  dividendDesc: string | null;
  /** Dividend yield */
  dividendYield: number | null;

  // === Financial Indicators ===
  /** Earnings per share (CNY) */
  eps: number | null;
  /** Book value per share (CNY) */
  bps: number | null;
  /** Capital reserve per share (CNY) */
  capitalReserve: number | null;
  /** Unassigned profit per share (CNY) */
  unassignedProfit: number | null;
  /** Net profit YoY growth (%) */
  netProfitYoy: number | null;
  /** Total shares */
  totalShares: number | null;

  // === Key Dates ===
  /** Equity record date YYYY-MM-DD */
  equityRecordDate: string | null;
  /** Ex-dividend date YYYY-MM-DD */
  exDividendDate: string | null;
  /** Payment date YYYY-MM-DD */
  payDate: string | null;

  // === Progress Info ===
  /** Distribution progress (e.g., Implemented, Proposal) */
  assignProgress: string | null;
  /** Latest notice date YYYY-MM-DD */
  noticeDate: string | null;
}
```

### Usage Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Get Kweichow Moutai's dividend history
const dividends = await sdk.getDividendDetail('600519');

console.log('Total dividend records:', dividends.length);

// View the latest dividend details
if (dividends.length > 0) {
  const latest = dividends[0];

  // Basic info
  console.log('Stock name:', latest.name);
  console.log('Report period:', latest.reportDate); 

  // Dividend info
  console.log('Dividend per 10 shares (pre-tax):', latest.dividendPretax, 'CNY');
  console.log('Dividend description:', latest.dividendDesc);
  console.log('Dividend yield:', (latest.dividendYield! * 100).toFixed(2), '%');

  // Financial indicators
  console.log('EPS:', latest.eps, 'CNY');
  console.log('BPS:', latest.bps, 'CNY');
  console.log('Total shares:', latest.totalShares);
  console.log('Net profit YoY:', latest.netProfitYoy, '%');

  // Key dates
  console.log('Ex-dividend date:', latest.exDividendDate);
  console.log('Progress:', latest.assignProgress);
}

// Calculate total historical dividends
const totalDividend = dividends.reduce((sum, d) => {
  return sum + (d.dividendPretax || 0);
}, 0);
console.log('Total dividend per 10 shares:', totalDividend.toFixed(2), 'CNY');
```

### Field Descriptions

| Field | Description |
|-------|-------------|
| `planNoticeDate` | Plan announcement date |
| `disclosureDate` | Earnings disclosure date |
| `assignTransferRatio` | Total transfer ratio (bonus + conversion per 10 shares) |
| `bonusRatio` | Bonus share ratio, e.g., 2 means 2 bonus shares per 10 |
| `transferRatio` | Transfer ratio, e.g., 3 means 3 transferred shares per 10 |
| `dividendPretax` | Pre-tax cash dividend per 10 shares (CNY) |
| `dividendDesc` | Dividend scheme description with pre/after-tax amounts |
| `dividendYield` | Dividend yield in decimal form (e.g., 0.02 = 2%) |
| `eps` | Earnings per share (CNY) |
| `bps` | Book value per share (CNY) |
| `capitalReserve` | Capital reserve per share (CNY) |
| `unassignedProfit` | Unassigned profit per share (CNY) |
| `netProfitYoy` | Net profit year-over-year growth rate (%) |
| `totalShares` | Total number of shares |
| `equityRecordDate` | Record date for determining eligible shareholders |
| `exDividendDate` | Date when stock price adjusts for dividend |
| `payDate` | Date when cash dividend is paid |
| `assignProgress` | Distribution status, e.g., "Implemented", "Proposal" |
| `noticeDate` | Latest announcement date |

### Notes

1. Data sourced from Eastmoney Data Center
2. Results are sorted by report date in descending order (newest first)
3. Some fields may be `null` if data is missing or not applicable
4. Newly listed or non-dividend-paying companies may return an empty array
5. `dividendYield` is in decimal form; multiply by 100 to convert to percentage
