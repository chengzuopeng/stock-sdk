/**
 * stdio transport：NDJSON 读行 / 写消息 / stderr 日志。
 *
 * 见 mcp.md §2：stdout 只输出协议消息，所有日志走 stderr，否则污染协议流。
 */
import type { JsonRpcResponse } from './protocol';

/** 结构化日志到 stderr（绝不写 stdout） */
export function logStderr(...args: unknown[]): void {
  process.stderr.write(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n');
}

/** 写一条 JSON-RPC 消息到 stdout（换行分隔） */
export function writeMessage(msg: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * 从 stdin 按换行切分读取消息，逐行回调。
 * 设 utf8 编码，chunk 为 string；空行跳过。
 */
export function createLineReader(onLine: (line: string) => void): void {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buf += chunk;
    let idx = buf.indexOf('\n');
    while (idx >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.trim()) onLine(line);
      idx = buf.indexOf('\n');
    }
  });
}
