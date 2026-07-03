import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, getDataDir } from './config';
import type { GlobalOptions } from './types';

function getYuxiaolongDbPath(): string | undefined {
  if (process.platform !== 'darwin') {
    return undefined;
  }
  return path.join(os.homedir(), 'Library', 'Application Support', '御小龙', 'yuxiaolong.db');
}

/**
 * 显式配置的数据库路径（最高优先级）
 */
function resolveExplicitUserDbPath(): string | undefined {
  const config = loadConfig();
  if (process.env.YULONG_USER_DB_PATH) {
    return process.env.YULONG_USER_DB_PATH;
  }
  if (config.userDbPath) {
    return config.userDbPath;
  }
  return undefined;
}

/**
 * 默认候选路径（macOS 御小龙 DB → CLI 自带的 users.db）
 */
function getDefaultUserDbCandidates(): string[] {
  const candidates: string[] = [];
  const yuxiaolongPath = getYuxiaolongDbPath();
  if (yuxiaolongPath) {
    candidates.push(yuxiaolongPath);
  }
  candidates.push(path.join(getDataDir(), 'users.db'));
  return candidates;
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
 * 3. CLI 自带的 users.db：{dataDir}/users.db
 *
 * 支持两种 schema：
 * - 御小龙：auth_sessions.id = 'current'，用户信息在 user_info JSON 中
 * - 本地约定数据库：users 表，取 created_at 最新的一条
 */
export async function resolveUser(_options: GlobalOptions): Promise<string> {
  const explicitPath = resolveExplicitUserDbPath();
  const candidates = explicitPath ? [explicitPath] : getDefaultUserDbCandidates();
  const tried: string[] = [];

  for (const dbPath of candidates) {
    if (!fs.existsSync(dbPath)) {
      tried.push(`${dbPath} (文件不存在)`);
      continue;
    }

    const db = new Database(dbPath, { readonly: true, create: false });
    try {
      const user = readFromAuthSessions(db) ?? readFromUsers(db);
      if (user?.userid) {
        return user.userid;
      }
      tried.push(`${dbPath} (未找到用户)`);
    }
    catch (err) {
      tried.push(`${dbPath} (${err instanceof Error ? err.message : String(err)})`);
    }
    finally {
      db.close();
    }
  }

  throw new Error(`未配置用户，请先在御小龙登录或写入 users.db。已尝试：${tried.join('; ')}`);
}
