/**
 * 将 ArrayBuffer 解码为 GBK 字符串
 * 使用原生 TextDecoder（浏览器和 Node.js 18+ 均支持 GBK）
 */
export function decodeGBK(data: ArrayBuffer): string {
  const decoder = new TextDecoder('gbk');
  return decoder.decode(data);
}

export function safeNumber(val: string | undefined): number {
  if (!val || val === '') return 0;
  const n = parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

export function safeNumberOrNull(val: string | undefined): number | null {
  if (!val || val === '') return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * 解析响应文本，按 `;` 拆行，提取 `v_xxx="..."` 里的内容，返回 { key, fields }[]
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
 * 将数组分割成指定大小的块
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 并发控制执行异步任务
 * @param tasks 任务函数数组
 * @param concurrency 最大并发数
 */
export async function asyncPool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task()).then((result) => {
      results.push(result);
    });

    executing.push(p as Promise<void>);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // 移除已完成的 promise
      for (let i = executing.length - 1; i >= 0; i--) {
        // 检查是否已完成
        const status = await Promise.race([
          executing[i].then(() => 'fulfilled'),
          Promise.resolve('pending'),
        ]);
        if (status === 'fulfilled') {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

