import { getApiPermission } from './db';

/**
 * 从位置参数中解析出已注册的命令名和剩余的路径参数。
 *
 * 采用最长前缀匹配：优先把更多的位置参数整体当成命令名去 api_permissions
 * 中查找；命中后，剩余参数作为路径参数（${param0} / ${param1} 等）使用。
 */
export function resolveCommandAndArgs(positionals: string[]): { command: string; args: string[] } {
  for (let i = positionals.length; i > 0; i--) {
    const candidate = positionals.slice(0, i).join('.');
    if (getApiPermission(candidate)) {
      return { command: candidate, args: positionals.slice(i) };
    }
  }

  // 未匹配到已知命令时，全部视为命令名（无路径参数）
  return { command: positionals.join('.'), args: [] };
}
