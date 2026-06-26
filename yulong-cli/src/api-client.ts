import { loadConfig } from './config';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens, loadTokens } from './token-manager';
import { getApiPermission } from './db';
import { thirdPartyLogin } from './auth-core';
import { ErrorType } from './envelope';
import * as logger from './logger';
import type { CommandContext, RequestConfig } from './types';

/** 后端统一响应结构 */
interface BackendResponse {
  code: number;
  msg: string;
  data?: unknown;
  success?: boolean;
  hint?: string;
}

/**
 * 解析路径参数占位符
 *
 * 支持两种填充方式（按优先级）：
 * 1. 命令行位置参数：yulong hr article detail <id>
 * 2. --json 中的同名键：yulong hr article detail --json '{"id":"123"}'
 *
 * 路径参数占位符格式为 ${param0}、${param1} ...，与后端代码生成器保持一致。
 */
function resolvePath(
  path: string,
  args: string[],
  params: Record<string, unknown>,
): string {
  const usedKeys = new Set<string>();

  let resolved = path.replace(/\$\{param(\d+)\}/g, (match, indexStr) => {
    const index = Number.parseInt(indexStr, 10);

    // 优先使用位置参数
    if (index < args.length) {
      return encodeURIComponent(args[index]);
    }

    // 其次按常见命名推断对应的参数键
    const fallbackKeys = ['id', 'top', 'join', 'selectTop', 'code', 'type'];
    const key = fallbackKeys[index];
    if (key && params[key] !== undefined && params[key] !== null) {
      usedKeys.add(key);
      return encodeURIComponent(String(params[key]));
    }

    throw new Error(`路径参数 ${match} 缺失，请在命令中提供对应参数（如 yulong hr article detail <id>）`);
  });

  // 若通过 --json 填充了路径参数，将其从查询/body中移除避免重复
  for (const key of usedKeys) {
    delete params[key];
  }

  return resolved;
}

/**
 * 构建 HTTP 请求配置
 *
 * 不执行实际请求，仅构造请求参数
 */
export function buildRequest(
  context: CommandContext,
  params: Record<string, unknown>,
  explicitBody?: Record<string, unknown> | FormData,
): RequestConfig {
  const config = loadConfig();
  const baseUrl = process.env.YULONG_BASE_URL || config.baseUrl;

  if (!baseUrl) {
    throw new Error('未配置 baseUrl，请在 config.json 中设置或通过 YULONG_BASE_URL 环境变量指定');
  }

  const permission = getApiPermission(context.command);
  if (!permission) {
    logger.warn(`未找到命令 ${context.command} 的权限映射，将继续执行但无权限预检`);
  }

  const method = permission?.method || 'GET';
  const path = permission?.path || '';

  if (!path) {
    throw new Error(`未找到命令 ${context.command} 的路径映射，无法构造请求`);
  }

  // 构造 URL，替换路径参数占位符
  const resolvedPath = resolvePath(path, context.args, params);
  const url = `${baseUrl.replace(/\/$/, '')}${resolvedPath}`;

  // 构造 headers
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = token;
  }

  // X-ResourceMark
  const resourceMark = context.options.resourceMark || permission?.resource_mark;
  if (resourceMark) {
    headers['X-ResourceMark'] = resourceMark;
  }

  // 根据 method 决定 params 放 query 还是 body
  // 如果调用方显式传了 body（如文件上传的 FormData），优先使用显式 body
  const body = explicitBody !== undefined
    ? explicitBody
    : (['POST', 'PUT', 'PATCH'].includes(method) ? params : undefined);
  const queryParams = ['GET', 'DELETE'].includes(method) ? params : undefined;

  // JSON body 需要显式设置 Content-Type，否则部分后端接口会拒绝
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return {
    method,
    url,
    params: queryParams,
    body,
    headers,
    timeout: config.timeout,
  };
}

/**
 * 自动重新登录并刷新权限缓存
 *
 * 用于 refreshToken 缺失/过期时的降级，等价于一次完整的 `yulong auth login`。
 * 通过动态导入 permission-guard 避免与 refreshAccessToken 形成循环依赖。
 */
async function loginAndRefreshPermissions(userid: string, timeoutSeconds: number): Promise<string> {
  const accessToken = await thirdPartyLogin(userid, timeoutSeconds);
  try {
    const { refreshUserPermissions } = await import('./permission-guard');
    await refreshUserPermissions(userid);
  }
  catch (err) {
    logger.warn(`自动登录后权限刷新失败: ${err instanceof Error ? err.message : String(err)}`);
  }
  return accessToken;
}

/**
 * 刷新 accessToken
 *
 * 调用 POST /auth/token/refresh，成功后更新本地 tokens。
 * 若提供了 userid，刷新 token 后还会同步刷新权限缓存；
 * 若 refreshToken 失效且提供了 userid，则自动重新登录并刷新权限缓存。
 *
 * 注意：refreshToken 通过 URL query 参数传递，与前端
 * `apps/rbac/src/api/modules/auth/renzhengfuwu.ts` 中的调用方式保持一致。
 */
export async function refreshAccessToken(
  timeoutSeconds = 30,
  options: { userid?: string } = {},
): Promise<string> {
  const config = loadConfig();
  const baseUrl = process.env.YULONG_BASE_URL || config.baseUrl;
  const refreshToken = getRefreshToken();
  const existingTokens = loadTokens();

  if (!baseUrl) {
    const err = new Error('未配置 baseUrl，无法刷新 token');
    err.name = ErrorType.CONFIG_ERROR;
    throw err;
  }

  if (!refreshToken) {
    // refreshToken 不存在时，若有 userid，尝试自动重新登录并刷新权限
    if (options.userid) {
      logger.info('refreshToken 不存在，尝试自动重新登录...');
      return await loginAndRefreshPermissions(options.userid, timeoutSeconds);
    }
    clearTokens();
    const err = new Error('refreshToken 不存在，请重新登录');
    err.name = ErrorType.AUTH_REQUIRED;
    throw err;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/auth/token/refresh?refreshToken=${encodeURIComponent(refreshToken)}`;
  logger.info('正在刷新 accessToken...');

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
      body: JSON.stringify({}),
      signal: controller.signal,
    });
  }
  catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      const error = new Error(`刷新 token 请求超时 (${timeoutSeconds}秒)`);
      error.name = ErrorType.NETWORK_ERROR;
      throw error;
    }
    const error = new Error(`刷新 token 网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.NETWORK_ERROR;
    throw error;
  }

  clearTimeout(timeoutId);

  let data: BackendResponse;
  try {
    data = await response.json() as BackendResponse;
  }
  catch (err) {
    const error = new Error(`刷新 token 响应解析失败 (HTTP ${response.status}): ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.BACKEND_ERROR;
    throw error;
  }

  if (data.code === 400001004) {
    // refreshToken 过期：有 userid 时尝试自动重新登录并刷新权限，否则清 token 抛错
    if (options.userid) {
      logger.info('refreshToken 已过期，尝试自动重新登录...');
      return await loginAndRefreshPermissions(options.userid, timeoutSeconds);
    }
    clearTokens();
    const err = new Error(data.msg || 'refreshToken 已过期，请重新登录');
    err.name = ErrorType.AUTH_REQUIRED;
    throw err;
  }

  if (data.code !== 0) {
    const err = new Error(`刷新 token 失败 [${data.code}] ${data.msg || ''}`);
    err.name = ErrorType.BACKEND_ERROR;
    throw err;
  }

  const tokenData = data.data as { accessToken?: string; refreshToken?: string } | undefined;
  if (!tokenData?.accessToken) {
    const err = new Error('刷新 token 响应缺少 accessToken');
    err.name = ErrorType.BACKEND_ERROR;
    throw err;
  }

  // 后端不返回过期时间，按 1 小时兜底；SSO 上线后可改为从响应读取
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  saveTokens({
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken || refreshToken,
    expiresAt,
    orgId: existingTokens?.orgId,
  });

  // 刷新 token 成功后，若知道当前用户，同步刷新权限缓存
  if (options.userid) {
    try {
      const { refreshUserPermissions } = await import('./permission-guard');
      await refreshUserPermissions(options.userid);
    }
    catch (err) {
      logger.warn(`刷新 token 后权限刷新失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  logger.info('accessToken 刷新成功');
  return tokenData.accessToken;
}

/**
 * 执行 HTTP 请求
 *
 * 使用原生 fetch，支持超时、自动刷新 token、后端错误码映射
 */
export async function request(config: RequestConfig): Promise<unknown> {
  return doRequest(config, false);
}

async function doRequest(config: RequestConfig, retried: boolean): Promise<unknown> {
  const timeout = config.timeout || 30;

  // 拼接 URL 与 query 参数
  const url = new URL(config.url);
  if (config.params) {
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

  logger.info(`请求 ${config.method} ${url.toString()}`);

  let response: Response;
  try {
    const fetchBody: BodyInit | undefined = config.body instanceof FormData
      ? config.body
      : (config.body ? JSON.stringify(config.body) : undefined);
    response = await fetch(url.toString(), {
      method: config.method,
      headers: config.headers,
      body: fetchBody,
      signal: controller.signal,
    });
  }
  catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        const error = new Error(`请求超时 (${timeout}秒)`);
        error.name = ErrorType.NETWORK_ERROR;
        throw error;
      }
      const error = new Error(`网络请求失败: ${err.message}`);
      error.name = ErrorType.NETWORK_ERROR;
      throw error;
    }
    const error = new Error(`网络请求失败: ${String(err)}`);
    error.name = ErrorType.NETWORK_ERROR;
    throw error;
  }

  clearTimeout(timeoutId);

  const contentType = response.headers.get('content-type') || '';

  // 导出类接口返回二进制文件流，直接返回 base64 文件信息给调用方
  if (
    contentType.includes('application/octet-stream') ||
    contentType.includes('application/vnd.openxmlformats-officedocument') ||
    contentType.includes('application/vnd.ms-excel') ||
    contentType.includes('application/zip') ||
    response.headers.get('content-disposition')?.includes('attachment')
  ) {
    const arrayBuffer = await response.arrayBuffer();
    return {
      type: 'file',
      contentType,
      contentDisposition: response.headers.get('content-disposition') || undefined,
      size: arrayBuffer.byteLength,
      buffer: Buffer.from(arrayBuffer).toString('base64'),
    };
  }

  let data: BackendResponse;
  try {
    data = await response.json() as BackendResponse;
  }
  catch (err) {
    const error = new Error(`响应解析失败 (HTTP ${response.status}): ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.NETWORK_ERROR;
    throw error;
  }

  // 成功
  if (data.code === 0) {
    return data.data;
  }

  // accessToken 过期或无效：刷新并重试一次
  // 后端对过期/非法 accessToken 统一返回 400001004，refreshToken 过期也返回 400001004
  // 因此先尝试刷新，若刷新接口 itself 返回 400001004，refreshAccessToken 会清 token 并抛错
  if (data.code === 400001006 || data.code === 400001004) {
    if (retried) {
      const err = new Error('token 刷新后仍无效，请重新登录');
      err.name = ErrorType.AUTH_REQUIRED;
      throw err;
    }
    logger.info('accessToken 过期或无效，尝试刷新...');
    const newToken = await refreshAccessToken(timeout, { userid: config.userid });
    const retryHeaders = { ...config.headers };
    if (newToken) {
      retryHeaders.Authorization = newToken;
    }
    return await doRequest({ ...config, headers: retryHeaders }, true);
  }

  // 访问未授权
  if (data.code === 400001007) {
    const err = new Error(data.msg || '访问未授权');
    err.name = ErrorType.PERMISSION_DENIED;
    throw err;
  }

  // 其他后端错误：-1, 4, 400001001, 400001003 等
  const err = new Error(`[${data.code}] ${data.msg || '后端业务错误'}`);
  err.name = ErrorType.BACKEND_ERROR;
  (err as Error & { detail?: Record<string, unknown> }).detail = {
    code: data.code,
    message: data.msg,
    hint: data.hint,
  };
  throw err;
}
