import { loadConfig, getUserDbPath, getUserId } from './config';
import { getDb } from './db';
import type { GlobalOptions } from './types';

export interface ResolvedUser {
  userid: string;
  /** 用户来源：db 表示来自约定数据库；explicit 表示数据库为空时由 --userid/YULONG_USERID 兜底指定 */
  source: 'db' | 'explicit';
}

/**
 * 解析当前用户
 *
 * 按 plan.md §4.1 约定：
 * 1. 优先从约定数据库读取唯一用户
 * 2. 数据库为空时，使用 --userid 或 YULONG_USERID 作为兜底指定
 *
 * 当前实现读取本地 users.db 作为约定数据库的占位，后续可直接替换为御小龙真实数据库。
 */
export async function resolveUser(options: GlobalOptions): Promise<ResolvedUser> {
  // 1. 从约定数据库读取唯一用户
  const config = loadConfig();
  const userDbPath = getUserDbPath(config);
  if (!userDbPath) {
    throw new Error('未配置用户数据库路径，请设置 YULONG_USER_DB_PATH 环境变量或在 config.json 中配置 userDbPath');
  }

  process.env.YULONG_USER_DB_PATH = userDbPath;
  const db = getDb();
  const stmt = db.query('SELECT userid, org_id FROM users ORDER BY created_at DESC LIMIT 1');
  const user = stmt.get() as { userid: string; org_id?: string } | null;
  if (user) {
    return { userid: user.userid, source: 'db' };
  }

  // 2. 数据库为空时，使用 --userid 或 YULONG_USERID 兜底
  const explicitUserId = getUserId(options);
  if (explicitUserId) {
    return { userid: explicitUserId, source: 'explicit' };
  }

  throw new Error('未找到用户配置，请先配置 users 表或指定 --userid');
}
