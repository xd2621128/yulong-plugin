import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { schemaCommand } from '../commands/schema';
import { closeDb, upsertApiPermission } from '../core/db';
import type { ApiPermission, CommandContext } from '../core/types';

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

function context(json?: string): CommandContext {
  return {
    command: 'schema',
    module: 'schema',
    resource: '',
    action: '',
    options: {
      format: 'json',
      verbose: false,
      debug: false,
      dryRun: false,
      yes: false,
      timeout: 30,
      json,
    },
    args: [],
  };
}

describe('schemaCommand', () => {
  let tempDir: string;
  let originalDbPath: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-schema-test-'));
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

  it('returns only open permissions by default', async () => {
    upsertApiPermission(createPermission({
      command_name: 'open.cmd',
      module: 'open',
      required_permissions: JSON.stringify(['open.cmd']),
    }));
    upsertApiPermission(createPermission({
      command_name: 'all.cmd',
      module: 'all',
      required_permissions: JSON.stringify([]),
      match_mode: 'all',
    }));
    upsertApiPermission(createPermission({
      command_name: 'closed.cmd',
      module: 'closed',
      required_permissions: JSON.stringify([]),
      match_mode: 'any',
    }));

    const result = (await schemaCommand(context())) as { total: number; commands: Array<{ name: string }> };
    expect(result.total).toBe(2);
    expect(result.commands.map(c => c.name)).toContain('open.cmd');
    expect(result.commands.map(c => c.name)).toContain('all.cmd');
    expect(result.commands.map(c => c.name)).not.toContain('closed.cmd');
  });

  it('filters by module', async () => {
    upsertApiPermission(createPermission({ command_name: 'rbac.user', module: 'rbac' }));
    upsertApiPermission(createPermission({ command_name: 'rbac.role', module: 'rbac' }));
    upsertApiPermission(createPermission({ command_name: 'hr.article', module: 'hr' }));

    const result = (await schemaCommand(context('{"module":"rbac"}'))) as { total: number; commands: Array<{ name: string }> };
    expect(result.total).toBe(2);
    expect(result.commands.map(c => c.name)).toContain('rbac.user');
    expect(result.commands.map(c => c.name)).toContain('rbac.role');
  });

  it('filters by command prefix when module column differs', async () => {
    upsertApiPermission(createPermission({
      command_name: 'project.business.list',
      module: 'pm',
      required_permissions: JSON.stringify(['project.business.list']),
    }));
    upsertApiPermission(createPermission({
      command_name: 'project.partner.page',
      module: 'pm',
      required_permissions: JSON.stringify(['project.partner.page']),
    }));
    upsertApiPermission(createPermission({ command_name: 'hr.article', module: 'hr' }));

    const result = (await schemaCommand(context('{"module":"project"}'))) as { total: number; commands: Array<{ name: string }> };
    expect(result.total).toBe(2);
    expect(result.commands.map(c => c.name)).toContain('project.business.list');
    expect(result.commands.map(c => c.name)).toContain('project.partner.page');
  });

  it('still supports exact module filtering', async () => {
    upsertApiPermission(createPermission({
      command_name: 'project.business.list',
      module: 'pm',
      required_permissions: JSON.stringify(['project.business.list']),
    }));

    const result = (await schemaCommand(context('{"module":"pm"}'))) as { total: number; commands: Array<{ name: string }> };
    expect(result.total).toBe(1);
    expect(result.commands[0].name).toBe('project.business.list');
  });

  it('shows all permissions when all flag is true', async () => {
    upsertApiPermission(createPermission({
      command_name: 'closed.cmd',
      required_permissions: JSON.stringify([]),
      match_mode: 'any',
    }));

    const result = (await schemaCommand(context('{"all":true}'))) as { total: number; commands: Array<{ name: string }> };
    expect(result.total).toBe(1);
    expect(result.commands[0].name).toBe('closed.cmd');
  });

  it('returns empty result for unknown module', async () => {
    const result = (await schemaCommand(context('{"module":"unknown"}'))) as { total: number; commands: Array<{ name: string }> };
    expect(result.total).toBe(0);
    expect(result.commands).toEqual([]);
  });
});
