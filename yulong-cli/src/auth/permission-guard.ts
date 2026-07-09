import { getUserPermissions, setUserPermissions } from '../core/db';
import { getAccessToken } from './token-manager';
import { loadConfig } from '../core/config';
import { refreshAccessToken } from '../core/api-client';
import { ErrorType } from '../core/envelope';
import * as logger from '../core/logger';
import type { PermissionCheckResult } from '../core/types';

/**
 * 检查用户权限
 *
 * 注意：这是 Skill 层第一道防线，后端仍是最终防线
 */
export async function checkPermission(
  userid: string,
  requiredPermissions: string[],
  matchMode: 'any' | 'all',
): Promise<PermissionCheckResult> {
  // 1. 获取用户权限缓存
  let userPermissions: string[] = [];

  const cached = getUserPermissions(userid);
  if (cached) {
    try {
      userPermissions = JSON.parse(cached.permissions);
    }
    catch {
      userPermissions = [];
    }
  }

  // 2. 无缓存时尝试刷新
  if (!cached || userPermissions.length === 0) {
    try {
      userPermissions = await refreshUserPermissions(userid);
    }
    catch (err) {
      logger.warn(`权限缓存刷新失败: ${err instanceof Error ? err.message : String(err)}`);
      // 刷新失败时继续用空权限，让后续逻辑自然拒绝或让后端判断
    }
  }

  // 3. 权限对比
  // 特殊约定：required_permissions 为 ["all"] 且 match_mode 为 all 时，对任意已登录用户开放
  let passed = false;
  if (matchMode === 'all' && requiredPermissions.length === 1 && requiredPermissions[0] === 'all') {
    passed = true;
  }
  else if (matchMode === 'all') {
    passed = requiredPermissions.every(p => userPermissions.includes(p));
  }
  else {
    passed = requiredPermissions.some(p => userPermissions.includes(p));
  }

  const missing = passed
    ? undefined
    : requiredPermissions.filter(p => !userPermissions.includes(p));

  return {
    passed,
    required: requiredPermissions,
    matchMode,
    userHas: userPermissions,
    missing,
  };
}

/**
 * 通过指定 token 拉取用户权限
 *
 * Token 模式专用：不读/写本地 user_permissions 缓存，token 失效直接抛 auth_required。
 */
export async function fetchUserPermissions(token: string): Promise<string[]> {
  const config = loadConfig();
  const baseUrl = process.env.YULONG_BASE_URL || config.baseUrl;

  if (!baseUrl) {
    const err = new Error('未配置 baseUrl，无法获取权限');
    err.name = ErrorType.CONFIG_ERROR;
    throw err;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rbac/resource/grantedResources`;
  logger.info('正在使用外部 token 获取用户权限...');

  const timeoutSeconds = config.timeout || 30;

  interface BackendResponse {
    code: number;
    msg: string;
    data?: string[];
    success?: boolean;
    hint?: string;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token,
      },
      signal: controller.signal,
    });
  }
  catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      const error = new Error(`获取权限请求超时 (${timeoutSeconds}秒)`);
      error.name = ErrorType.NETWORK_ERROR;
      throw error;
    }
    const error = new Error(`获取权限网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.NETWORK_ERROR;
    throw error;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const err = new Error(`获取权限请求失败 (HTTP ${response.status} ${response.statusText})`);
    err.name = ErrorType.NETWORK_ERROR;
    throw err;
  }

  let data: BackendResponse;
  try {
    data = await response.json() as BackendResponse;
  }
  catch (err) {
    const error = new Error(`获取权限响应解析失败 (HTTP ${response.status}): ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.BACKEND_ERROR;
    throw error;
  }

  if (data.code === 400001006 || data.code === 400001004) {
    const err = new Error(data.msg || '外部 token 已失效，请重新获取 token');
    err.name = ErrorType.AUTH_REQUIRED;
    throw err;
  }

  if (data.code !== 0) {
    const err = new Error(`获取权限失败 [${data.code}] ${data.msg || ''}`);
    err.name = ErrorType.BACKEND_ERROR;
    (err as Error & { detail?: Record<string, unknown> }).detail = {
      code: data.code,
      message: data.msg,
      hint: data.hint,
    };
    throw err;
  }

  const permissions = data.data || [];
  logger.info(`已获取权限: ${permissions.length} 个`);
  return permissions;
}

/**
 * 检查 token 是否存在
 */
export function hasToken(): boolean {
  return !!getAccessToken();
}

/**
 * 刷新用户权限缓存
 *
 * 调用 GET /rbac/resource/grantedResources，获取当前用户权限列表并写入缓存。
 */
export async function refreshUserPermissions(userid: string): Promise<string[]> {
  const config = loadConfig();
  const baseUrl = process.env.YULONG_BASE_URL || config.baseUrl;

  if (!baseUrl) {
    const err = new Error('未配置 baseUrl，无法刷新权限');
    err.name = ErrorType.CONFIG_ERROR;
    throw err;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rbac/resource/grantedResources`;
  logger.info('正在刷新用户权限缓存...');

  const timeoutSeconds = config.timeout || 30;

  interface BackendResponse {
    code: number;
    msg: string;
    data?: string[];
    success?: boolean;
    hint?: string;
  }

  async function fetchPermissions(retried: boolean): Promise<string[]> {
    const token = getAccessToken();
    if (!token) {
      const err = new Error('未登录，无法刷新权限');
      err.name = ErrorType.AUTH_REQUIRED;
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token,
        },
        signal: controller.signal,
      });
    }
    catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        const error = new Error(`刷新权限请求超时 (${timeoutSeconds}秒)`);
        error.name = ErrorType.NETWORK_ERROR;
        throw error;
      }
      const error = new Error(`刷新权限网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
      error.name = ErrorType.NETWORK_ERROR;
      throw error;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = new Error(`刷新权限请求失败 (HTTP ${response.status} ${response.statusText})`);
      err.name = ErrorType.NETWORK_ERROR;
      throw err;
    }

    let data: BackendResponse;
    try {
      data = await response.json() as BackendResponse;
    }
    catch (err) {
      const error = new Error(`刷新权限响应解析失败 (HTTP ${response.status}): ${err instanceof Error ? err.message : String(err)}`);
      error.name = ErrorType.BACKEND_ERROR;
      throw error;
    }

    // accessToken 过期/无效：先刷新 token，再重试一次权限拉取
    if ((data.code === 400001006 || data.code === 400001004) && !retried) {
      logger.info('拉取权限时 accessToken 过期，尝试刷新...');
      await refreshAccessToken(timeoutSeconds, { userid });
      return fetchPermissions(true);
    }

    if (data.code !== 0) {
      const err = new Error(`刷新权限失败 [${data.code}] ${data.msg || ''}`);
      err.name = ErrorType.BACKEND_ERROR;
      (err as Error & { detail?: Record<string, unknown> }).detail = {
        code: data.code,
        message: data.msg,
        hint: data.hint,
      };
      throw err;
    }

    const permissions = data.data || [];
    setUserPermissions(userid, permissions);
    logger.info(`权限缓存已更新: ${permissions.length} 个权限`);
    return permissions;
  }

  return fetchPermissions(false);
}
