import { Database } from 'bun:sqlite';
import * as os from 'os';
import * as path from 'path';
import { loadConfig } from './config';
import type { GlobalOptions } from './types';

function getYuxiaolongDbPath(): string | undefined {
  if (process.platform !== 'darwin') {
    return undefined;
  }
  return path.join(os.homedir(), 'Library', 'Application Support', '御小龙', 'yuxiaolong.db');
}

function resolveUserDbPath(): string {
  const config = loadConfig();
  const envPath = process.env.YULONG_USER_DB_PATH;
  if (envPath) {
    return envPath;
  }
  if (config.userDbPath) {
    return config.userDbPath;
  }
  const defaultPath = getYuxiaolongDbPath();
  if (defaultPath) {
    return defaultPath;
  }
  throw new Error('未配置用户数据库路径，请设置 YULONG_USER_DB_PATH 环境变量或在 config.json 中配置 userDbPath');
}

interface UserRow {
  userid: string;
  org_id?: string;
}

function readFromAuthSessions(db: Database): UserRow | null {
  try {
    const stmt = db.query(
      "SELECT json_extract(user_info, '$.id') AS userid, json_extract(user_info, '$.orgId') AS org_id FROM auth_sessions WHERE id = 'current'",
    );
    return stmt.get() as UserRow | null;
  }
  catch {
    return null;
  }
}

function readFromUsers(db: Database): UserRow | null {
  try {
    const stmt = db.query('SELECT userid, org_id FROM users ORDER BY created_at DESC LIMIT 1');
    return stmt.get() as UserRow | null;
  }
  catch {
    return null;
  }
}

/**
 * 解析当前用户
 *
 * 读取顺序：
 * 1. 环境变量 / 配置文件显式指定的用户数据库
 * 2. macOS 上御小龙默认数据库：~/Library/Application Support/御小龙/yuxiaolong.db
 *
 * 支持两种 schema：
 * - 御小龙：auth_sessions.id = 'current'，用户信息在 user_info JSON 中
 * - 本地约定数据库：users 表，取 created_at 最新的一条
 */
export async function resolveUser(_options: GlobalOptions): Promise<string> {
  const dbPath = resolveUserDbPath();

  const db = new Database(dbPath, { readonly: true, create: false });
  try {
    let user = readFromAuthSessions(db);
    if (!user) {
      user = readFromUsers(db);
    }

    if (user?.userid) {
      return user.userid;
    }

    throw new Error('未配置用户，请先在御小龙登录或写入 users.db');
  }
  finally {
    db.close();
  }
}
