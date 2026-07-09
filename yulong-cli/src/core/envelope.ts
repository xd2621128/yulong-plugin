import { formatData } from './formatter';
import type { Envelope, GlobalOptions } from './types';

/**
 * 构建成功响应
 */
export function success<T>(data: T, dryRun = false): Envelope<T> {
  const result: Envelope<T> = {
    ok: true,
    data,
    asOf: new Date().toISOString(),
  };
  if (dryRun) {
    result.dryRun = true;
  }
  return result;
}

/**
 * 构建错误响应
 */
export function error(
  type: string,
  message: string,
  detail?: Record<string, unknown>,
): Envelope<never> {
  return {
    ok: false,
    error: {
      type,
      message,
      detail,
    },
    asOf: new Date().toISOString(),
  };
}

/**
 * 输出到 stdout
 *
 * 成功响应按 format 格式化；错误响应固定输出 JSON envelope，方便 Skill 解析。
 */
export function printEnvelope(
  envelope: Envelope<unknown>,
  format: GlobalOptions['format'] = 'json',
): void {
  if (envelope.ok && (format === 'table' || format === 'raw')) {
    console.log(formatData(envelope.data, format));
  }
  else {
    console.log(JSON.stringify(envelope, null, 2));
  }
}

/**
 * 常见错误类型
 */
export const ErrorType = {
  AUTH_REQUIRED: 'auth_required',
  PERMISSION_DENIED: 'permission_denied',
  BACKEND_ERROR: 'backend_error',
  VALIDATION_ERROR: 'validation_error',
  CONFIG_ERROR: 'config_error',
  NETWORK_ERROR: 'network_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const;
