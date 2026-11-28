/**
 * SDK 点路径方法解析(P3-13:全库唯一一份 walker)。
 *
 * 此前同语义实现存在两份:cli/dispatch.invokeMethod(commit ab8e920 把三套
 * 合一后的产物)与 spec/derive-mcp.resolveMethod(spec 化时又写了第 4 份)。
 * this 绑定正是这里修过的 bug 类 —— 方法解析的修复必须只落一处。
 * 调用方各自包装错误类型(CLI 抛 CliUsageError,MCP 抛内部 Error)。
 */
export interface ResolvedSdkMethod {
  fn: (...args: unknown[]) => unknown;
  /** 方法挂载的父对象,调用时作为 this(命名空间方法虽已 bind,此为防御) */
  parent: unknown;
}

export function resolveSdkMethod(
  root: unknown,
  path: string[]
): ResolvedSdkMethod | undefined {
  let parent: unknown = undefined;
  const target = path.reduce<unknown>((o, k) => {
    if (o == null || typeof o !== 'object') return undefined;
    parent = o;
    return (o as Record<string, unknown>)[k];
  }, root);
  if (typeof target !== 'function') {
    return undefined;
  }
  return { fn: target as (...args: unknown[]) => unknown, parent };
}
