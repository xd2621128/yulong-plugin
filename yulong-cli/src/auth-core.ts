import { loadConfig } from './config';
import { saveTokens } from './token-manager';
import { ErrorType } from './envelope';
import * as logger from './logger';

/** 后端统一响应结构 */
interface BackendResponse {
  code: number;
  msg: string;
  data?: unknown;
  success?: boolean;
  hint?: string;
}

function parseExpiresAt(input?: string): string {
  if (!input) {
    // 默认 1 小时后过期
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  return input;
}

/**
 * 通过第三方登录接口获取并保存 token
 *
 * 调用 POST /hr/auth/extends/login/third/party4UserId
 * 成功后自动保存 tokens。
 *
 * @returns 新的 accessToken
 */
export async function thirdPartyLogin(userid: string, timeoutSeconds = 30): Promise<string> {
  const config = loadConfig();
  const baseUrl = process.env.YULONG_BASE_URL || config.baseUrl;

  if (!baseUrl) {
    const err = new Error('未配置 baseUrl，请在 config.json 中设置或通过 YULONG_BASE_URL 环境变量指定');
    err.name = ErrorType.CONFIG_ERROR;
    throw err;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/hr/auth/extends/login/third/party4UserId`;
  logger.info('正在请求第三方登录接口...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ loginName: userid }),
      signal: controller.signal,
    });
  }
  catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      const error = new Error(`自动登录请求超时 (${timeoutSeconds}秒)`);
      error.name = ErrorType.NETWORK_ERROR;
      throw error;
    }
    const error = new Error(`自动登录网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.NETWORK_ERROR;
    throw error;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const err = new Error(`自动登录请求失败 (HTTP ${response.status} ${response.statusText})`);
    err.name = ErrorType.NETWORK_ERROR;
    throw err;
  }

  let data: BackendResponse;
  try {
    data = await response.json() as BackendResponse;
  }
  catch (err) {
    const error = new Error(`自动登录响应解析失败 (HTTP ${response.status}): ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.BACKEND_ERROR;
    throw error;
  }

  if (data.code !== 0) {
    const err = new Error(`自动登录失败 [${data.code}] ${data.msg || ''}`);
    err.name = ErrorType.AUTH_REQUIRED;
    (err as Error & { detail?: Record<string, unknown> }).detail = {
      code: data.code,
      message: data.msg,
      hint: data.hint,
    };
    throw err;
  }

  const tokenData = data.data as { accessToken?: string; refreshToken?: string; orgId?: string } | undefined;
  if (!tokenData?.accessToken || !tokenData?.refreshToken) {
    const err = new Error('自动登录响应缺少 accessToken 或 refreshToken');
    err.name = ErrorType.BACKEND_ERROR;
    throw err;
  }

  const expiresAt = parseExpiresAt();
  saveTokens({
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt,
    orgId: tokenData.orgId,
  });

  logger.info('登录成功，token 已保存');
  return tokenData.accessToken;
}
