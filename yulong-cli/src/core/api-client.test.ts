import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolvePath, buildRequest } from './api-client';
import { closeDb, getDb, upsertApiPermission } from './db';
import type { CommandContext } from './types';

describe('resolvePath', () => {
  it('replaces path params with positional args', () => {
    const path = '/hr/article/${param0}/detail';
    expect(resolvePath(path, ['123'], {})).toBe('/hr/article/123/detail');
  });

  it('url-encodes positional args', () => {
    const path = '/hr/file/download/${param0}';
    expect(resolvePath(path, ['hello world'], {})).toBe('/hr/file/download/hello%20world');
  });

  it('falls back to known keys from params', () => {
    const path = '/hr/article/${param0}/detail';
    expect(resolvePath(path, [], { id: '456' })).toBe('/hr/article/456/detail');
  });

  it('removes consumed fallback key from params', () => {
    const params: Record<string, unknown> = { id: '789', other: 'keep' };
    resolvePath('/hr/article/${param0}/detail', [], params);
    expect(params).toEqual({ other: 'keep' });
  });

  it('throws validation error when param is missing', () => {
    const path = '/hr/article/${param0}/detail';
    expect(() => resolvePath(path, [], {})).toThrow('路径参数');
    try {
      resolvePath(path, [], {});
    }
    catch (err) {
      expect((err as Error).name).toBe('validation_error');
    }
  });
});

describe('buildRequest 文件上传与 param_location', () => {
  let tempDir: string;
  let originalBaseUrl: string | undefined;
  let originalDbPath: string | undefined;

  function contextFor(command: string): CommandContext {
    return {
      command,
      module: 'hr',
      resource: 'employee',
      action: '',
      options: {
        format: 'json',
        verbose: false,
        debug: false,
        dryRun: false,
        yes: false,
        timeout: 30,
        token: 'test-token',
      },
      args: [],
    };
  }

  function registerUploadCommand(commandName: string, paramLocation: 'body' | 'query'): void {
    upsertApiPermission({
      module: 'hr',
      resource: 'employee',
      action: 'import',
      command_name: commandName,
      method: 'POST',
      path: `/hr/employee/${commandName.split('.').pop()}`,
      required_permissions: '["all"]',
      match_mode: 'all',
      is_dangerous: 1,
      needs_resource_mark: 0,
      param_location: paramLocation,
    });
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-upload-test-'));
    originalBaseUrl = process.env.YULONG_BASE_URL;
    originalDbPath = process.env.YULONG_DB_PATH;
    process.env.YULONG_BASE_URL = 'http://test.yulong.local';
    process.env.YULONG_DB_PATH = path.join(tempDir, 'yulong.db');
    closeDb();
    getDb();
  });

  afterEach(() => {
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

  it('FormData + param_location=query：参数进 query，body 为 FormData（hr.employee.importPerformance 形态）', () => {
    registerUploadCommand('hr.employee.importPerformance', 'query');
    const formData = new FormData();
    formData.append('file', new Blob(['x']), 'a.xlsx');

    const config = buildRequest(contextFor('hr.employee.importPerformance'), { employeeId: '123' }, formData);

    expect(config.body).toBeInstanceOf(FormData);
    expect(config.params).toEqual({ employeeId: '123' });
    // FormData 不能设置 JSON Content-Type，否则后端无法解析 multipart
    expect(config.headers?.['Content-Type']).toBeUndefined();
  });

  it('FormData + param_location=body：body 为 FormData，不带 query（hr.employee.importData 形态）', () => {
    registerUploadCommand('hr.employee.importData', 'body');
    const formData = new FormData();
    formData.append('file', new Blob(['x']), 'a.xlsx');

    const config = buildRequest(contextFor('hr.employee.importData'), {}, formData);

    expect(config.body).toBeInstanceOf(FormData);
    expect(config.params).toBeUndefined();
    expect(config.headers?.['Content-Type']).toBeUndefined();
  });

  it('param_location=query 且无显式 body：参数进 query，body 为空（hr.regularRecord.oneClick 形态）', () => {
    registerUploadCommand('hr.regularRecord.oneClick', 'query');

    const config = buildRequest(contextFor('hr.regularRecord.oneClick'), { regularId: '456' });

    expect(config.body).toBeUndefined();
    expect(config.params).toEqual({ regularId: '456' });
    expect(config.headers?.['Content-Type']).toBeUndefined();
  });
});
