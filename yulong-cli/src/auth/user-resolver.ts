import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig } from '../core/config';
import type { GlobalOptions } from '../core/types';

function getYuxiaolongDbPath(): string | undefined {
  if (process.platform !== 'darwin') {
    return undefined;
  }
  return path.join(os.homedir(), 'Library', 'Application Support', '御小龙', 'yuxiaolong.db');
}

/**
 * 显式配置的数据库路径（最高优先级）
 *
 * 用于测试或非 macOS 环境显式指定御小龙身份数据库。
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
 * 默认候选路径（仅 macOS 御小龙 DB）
 */
function getDefaultUserDbCandidates(): string[] {
  const yuxiaolongPath = getYuxiaolongDbPath();
  return yuxiaolongPath ? [yuxiaolongPath] : [];
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

/**
 * 解析当前用户
 *
 * 读取顺序：
 * 1. 环境变量 / 配置文件显式指定的御小龙数据库
 * 2. macOS 上御小龙默认数据库：~/Library/Application Support/御小龙/yuxiaolong.db
 *
 * 只支持御小龙 schema：auth_sessions.id = 'current'，用户信息在 user_info JSON 中。
 */
export async function resolveUser(_options: GlobalOptions): Promise<string> {
  const explicitPath = resolveExplicitUserDbPath();
  const candidates = explicitPath ? [explicitPath] : getDefaultUserDbCandidates();
  const tried: string[] = [];

  if (candidates.length === 0) {
    throw new Error('未配置御小龙用户数据库，请先在御小龙登录，或通过 YULONG_USER_DB_PATH / config.userDbPath 指定数据库路径。');
  }

  for (const dbPath of candidates) {
    if (!fs.existsSync(dbPath)) {
      tried.push(`${dbPath} (文件不存在)`);
      continue;
    }

    const db = new Database(dbPath, { readonly: true, create: false });
    try {
      const user = readFromAuthSessions(db);
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

  throw new Error(`未配置用户，请先在御小龙登录。已尝试：${tried.join('; ')}`);
}
