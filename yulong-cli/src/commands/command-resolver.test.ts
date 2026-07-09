import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveCommandAndArgs } from '../commands/command-resolver';
import { closeDb, upsertApiPermission } from '../core/db';
import type { ApiPermission } from '../core/types';

function createPermission(overrides: Partial<ApiPermission> = {}): Omit<ApiPermission, 'id'> {
  return {
    module: 'test',
    resource: 'echo',
    action: 'echo',
    command_name: 'test.echo',
    method: 'GET',
    path: '/test/echo',
    required_permissions: JSON.stringify(['test.echo']),
    match_mode: 'any',
    is_dangerous: 0,
    needs_resource_mark: 1,
    resource_mark: 'test',
    description: 'test command',
    ...overrides,
  };
}

describe('resolveCommandAndArgs', () => {
  let tempDir: string;
  let originalDbPath: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-resolver-test-'));
    originalDbPath = process.env.YULONG_DB_PATH;
    process.env.YULONG_DB_PATH = path.join(tempDir, 'yulong.db');
    closeDb();
  });

  afterEach(() => {
    closeDb();
    if (originalDbPath !== undefined) {
      process.env.YULONG_DB_PATH = originalDbPath;
    }
    else {
      delete process.env.YULONG_DB_PATH;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('matches a simple command with no path args', () => {
    upsertApiPermission(createPermission());

    const result = resolveCommandAndArgs(['test', 'echo']);
    expect(result.command).toBe('test.echo');
    expect(result.args).toEqual([]);
  });

  it('uses longest prefix match and returns remaining args as path params', () => {
    upsertApiPermission(createPermission({ command_name: 'hr.article', method: 'GET', path: '/hr/article' }));
    upsertApiPermission(createPermission({
      command_name: 'hr.article.detail',
      method: 'GET',
      path: '/hr/article/${param0}/detail',
      module: 'hr',
      resource: 'article',
      action: 'detail',
    }));

    const result = resolveCommandAndArgs(['hr', 'article', 'detail', '123']);
    expect(result.command).toBe('hr.article.detail');
    expect(result.args).toEqual(['123']);
  });

  it('falls back to shorter prefix when longer one is not registered', () => {
    upsertApiPermission(createPermission({
      command_name: 'project.crmField',
      method: 'GET',
      path: '/project/crmField',
      module: 'pm',
      resource: 'crmField',
      action: 'query',
    }));

    const result = resolveCommandAndArgs(['project', 'crmField', 'dept']);
    expect(result.command).toBe('project.crmField');
    expect(result.args).toEqual(['dept']);
  });

  it('treats all positionals as command when nothing is registered', () => {
    const result = resolveCommandAndArgs(['foo', 'bar', 'baz']);
    expect(result.command).toBe('foo.bar.baz');
    expect(result.args).toEqual([]);
  });

  it('handles hyphenated command segments', () => {
    upsertApiPermission(createPermission({
      command_name: 'project.origin-contract.forward.list',
      method: 'POST',
      path: '/project/origin-contract/forward/list',
      module: 'pm',
      resource: 'origin-contract',
      action: 'list',
    }));

    const result = resolveCommandAndArgs(['project', 'origin-contract', 'forward', 'list']);
    expect(result.command).toBe('project.origin-contract.forward.list');
    expect(result.args).toEqual([]);
  });
});
