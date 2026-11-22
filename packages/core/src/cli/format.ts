/**
 * 输出渲染：json / table / csv（cli.md §6）。
 *
 * - `json`（默认）：单行 `JSON.stringify`，`--pretty` 缩进。管道友好。
 * - `table`：零依赖列对齐，按 CJK 估算 2 宽度。
 * - `csv`：表头 + 行，按 RFC4180 转义。
 */
import type { OutputFormat } from './types';

export function formatOutput(
  result: unknown,
  format: OutputFormat,
  pretty: boolean
): string {
  if (format === 'json') {
    return pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  }
  const rows = toRows(result);
  if (rows.length === 0) return '';
  return format === 'csv' ? toCsv(rows) : toTable(rows);
}

/** 判断结果是否为「空」（null/undefined/空数组），供 index 层给 stderr 提示。 */
export function isEmptyResult(result: unknown): boolean {
  return (
    result === null ||
    result === undefined ||
    (Array.isArray(result) && result.length === 0)
  );
}

/** 把任意结果归一成「行（对象）数组」。 */
function toRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.map((item) =>
      isPlainObject(item) ? item : { value: item }
    );
  }
  if (isPlainObject(result)) return [result];
  if (result === null || result === undefined) return [];
  return [{ value: result }];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 收集所有行出现过的 key，保持首次出现顺序。 */
function collectColumns(rows: Record<string, unknown>[]): string[] {
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    }
  }
  return cols;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** 显示宽度：CJK / 全角字符按 2 计。 */
function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    width += isWide(code) ? 2 : 1;
  }
  return width;
}

function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

function pad(text: string, width: number, alignRight: boolean): string {
  const gap = Math.max(0, width - displayWidth(text));
  const spaces = ' '.repeat(gap);
  return alignRight ? spaces + text : text + spaces;
}

function toTable(rows: Record<string, unknown>[]): string {
  const cols = collectColumns(rows);
  const cells = rows.map((row) => cols.map((c) => cellToString(row[c])));
  // 数字列右对齐：该列所有非空单元格都是数字
  const numericCol = cols.map((_, ci) =>
    cells.every((r) => r[ci] === '' || isNumericString(r[ci]))
  );
  const widths = cols.map((col, ci) =>
    Math.max(displayWidth(col), ...cells.map((r) => displayWidth(r[ci])))
  );

  const header = cols.map((col, ci) => pad(col, widths[ci], numericCol[ci])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  const body = cells
    .map((r) => r.map((cell, ci) => pad(cell, widths[ci], numericCol[ci])).join('  '))
    .join('\n');
  return [header, sep, body].join('\n');
}

function isNumericString(text: string): boolean {
  return text !== '' && !Number.isNaN(Number(text));
}

function toCsv(rows: Record<string, unknown>[]): string {
  const cols = collectColumns(rows);
  const lines = [cols.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => csvEscape(cellToString(row[c]))).join(','));
  }
  return lines.join('\n');
}

function csvEscape(text: string): string {
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
