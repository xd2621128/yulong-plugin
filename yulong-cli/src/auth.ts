import { refreshUserPermissions } from './permission-guard';
import { loadTokens, saveTokens, clearTokens, isAccessTokenExpired } from './token-manager';
import { loadConfig } from './config';
import { resolveUser } from './user-resolver';
import { thirdPartyLogin } from './auth-core';
import { ErrorType } from './envelope';
import * as logger from './logger';
import type { CommandContext } from './types';

function parseExpiresAt(input?: string): string {
  if (!input) {
    // 默认 1 小时后过期
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  return input;
}

/**
 * 通过第三方登录接口获取 token
 *
 * 调用 POST /hr/auth/extends/login/third/party4UserId
 */
async function login(context: CommandContext): Promise<unknown> {
  // 解析登录用户：--userid > YULONG_USERID > 约定数据库唯一用户
  let loginName: string;
  if (context.options.userid) {
    loginName = context.options.userid;
  }
  else if (process.env.YULONG_USERID) {
    loginName = process.env.YULONG_USERID;
  }
  else {
    const user = await resolveUser(context.options);
    loginName = user.userid;
  }

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
async function logout(_context: CommandContext): Promise<unknown> {
  clearTokens();
  logger.info('已清除本地 token');
  return { status: 'logged_out' };
}

/**
 * 查看 token 状态
 */
async function status(_context: CommandContext): Promise<unknown> {
  const tokens = loadTokens();
  if (!tokens) {
    return {
      status: 'not_authenticated',
      message: '未登录，请使用 yulong auth login 登录或 yulong auth import-token 手动注入 token',
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
  let loginName: string;
  if (context.options.userid) {
    loginName = context.options.userid;
  }
  else if (process.env.YULONG_USERID) {
    loginName = process.env.YULONG_USERID;
  }
  else {
    const user = await resolveUser(context.options);
    loginName = user.userid;
  }

  const permissions = await refreshUserPermissions(loginName);
  return {
    status: 'permissions_refreshed',
    permissionCount: permissions.length,
  };
}

/**
 * 切换组织（骨架，待 SSO/组织切换接口提供后实现）
 */
async function switchOrg(context: CommandContext): Promise<unknown> {
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
 * 手动导入 token（SSO 未上线前的降级方案）
 */
async function importToken(context: CommandContext): Promise<unknown> {
  let params: Record<string, unknown> = {};
  if (context.options.json) {
    try {
      params = JSON.parse(context.options.json);
    }
    catch (err) {
      const error = new Error(`参数 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`);
      error.name = ErrorType.VALIDATION_ERROR;
      throw error;
    }
  }

  const accessToken = (params.accessToken || params['access-token']) as string | undefined;
  const refreshToken = (params.refreshToken || params['refresh-token']) as string | undefined;
  const expiresAt = parseExpiresAt((params.expiresAt || params['expires-at']) as string | undefined);
  const orgId = (params.orgId || params['org-id']) as string | undefined;

  if (!accessToken) {
    const err = new Error('缺少 accessToken，请通过 --json 传入');
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }
  if (!refreshToken) {
    const err = new Error('缺少 refreshToken，请通过 --json 传入');
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }

  saveTokens({
    accessToken,
    refreshToken,
    expiresAt,
    orgId,
  });

  logger.info('token 已保存');
  return {
    status: 'token_imported',
    expiresAt,
    orgId,
  };
}

/**
 * 处理 auth 子命令
 */
export async function handle(subCommand: string, context: CommandContext): Promise<unknown> {
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
    case 'import-token':
      return importToken(context);
    default: {
      const err = new Error(`未知 auth 子命令: ${subCommand}。可用: login, logout, status, switch-org, import-token, refresh-permissions`);
      err.name = ErrorType.VALIDATION_ERROR;
      throw err;
    }
  }
}
