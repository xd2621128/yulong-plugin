import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveUser } from './user-resolver';
import { closeDb, getDb } from './db';

function minimalOptions() {
  return {
    format: 'json' as const,
    verbose: false,
    debug: false,
    dryRun: false,
    yes: false,
    timeout: 30,
  };
}

describe('resolveUser', () => {
  let tempDir: string;
  let originalDbPath: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-test-'));
    originalDbPath = process.env.YULONG_USER_DB_PATH;
    process.env.YULONG_USER_DB_PATH = path.join(tempDir, 'users.db');
    closeDb();
    getDb(); // 确保测试数据库文件和 schema 已创建
  });

  afterEach(() => {
    closeDb();
    if (originalDbPath !== undefined) {
      process.env.YULONG_USER_DB_PATH = originalDbPath;
    }
    else {
      delete process.env.YULONG_USER_DB_PATH;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws when database is empty', async () => {
    await expect(resolveUser(minimalOptions())).rejects.toThrow('未配置用户');
  });

  it('returns the only user in database', async () => {
    const db = getDb();
    db.run(`INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at) VALUES ('db-user', 'org1', 'org1', datetime('now'), datetime('now'))`);

    const userId = await resolveUser(minimalOptions());
    expect(userId).toBe('db-user');
  });

  it('returns the latest user when multiple rows exist', async () => {
    const db = getDb();
    db.run(`INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at) VALUES ('old-user', 'org1', 'org1', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`);
    db.run(`INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at) VALUES ('new-user', 'org2', 'org2', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`);

    const userId = await resolveUser(minimalOptions());
    expect(userId).toBe('new-user');
  });

  it('trigger clears old users and permissions on insert', async () => {
    const db = getDb();
    db.run(`INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at) VALUES ('first', 'org1', 'org1', datetime('now'), datetime('now'))`);
    db.run(`INSERT INTO user_permissions (userid, permissions, fetched_at) VALUES ('first', '["p1"]', datetime('now'))`);

    db.run(`INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at) VALUES ('second', 'org2', 'org2', datetime('now'), datetime('now'))`);

    const userCount = db.query('SELECT COUNT(*) as c FROM users').get() as { c: number };
    expect(userCount.c).toBe(1);

    const permRow = db.query('SELECT userid FROM user_permissions WHERE userid = ?').get('first');
    expect(permRow).toBeNull();

    const userId = await resolveUser(minimalOptions());
    expect(userId).toBe('second');
  });
});
