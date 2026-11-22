/**
 * stdio transport：NDJSON 读行 / 写消息 / stderr 日志。
 *
 * 见 mcp.md §2：stdout 只输出协议消息，所有日志走 stderr，否则污染协议流。
 */
import { RPC_INVALID_REQUEST, type JsonRpcResponse } from './protocol';

/** 结构化日志到 stderr（绝不写 stdout） */
export function logStderr(...args: unknown[]): void {
  process.stderr.write(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n');
}

/** 写一条 JSON-RPC 消息到 stdout（换行分隔） */
export function writeMessage(msg: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/** 单条消息（未含换行）的缓冲上限，超过即丢弃该行，防止畸形/恶意无换行输入撑爆内存 */
export const MAX_LINE_BYTES = 1_000_000;

/**
 * 从 stdin 按换行切分读取消息，逐行回调。
 * 设 utf8 编码，chunk 为 string；空行跳过；行缓冲超上限则丢弃。
 * 同时挂 stdin/stdout 'error' 监听，避免流错误（EPIPE 等）冒泡成 uncaught exception 崩溃。
 */
export function createLineReader(onLine: (line: string) => void): void {
  let buf = '';
  // 超长消息「丢弃模式」：stdin 按 ~64KB 分片到达，超上限的单行必然被腰斩。
  // 旧实现直接清 buf：原请求永远没有任何响应（client 悬挂到超时），且该消息的
  // 尾部分片会被误析成独立行 → 伪 id:null Parse error。改为持续丢弃到下一个
  // 换行（消息真正结束），再回一条 message-too-large 错误让 client 感知失败。
  let discarding = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buf += chunk;
    let idx = buf.indexOf('\n');
    while (idx >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (discarding || Buffer.byteLength(line) > MAX_LINE_BYTES) {
        // 无法可靠定位超长消息的 id。
        discarding = false;
        writeMessage({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: RPC_INVALID_REQUEST,
            message: `Message too large (limit ${MAX_LINE_BYTES} bytes)`,
          },
        });
      } else if (line.trim()) {
        onLine(line);
      }
      idx = buf.indexOf('\n');
    }
    if (!discarding && Buffer.byteLength(buf) > MAX_LINE_BYTES) {
      logStderr(`[stock-sdk mcp] 输入超出 ${MAX_LINE_BYTES} 字节上限，丢弃至下一换行`);
      discarding = true;
      buf = '';
    } else if (discarding) {
      buf = '';
    }
  });
  // stdin 流错误（管道异常断开等）→ 记日志，不崩溃
  process.stdin.on('error', (e: Error) => logStderr('[stock-sdk mcp] stdin error:', e.message));
  // stdout 错误（client 关闭读端 → EPIPE）→ 已无法通信，优雅退出
  process.stdout.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EPIPE') {
      logStderr('[stock-sdk mcp] stdout EPIPE（client 断开），退出');
      process.exit(0);
    } else {
      logStderr('[stock-sdk mcp] stdout error:', e.message);
    }
  });
}
