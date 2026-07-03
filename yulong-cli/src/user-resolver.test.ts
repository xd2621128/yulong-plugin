import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveUser } from './user-resolver';
import { closeDb } from './db';

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

function createYuxiaolongDb(dbPath: string, userInfo?: { id: string; orgId?: string }): void {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, user_info TEXT)`);
  if (userInfo) {
    db.run(
      `INSERT OR REPLACE INTO auth_sessions (id, user_info) VALUES ('current', ?)`,
      [JSON.stringify(userInfo)],
    );
  }
  db.close();
}

describe('resolveUser', () => {
  let tempDir: string;
  let originalUserDbPath: string | undefined;
  let originalDbPath: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-test-'));
    originalUserDbPath = process.env.YULONG_USER_DB_PATH;
    originalDbPath = process.env.YULONG_DB_PATH;
    process.env.YULONG_DB_PATH = path.join(tempDir, 'yulong.db');
    closeDb();
  });

  afterEach(() => {
    closeDb();
    if (originalUserDbPath !== undefined) {
      process.env.YULONG_USER_DB_PATH = originalUserDbPath;
    }
    else {
      delete process.env.YULONG_USER_DB_PATH;
    }
    if (originalDbPath !== undefined) {
      process.env.YULONG_DB_PATH = originalDbPath;
    }
    else {
      delete process.env.YULONG_DB_PATH;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws when auth_sessions has no current user', async () => {
    const dbPath = path.join(tempDir, 'yuxiaolong.db');
    process.env.YULONG_USER_DB_PATH = dbPath;
    createYuxiaolongDb(dbPath);

    await expect(resolveUser(minimalOptions())).rejects.toThrow('未配置用户');
  });

  it('returns the current user from Yuxiaolong auth_sessions', async () => {
    const dbPath = path.join(tempDir, 'yuxiaolong.db');
    process.env.YULONG_USER_DB_PATH = dbPath;
    createYuxiaolongDb(dbPath, { id: 'yxl-user', orgId: 'org1' });

    const userId = await resolveUser(minimalOptions());
    expect(userId).toBe('yxl-user');
  });

  it('prefers explicit YULONG_USER_DB_PATH over default', async () => {
    const defaultPath = path.join(tempDir, 'default-yuxiaolong.db');
    const explicitPath = path.join(tempDir, 'explicit-yuxiaolong.db');
    process.env.YULONG_USER_DB_PATH = explicitPath;

    createYuxiaolongDb(defaultPath, { id: 'default-user' });
    createYuxiaolongDb(explicitPath, { id: 'explicit-user' });

    const userId = await resolveUser(minimalOptions());
    expect(userId).toBe('explicit-user');
  });
});
