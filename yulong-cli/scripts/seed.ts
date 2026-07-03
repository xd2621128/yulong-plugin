import { Database } from 'bun:sqlite';
import * as path from 'path';
import * as process from 'process';

const dbPath = path.join(process.cwd(), 'data', 'yulong.db');
const db = new Database(dbPath);

db.run(`
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

db.run(`
  CREATE TABLE IF NOT EXISTS user_permissions (
    userid TEXT PRIMARY KEY,
    permissions TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );
`);

db.run(`
  INSERT OR REPLACE INTO api_permissions
  (module, resource, action, command_name, method, path, required_permissions, match_mode, is_dangerous, needs_resource_mark, resource_mark, description, created_at)
  VALUES ('rbac', 'user', 'userPage', 'rbac.user.userPage', 'POST', '/rbac/user/userPage', '["unclaimed-business","user"]', 'any', 0, 1, 'user', '用户分页查询', datetime('now'))
`);

db.run(`
  INSERT OR REPLACE INTO user_permissions (userid, permissions, fetched_at)
  VALUES ('2014101415924386520', '["user", "user_page", "user_edit"]', datetime('now'))
`);

console.log('seeded:', dbPath);
