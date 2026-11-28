/**
 * 响应解析器
 */

/**
 * 将 ArrayBuffer 解码为 GBK 字符串
 * 使用原生 TextDecoder（浏览器和 Node.js 18+ 均支持 GBK）
 */
export function decodeGBK(data: ArrayBuffer): string {
  const decoder = new TextDecoder('gbk');
  return decoder.decode(data);
}

/**
 * 解析腾讯财经响应文本
 * 按 `;` 拆行，提取 `v_xxx="..."` 里的内容，返回 { key, fields }[]
 */
export function parseResponse(text: string): { key: string; fields: string[] }[] {
  const lines = text.split(';').map((l) => l.trim()).filter(Boolean);
  const results: { key: string; fields: string[] }[] = [];
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx < 0) continue;
    let key = line.slice(0, eqIdx).trim();
    if (key.startsWith('v_')) key = key.slice(2);
    let raw = line.slice(eqIdx + 1).trim();
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    const fields = raw.split('~');
    results.push({ key, fields });
  }
  return results;
}

/**
 * 上游"无数据"占位符:`''` / `'-'` / `'--'`。
 * F44: 各 null 系解析器此前对占位符各管各('-' 在 toNumber、'--' 在 fund.ts 局部
 * 实现),集中到这里统一识别,避免语义漂移。
 */
function isNoDataPlaceholder(val: string): boolean {
  const trimmed = val.trim();
  return trimmed === '' || trimmed === '-' || trimmed === '--';
}

/**
 * 安全转换为数字，空值返回 0
 */
export function safeNumber(val: string | undefined): number {
  if (!val || val === '') return 0;
  const n = parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 安全转换为数字，空值/占位符返回 null
 */
export function safeNumberOrNull(val: string | undefined): number | null {
  if (!val || isNoDataPlaceholder(val)) return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * 将字符串转换为数字，空值/占位符返回 null
 */
export function toNumber(val: string | undefined): number | null {
  if (!val || isNoDataPlaceholder(val)) return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * 安全地将任意值转换为数字
 */
export function toNumberSafe(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  return toNumber(String(val));
}

/**
 * 严格解析为**有限**数字，失败/占位符返回 null。
 *
 * F44: 收编 fund.ts 等处的局部实现(parseNumber / toNullableNumber /
 * toDailyReturn / toNullableInt 四个语义完全一致的副本)。
 *
 * 与 {@link toNumber} / {@link toNumberSafe}(parseFloat 系)的语义差异:
 * - 整串必须是合法数字(`Number` 语义):`'1.2%'` / `'3元'` → null,
 *   而 parseFloat 系会取数字前缀(1.2 / 3)
 * - 拒绝非有限值:`'Infinity'` → null(parseFloat 系会放行 Infinity)
 * - `null` / `undefined` / `''` / `'-'` / `'--'` → null;number 入参原样做有限性校验
 */
export function toFiniteNumberOrNull(
  val: string | number | null | undefined
): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (isNoDataPlaceholder(val)) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}
