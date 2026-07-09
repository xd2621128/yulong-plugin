import { beforeEach, afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  closeDb,
  getApiPermission,
  listApiPermissions,
  listApiPermissionsByPrefix,
  upsertApiPermission,
} from './db';
import type { ApiPermission } from './types';

function createTestPermission(overrides: Partial<ApiPermission> = {}): Omit<ApiPermission, 'id'> {
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

describe('db', () => {
  let originalDbPath: string | undefined;
  let tempDbPath: string;

  beforeEach(() => {
    originalDbPath = process.env.YULONG_DB_PATH;
    tempDbPath = path.join(tmpdir(), `yulong-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.YULONG_DB_PATH = tempDbPath;
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
    try {
      fs.unlinkSync(tempDbPath);
    }
    catch {
      // ignore
    }
  });

  describe('getApiPermission', () => {
    it('returns null when command not found', () => {
      expect(getApiPermission('test.missing')).toBeNull();
    });

    it('returns command when found', () => {
      upsertApiPermission(createTestPermission());
      const permission = getApiPermission('test.echo');
      expect(permission).not.toBeNull();
      expect(permission?.command_name).toBe('test.echo');
      expect(permission?.module).toBe('test');
    });
  });

  describe('listApiPermissions', () => {
    it('returns empty array when no permissions', () => {
      expect(listApiPermissions()).toEqual([]);
    });

    it('returns all permissions when no module filter', () => {
      upsertApiPermission(createTestPermission({ command_name: 'test.a', module: 'test' }));
      upsertApiPermission(createTestPermission({ command_name: 'other.b', module: 'other' }));
      const permissions = listApiPermissions();
      expect(permissions).toHaveLength(2);
    });

    it('filters by module', () => {
      upsertApiPermission(createTestPermission({ command_name: 'test.a', module: 'test' }));
      upsertApiPermission(createTestPermission({ command_name: 'other.b', module: 'other' }));
      const permissions = listApiPermissions('test');
      expect(permissions).toHaveLength(1);
      expect(permissions[0].command_name).toBe('test.a');
    });
  });

  describe('listApiPermissionsByPrefix', () => {
    it('returns empty array when no matching prefix', () => {
      upsertApiPermission(createTestPermission({ command_name: 'test.echo' }));
      expect(listApiPermissionsByPrefix('missing')).toEqual([]);
    });

    it('returns commands matching prefix', () => {
      upsertApiPermission(createTestPermission({ command_name: 'project.a', module: 'pm' }));
      upsertApiPermission(createTestPermission({ command_name: 'project.b', module: 'pm' }));
      upsertApiPermission(createTestPermission({ command_name: 'other.c', module: 'other' }));

      const permissions = listApiPermissionsByPrefix('project');
      expect(permissions).toHaveLength(2);
      expect(permissions.map(p => p.command_name)).toContain('project.a');
      expect(permissions.map(p => p.command_name)).toContain('project.b');
    });

    it('does not return exact match without dot', () => {
      // prefix query uses "project.%", so "project" itself should not match
      upsertApiPermission(createTestPermission({ command_name: 'project' }));
      expect(listApiPermissionsByPrefix('project')).toEqual([]);
    });

    it('supports nested prefix', () => {
      upsertApiPermission(createTestPermission({ command_name: 'project.business.list' }));
      upsertApiPermission(createTestPermission({ command_name: 'project.business.detail' }));
      upsertApiPermission(createTestPermission({ command_name: 'project.contract.list' }));

      const permissions = listApiPermissionsByPrefix('project.business');
      expect(permissions).toHaveLength(2);
    });
  });
});
