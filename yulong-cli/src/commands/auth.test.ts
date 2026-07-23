import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handle as authHandle } from '../commands/auth';
import { fetchUserPermissions } from '../auth/permission-guard';
import { businessCommand } from './business';
import { buildRequest, request } from '../core/api-client';
import { closeDb, getDb, upsertApiPermission } from '../core/db';
import { ErrorType } from '../core/envelope';
import type { CommandContext } from '../core/types';

function contextFor(args: Partial<CommandContext['options']> & { command?: string; args?: string[] } = {}): CommandContext {
  return {
    command: args.command || 'test.echo',
    module: 'test',
    resource: 'echo',
    action: '',
    options: {
      format: 'json',
      verbose: false,
      debug: false,
      dryRun: false,
      yes: false,
      timeout: 30,
      token: args.token,
      ...args,
    },
    args: args.args || [],
  };
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const response = await handler(url, init);
      return response;
    },
    original,
  ) as typeof original;
  return () => {
    globalThis.fetch = original;
  };
}

describe('Token mode', () => {
  let tempDir: string;
  let originalBaseUrl: string | undefined;
  let originalDbPath: string | undefined;
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-token-test-'));
    originalBaseUrl = process.env.YULONG_BASE_URL;
    originalDbPath = process.env.YULONG_DB_PATH;
    process.env.YULONG_BASE_URL = 'http://test.yulong.local';
    process.env.YULONG_DB_PATH = path.join(tempDir, 'yulong.db');
    closeDb();

    // 注册一个测试命令
    getDb();
    upsertApiPermission({
      module: 'test',
      resource: 'echo',
      action: 'echo',
      command_name: 'test.echo',
      method: 'GET',
      path: '/test/echo',
      required_permissions: '["all"]',
      match_mode: 'all',
      is_dangerous: 0,
      needs_resource_mark: 0,
    });
  });

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = undefined;
    }
    closeDb();
    if (originalBaseUrl !== undefined) {
      process.env.YULONG_BASE_URL = originalBaseUrl;
    }
    else {
      delete process.env.YULONG_BASE_URL;
    }
    if (originalDbPath !== undefined) {
      process.env.YULONG_DB_PATH = originalDbPath;
    }
    else {
      delete process.env.YULONG_DB_PATH;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('auth commands', () => {
    it('auth with empty subcommand shows helpful message', async () => {
      await expect(authHandle('', contextFor())).rejects.toThrow('请指定 auth 子命令');
    });

    it('auth status returns token_mode', async () => {
      const result = await authHandle('status', contextFor({ token: 'tok123' }));
      expect(result).toEqual({
        status: 'token_mode',
        message: '当前使用 --token 外部 token',
      });
    });

    it('auth login is prohibited in token mode', async () => {
      await expect(authHandle('login', contextFor({ token: 'tok123' }))).rejects.toThrow('auth login 不可用');
      await expect(authHandle('login', contextFor({ token: 'tok123' }))).rejects.toThrow('status / refresh-permissions');
    });

    it('auth logout is prohibited in token mode', async () => {
      await expect(authHandle('logout', contextFor({ token: 'tok123' }))).rejects.toThrow('auth logout 不可用');
    });

    it('auth switch-org is prohibited in token mode', async () => {
      const ctx = contextFor({ token: 'tok123', json: '{"orgId":"o1"}' });
      await expect(authHandle('switch-org', ctx)).rejects.toThrow('auth switch-org 不可用');
    });

    it('auth refresh-permissions fetches permissions with token', async () => {
      restoreFetch = mockFetch((url) => {
        if (url.includes('/rbac/resource/grantedResources')) {
          return new Response(JSON.stringify({ code: 0, data: ['perm1', 'perm2'] }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: -1, msg: 'unexpected' }), { status: 200 });
      });

      const result = await authHandle('refresh-permissions', contextFor({ token: 'tok123' }));
      expect(result).toMatchObject({
        status: 'permissions_fetched',
        mode: 'token',
        permissionCount: 2,
      });
    });
  });

  describe('fetchUserPermissions', () => {
    it('returns permissions when token is valid', async () => {
      restoreFetch = mockFetch((url) => {
        if (url.includes('/rbac/resource/grantedResources')) {
          return new Response(JSON.stringify({ code: 0, data: ['a', 'b', 'c'] }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: -1 }), { status: 200 });
      });

      const perms = await fetchUserPermissions('valid-token');
      expect(perms).toEqual(['a', 'b', 'c']);
    });

    it('throws auth_required when token expired', async () => {
      restoreFetch = mockFetch((url) => {
        if (url.includes('/rbac/resource/grantedResources')) {
          return new Response(JSON.stringify({ code: 400001004, msg: 'token expired' }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: -1 }), { status: 200 });
      });

      await expect(fetchUserPermissions('expired-token')).rejects.toThrow('token expired');
      try {
        await fetchUserPermissions('expired-token');
      }
      catch (err) {
        expect((err as Error).name).toBe(ErrorType.AUTH_REQUIRED);
      }
    });
  });

  describe('buildRequest', () => {
    it('uses external token for Authorization header', () => {
      const ctx = contextFor({ token: 'external-token' });
      const config = buildRequest(ctx, {});
      expect(config.headers?.Authorization).toBe('external-token');
    });
  });

  describe('request', () => {
    it('does not auto-refresh when skipAuthRetry is true', async () => {
      restoreFetch = mockFetch((url) => {
        if (url.includes('/test/echo')) {
          return new Response(JSON.stringify({ code: 400001004, msg: 'token invalid' }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: -1 }), { status: 200 });
      });

      await expect(
        request({
          method: 'GET',
          url: 'http://test.yulong.local/test/echo',
          skipAuthRetry: true,
        }),
      ).rejects.toThrow('token invalid');
    });
  });

  describe('businessCommand', () => {
    it('executes token-mode request without touching user identity DB', async () => {
      let receivedAuth: string | undefined;
      restoreFetch = mockFetch((url, init) => {
        if (url.includes('/rbac/resource/grantedResources')) {
          return new Response(JSON.stringify({ code: 0, data: ['all'] }), { status: 200 });
        }
        if (url.includes('/test/echo')) {
          receivedAuth = init?.headers && typeof init.headers === 'object'
            ? (init.headers as Record<string, string>).Authorization
            : undefined;
          return new Response(JSON.stringify({ code: 0, data: { echoed: true } }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: -1 }), { status: 200 });
      });

      const result = await businessCommand(contextFor({ token: 'my-token' }), undefined, {});
      expect(result).toEqual({ echoed: true });
      expect(receivedAuth).toBe('my-token');

      // 确认 Token 模式未写入本地权限缓存
      const db = getDb();
      const count = db.query('SELECT COUNT(*) as c FROM user_permissions').get() as { c: number };
      expect(count.c).toBe(0);
    });
  });

  describe('configured token mode (YULONG_MODE=token)', () => {
    let originalMode: string | undefined;

    beforeEach(() => {
      originalMode = process.env.YULONG_MODE;
      process.env.YULONG_MODE = 'token';
    });

    afterEach(() => {
      if (originalMode !== undefined) {
        process.env.YULONG_MODE = originalMode;
      }
      else {
        delete process.env.YULONG_MODE;
      }
    });

    it('auth login is prohibited without --token', async () => {
      await expect(authHandle('login', contextFor())).rejects.toThrow('auth login 不可用');
      await expect(authHandle('login', contextFor())).rejects.toThrow('config mode=token');
    });

    it('auth logout is prohibited without --token', async () => {
      await expect(authHandle('logout', contextFor())).rejects.toThrow('auth logout 不可用');
    });

    it('auth switch-org is prohibited without --token', async () => {
      const ctx = contextFor({ json: '{"orgId":"o1"}' });
      await expect(authHandle('switch-org', ctx)).rejects.toThrow('auth switch-org 不可用');
    });

    it('auth status returns token_mode without --token', async () => {
      const result = await authHandle('status', contextFor());
      expect(result).toMatchObject({ status: 'token_mode' });
    });

    it('auth refresh-permissions without --token throws auth_required', async () => {
      await expect(authHandle('refresh-permissions', contextFor())).rejects.toThrow('请通过 --token 提供 accessToken');
      try {
        await authHandle('refresh-permissions', contextFor());
      }
      catch (err) {
        expect((err as Error).name).toBe(ErrorType.AUTH_REQUIRED);
      }
    });

    it('businessCommand without --token throws auth_required', async () => {
      await expect(businessCommand(contextFor(), undefined, {})).rejects.toThrow('请通过 --token 提供 accessToken');
      try {
        await businessCommand(contextFor(), undefined, {});
      }
      catch (err) {
        expect((err as Error).name).toBe(ErrorType.AUTH_REQUIRED);
      }
    });

    it('businessCommand with --token executes normally', async () => {
      restoreFetch = mockFetch((url) => {
        if (url.includes('/rbac/resource/grantedResources')) {
          return new Response(JSON.stringify({ code: 0, data: ['all'] }), { status: 200 });
        }
        if (url.includes('/test/echo')) {
          return new Response(JSON.stringify({ code: 0, data: { echoed: true } }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: -1 }), { status: 200 });
      });

      const result = await businessCommand(contextFor({ token: 'my-token' }), undefined, {});
      expect(result).toEqual({ echoed: true });
    });
  });
});
