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
 * 安全转换为数字，空值返回 0
 */
export function safeNumber(val: string | undefined): number {
  if (!val || val === '') return 0;
  const n = parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 安全转换为数字，空值返回 null
 */
export function safeNumberOrNull(val: string | undefined): number | null {
  if (!val || val === '') return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * 将字符串转换为数字，空值返回 null
 */
export function toNumber(val: string | undefined): number | null {
  if (!val || val === '' || val === '-') return null;
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

