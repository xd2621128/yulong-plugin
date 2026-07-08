import { describe, expect, it } from 'bun:test';
import { filterOpenPermissions, isOpenPermission } from './permission-filter';
import type { ApiPermission } from './types';

function createPermission(overrides: Partial<ApiPermission> = {}): ApiPermission {
  return {
    id: 1,
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
    created_at: new Date().toISOString(),
    ...overrides,
  } as ApiPermission;
}

describe('permission-filter', () => {
  describe('isOpenPermission', () => {
    it('returns true when required_permissions is non-empty', () => {
      const p = createPermission({ required_permissions: JSON.stringify(['test.echo']) });
      expect(isOpenPermission(p)).toBe(true);
    });

    it('returns true when match_mode is all even if required_permissions is empty', () => {
      const p = createPermission({ required_permissions: JSON.stringify([]), match_mode: 'all' });
      expect(isOpenPermission(p)).toBe(true);
    });

    it('returns false when required_permissions is empty and match_mode is any', () => {
      const p = createPermission({ required_permissions: JSON.stringify([]), match_mode: 'any' });
      expect(isOpenPermission(p)).toBe(false);
    });

    it('returns false when required_permissions is invalid json', () => {
      const p = createPermission({ required_permissions: 'not-json' });
      expect(isOpenPermission(p)).toBe(false);
    });
  });

  describe('filterOpenPermissions', () => {
    it('returns only open permissions', () => {
      const open1 = createPermission({ command_name: 'open1', required_permissions: JSON.stringify(['x']) });
      const open2 = createPermission({ command_name: 'open2', required_permissions: JSON.stringify([]), match_mode: 'all' });
      const closed = createPermission({ command_name: 'closed', required_permissions: JSON.stringify([]), match_mode: 'any' });

      const result = filterOpenPermissions([open1, closed, open2]);
      expect(result).toHaveLength(2);
      expect(result.map(p => p.command_name)).toContain('open1');
      expect(result.map(p => p.command_name)).toContain('open2');
    });

    it('returns empty array when no permissions are open', () => {
      const closed = createPermission({ required_permissions: JSON.stringify([]), match_mode: 'any' });
      expect(filterOpenPermissions([closed])).toEqual([]);
    });
  });
});
