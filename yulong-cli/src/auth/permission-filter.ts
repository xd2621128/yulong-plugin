import type { ApiPermission } from '../core/types';

/**
 * 判断一个命令是否已开放
 *
 * 标准与 `yulong schema` 保持一致：
 * - required_permissions 非空（有具体权限要求），或
 * - match_mode === 'all'（对认证用户开放）
 *
 * required_permissions 为空的命令被视为未配置/未开放。
 */
export function isOpenPermission(permission: ApiPermission): boolean {
  try {
    const required = JSON.parse(permission.required_permissions) as string[];
    return required.length > 0 || permission.match_mode === 'all';
  }
  catch {
    return false;
  }
}

/**
 * 过滤出已开放的命令
 */
export function filterOpenPermissions(permissions: ApiPermission[]): ApiPermission[] {
  return permissions.filter(isOpenPermission);
}
