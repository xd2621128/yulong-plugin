import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveUser } from './user-resolver';
import { closeDb, getDb } from './db';

describe('resolveUser', () => {
  let tempDir: string;
  let originalDbPath: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-test-'));
    originalDbPath = process.env.YULONG_USER_DB_PATH;
    process.env.YULONG_USER_DB_PATH = path.join(tempDir, 'users.db');
    closeDb();
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

  it('uses explicit userid when database is empty', async () => {
    const user = await resolveUser({ userid: 'explicit-user', format: 'json', verbose: false, debug: false, dryRun: false, yes: false, timeout: 30 });
    expect(user.userid).toBe('explicit-user');
    expect(user.source).toBe('explicit');
  });

  it('prefers database user over explicit userid', async () => {
    const db = getDb();
    db.run(`INSERT INTO users (userid, org_id, default_org_id, created_at, updated_at) VALUES ('db-user', 'org1', 'org1', datetime('now'), datetime('now'))`);

    const user = await resolveUser({ userid: 'explicit-user', format: 'json', verbose: false, debug: false, dryRun: false, yes: false, timeout: 30 });
    expect(user.userid).toBe('db-user');
    expect(user.source).toBe('db');
  });

  it('prefers YULONG_USERID env over explicit userid when database is empty', async () => {
    const originalUserId = process.env.YULONG_USERID;
    process.env.YULONG_USERID = 'env-user';
    try {
      const user = await resolveUser({ format: 'json', verbose: false, debug: false, dryRun: false, yes: false, timeout: 30 });
      expect(user.userid).toBe('env-user');
      expect(user.source).toBe('explicit');
    }
    finally {
      if (originalUserId !== undefined) {
        process.env.YULONG_USERID = originalUserId;
      }
      else {
        delete process.env.YULONG_USERID;
      }
    }
  });

  it('throws when no user source is available', async () => {
    expect(resolveUser({ format: 'json', verbose: false, debug: false, dryRun: false, yes: false, timeout: 30 })).rejects.toThrow('未找到用户配置');
  });
});
