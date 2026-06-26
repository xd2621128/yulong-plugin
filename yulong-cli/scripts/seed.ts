import { Database } from 'bun:sqlite';
import * as path from 'path';
import * as process from 'process';

const dbPath = path.join(process.cwd(), 'data', 'users.db');
const db = new Database(dbPath);

db.run(`DELETE FROM users`);

db.run(`
  INSERT OR REPLACE INTO users (userid, org_id, default_org_id, created_at, updated_at)
  VALUES ('2014101415924386520', 'org_001', 'org_001', datetime('now'), datetime('now'))
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
