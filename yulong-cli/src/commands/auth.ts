import { refreshUserPermissions, fetchUserPermissions } from '../auth/permission-guard';
import { loadTokens, clearTokens, isAccessTokenExpired } from '../auth/token-manager';
import { loadConfig } from '../core/config';
import { resolveUser } from '../auth/user-resolver';
import { thirdPartyLogin } from '../auth/auth-core';
import { ErrorType } from '../core/envelope';
import * as logger from '../core/logger';
import type { CommandContext } from '../core/types';

function assertNotTokenMode(subCommand: string, context: CommandContext): void {
  if (context.options.token) {
    const err = new Error(`当前使用 --token 模式，auth ${subCommand} 不可用（仍可使用 auth status / refresh-permissions）`);
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }
}

/**
 * 通过第三方登录接口获取 token
 *
 * 调用 POST /hr/auth/extends/login/third/party4UserId
 */
async function login(context: CommandContext): Promise<unknown> {
  assertNotTokenMode('login', context);

  const loginName = await resolveUser(context.options);
  await thirdPartyLogin(loginName, loadConfig().timeout || 30);

  // 登录成功后刷新权限缓存
  let permissions: string[] = [];
  try {
    permissions = await refreshUserPermissions(loginName);
  }
  catch (err) {
    logger.warn(`登录后权限刷新失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  const tokens = loadTokens();
  return {
    status: 'logged_in',
    expiresAt: tokens?.expiresAt,
    orgId: tokens?.orgId,
    permissionCount: permissions.length,
  };
}

/**
 * 登出
 */
async function logout(context: CommandContext): Promise<unknown> {
  assertNotTokenMode('logout', context);
  clearTokens();
  logger.info('已清除本地 token');
  return { status: 'logged_out' };
}

/**
 * 查看 token 状态
 */
async function status(context: CommandContext): Promise<unknown> {
  if (context.options.token) {
    return {
      status: 'token_mode',
      message: '当前使用 --token 外部 token',
    };
  }

  const tokens = loadTokens();
  if (!tokens) {
    return {
      status: 'not_authenticated',
      message: '未登录，请使用 yulong auth login 登录',
    };
  }

  const expired = isAccessTokenExpired(tokens);
  return {
    status: expired ? 'access_token_expired' : 'authenticated',
    accessToken: `${tokens.accessToken.slice(0, 10)}...`,
    expiresAt: tokens.expiresAt,
    orgId: tokens.orgId,
    expired,
  };
}

/**
 * 刷新本地权限缓存
 *
 * 调用 GET /rbac/resource/grantedResources，不重新登录。
 */
async function refreshPermissions(context: CommandContext): Promise<unknown> {
  if (context.options.token) {
    const permissions = await fetchUserPermissions(context.options.token);
    return {
      status: 'permissions_fetched',
      mode: 'token',
      permissionCount: permissions.length,
    };
  }

  const loginName = await resolveUser(context.options);
  const permissions = await refreshUserPermissions(loginName);
  return {
    status: 'permissions_refreshed',
    mode: 'local',
    permissionCount: permissions.length,
  };
}

/**
 * 切换组织（骨架，待 SSO/组织切换接口提供后实现）
 */
async function switchOrg(context: CommandContext): Promise<unknown> {
  assertNotTokenMode('switch-org', context);

  let payload: Record<string, unknown> = {};
  if (context.options.json) {
    try {
      payload = JSON.parse(context.options.json);
    }
    catch (err) {
      const error = new Error(`参数 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`);
      error.name = ErrorType.VALIDATION_ERROR;
      throw error;
    }
  }

  const orgId = payload.orgId;
  if (!orgId) {
    const err = new Error('请通过 --json \'{ "orgId": "xxx" }\' 指定目标组织');
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }

  // TODO: 调用 /auth/changeLoginOrg 接口
  return {
    status: 'not_implemented',
    message: '组织切换接口尚未实现',
    targetOrgId: orgId,
  };
}

/**
 * 处理 auth 子命令
 */
export async function handle(subCommand: string, context: CommandContext): Promise<unknown> {
  if (!subCommand) {
    const err = new Error('请指定 auth 子命令。可用: login, logout, status, switch-org, refresh-permissions');
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }

  switch (subCommand) {
    case 'login':
      return login(context);
    case 'logout':
      return logout(context);
    case 'status':
      return status(context);
    case 'refresh-permissions':
      return refreshPermissions(context);
    case 'switch-org':
      return switchOrg(context);
    default: {
      const err = new Error(`未知 auth 子命令: ${subCommand}。可用: login, logout, status, switch-org, refresh-permissions`);
      err.name = ErrorType.VALIDATION_ERROR;
      throw err;
    }
  }
}
