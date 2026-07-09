import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { getDataDir, loadConfig } from './config';
import * as logger from './logger';
import type { ApiPermission, UserPermission } from './types';

const DB_NAME = 'yulong.db';

const CLI_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS user_permissions (
    userid TEXT PRIMARY KEY,
    permissions TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    command_name TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    required_permissions TEXT NOT NULL,
    match_mode TEXT NOT NULL DEFAULT 'any',
    is_dangerous INTEGER DEFAULT 0,
    needs_resource_mark INTEGER DEFAULT 1,
    resource_mark TEXT,
    description TEXT,
    created_at TEXT,
    UNIQUE(command_name)
  );
`;

let db: Database | null = null;

function getDbPath(): string {
  const config = loadConfig();
  return process.env.YULONG_DB_PATH || config.dbPath || path.join(getDataDir(), DB_NAME);
}

/**
 * 一次性迁移旧版 users.db 到 yulong.db
 *
 * 旧 users.db 中唯一需要保留的数据是 api_permissions 和 user_permissions。
 * users 表将被丢弃，因为用户身份现在来自御小龙 yuxiaolong.db。
 */
function migrateLegacyUsersDb(targetDbPath: string): void {
  if (fs.existsSync(targetDbPath)) {
    return;
  }

  const dataDir = path.dirname(targetDbPath);
  const legacyPath = path.join(dataDir, 'users.db');
  if (!fs.existsSync(legacyPath)) {
    return;
  }

  logger.info(`检测到旧版 users.db，正在迁移到 ${DB_NAME}...`);

  const newDb = new Database(targetDbPath);
  try {
    newDb.exec(CLI_SCHEMA_SQL);
    newDb.exec(`ATTACH DATABASE '${legacyPath}' AS legacy`);

    const tables = newDb.query(
      "SELECT name FROM legacy.sqlite_master WHERE type='table' AND name IN ('api_permissions', 'user_permissions')",
    ).all() as { name: string }[];

    for (const { name } of tables) {
      newDb.exec(`INSERT INTO ${name} SELECT * FROM legacy.${name}`);
      logger.info(`已迁移表: ${name}`);
    }

    newDb.exec('DETACH DATABASE legacy');
  }
  catch (err) {
    logger.warn(`迁移旧版 users.db 失败: ${err instanceof Error ? err.message : String(err)}`);
  }
  finally {
    newDb.close();
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(dataDir, `users.db.bak.${timestamp}`);
    fs.renameSync(legacyPath, backupPath);
    logger.info(`已备份旧版 users.db 到 ${backupPath}`);
  }
  catch (err) {
    logger.warn(`备份旧版 users.db 失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function getDb(): Database {
  if (!db) {
    const dbPath = getDbPath();
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    migrateLegacyUsersDb(dbPath);

    db = new Database(dbPath);
    // 每次启动都确保表/触发器存在，兼容旧 DB 升级
    initSchema();
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initSchema(): void {
  const database = getDb();
  database.exec(CLI_SCHEMA_SQL);
}

export function getUserPermissions(userid: string): UserPermission | null {
  const database = getDb();
  const stmt = database.query('SELECT userid, permissions FROM user_permissions WHERE userid = ?');
  return stmt.get(userid) as UserPermission | null;
}

export function setUserPermissions(userid: string, permissions: string[]): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.run(
    `INSERT INTO user_permissions (userid, permissions, fetched_at)
     VALUES (?, ?, ?)
     ON CONFLICT(userid) DO UPDATE SET
       permissions = excluded.permissions,
       fetched_at = excluded.fetched_at`,
    [userid, JSON.stringify(permissions), now],
  );
}

export function getApiPermission(commandName: string): ApiPermission | null {
  const database = getDb();
  const stmt = database.query(
    'SELECT * FROM api_permissions WHERE command_name = ?',
  );
  return stmt.get(commandName) as ApiPermission | null;
}

export function listApiPermissions(module?: string): ApiPermission[] {
  const database = getDb();
  if (module) {
    const stmt = database.query('SELECT * FROM api_permissions WHERE module = ? ORDER BY command_name');
    return stmt.all(module) as ApiPermission[];
  }
  const stmt = database.query('SELECT * FROM api_permissions ORDER BY command_name');
  return stmt.all() as ApiPermission[];
}

export function listApiPermissionsByPrefix(prefix: string): ApiPermission[] {
  const database = getDb();
  const stmt = database.query('SELECT * FROM api_permissions WHERE command_name LIKE ? ORDER BY command_name');
  return stmt.all(`${prefix}.%`) as ApiPermission[];
}

export function upsertApiPermission(permission: Omit<ApiPermission, 'id'>): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.run(
    `INSERT INTO api_permissions
     (module, resource, action, command_name, method, path, required_permissions, match_mode, is_dangerous, needs_resource_mark, resource_mark, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(command_name) DO UPDATE SET
       module = excluded.module,
       resource = excluded.resource,
       action = excluded.action,
       command_name = excluded.command_name,
       method = excluded.method,
       path = excluded.path,
       required_permissions = excluded.required_permissions,
       match_mode = excluded.match_mode,
       is_dangerous = excluded.is_dangerous,
       needs_resource_mark = excluded.needs_resource_mark,
       resource_mark = excluded.resource_mark,
       description = excluded.description`,
    [
      permission.module,
      permission.resource,
      permission.action,
      permission.command_name,
      permission.method,
      permission.path,
      permission.required_permissions,
      permission.match_mode,
      permission.is_dangerous,
      permission.needs_resource_mark,
      permission.resource_mark || null,
      permission.description || null,
      now,
    ],
  );
}
