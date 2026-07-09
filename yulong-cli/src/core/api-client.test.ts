import { describe, it, expect } from 'bun:test';
import { resolvePath } from './api-client';

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
