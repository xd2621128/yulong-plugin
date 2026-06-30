import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { getDataDir } from './config';
import type { ApiPermission, UserPermission } from './types';

const DB_NAME = 'users.db';

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const envPath = process.env.YULONG_USER_DB_PATH;
    let dbPath: string;
    if (envPath) {
      dbPath = envPath;
    }
    else {
      const dataDir = getDataDir();
      dbPath = path.join(dataDir, DB_NAME);
    }
    const exists = fs.existsSync(dbPath);
    db = new Database(dbPath);
    if (!exists) {
      initSchema();
    }
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

  database.exec(`
    -- 用户映射表（由御小龙预配置）
    CREATE TABLE IF NOT EXISTS users (
      userid TEXT PRIMARY KEY,
      org_id TEXT,
      default_org_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    -- 用户权限缓存
    CREATE TABLE IF NOT EXISTS user_permissions (
      userid TEXT PRIMARY KEY,
      permissions TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    -- 接口权限映射表
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
  `);
}

export function getUser(userid: string): { userid: string; org_id?: string; default_org_id?: string } | null {
  const database = getDb();
  const stmt = database.query('SELECT userid, org_id, default_org_id FROM users WHERE userid = ?');
  return stmt.get(userid) as { userid: string; org_id?: string; default_org_id?: string } | null;
}

export function upsertUser(userid: string, orgId?: string, defaultOrgId?: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.run(
    `INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userid) DO UPDATE SET
       org_id = excluded.org_id,
       default_org_id = excluded.default_org_id,
       updated_at = excluded.updated_at`,
    [userid, orgId || null, defaultOrgId || null, now, now],
  );
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
