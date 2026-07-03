import { loadConfig, getUserDbPath } from './config';
import { getDb } from './db';
import type { GlobalOptions } from './types';

/**
 * 解析当前用户
 *
 * 按 plan.md 约定：
 * 1. 只从约定数据库读取最新用户（created_at DESC LIMIT 1）
 * 2. 数据库为空时直接报错
 *
 * 当前实现读取本地 users.db 作为约定数据库的占位，后续可直接替换为御小龙真实数据库。
 */
export async function resolveUser(_options: GlobalOptions): Promise<string> {
  // 1. 从约定数据库读取最新用户
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
    return user.userid;
  }

  throw new Error('未配置用户，请先写入 users.db');
}
