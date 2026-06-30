import { describe, it, expect } from 'bun:test';
import { success, error, ErrorType } from './envelope';

describe('success', () => {
  it('returns ok envelope with data', () => {
    const envelope = success({ foo: 'bar' });
    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual({ foo: 'bar' });
    expect(envelope.asOf).toBeString();
  });

  it('marks dry-run when requested', () => {
    const envelope = success({}, true);
    expect(envelope.dryRun).toBe(true);
  });
});

describe('error', () => {
  it('returns error envelope with type and message', () => {
    const envelope = error(ErrorType.VALIDATION_ERROR, 'bad input');
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(envelope.error?.message).toBe('bad input');
  });

  it('includes detail when provided', () => {
    const detail = { code: 400 };
    const envelope = error(ErrorType.BACKEND_ERROR, 'backend failed', detail);
    expect(envelope.error?.detail).toEqual(detail);
  });
});

describe('ErrorType', () => {
  it('contains expected error types', () => {
    expect(ErrorType.AUTH_REQUIRED).toBe('auth_required');
    expect(ErrorType.PERMISSION_DENIED).toBe('permission_denied');
    expect(ErrorType.BACKEND_ERROR).toBe('backend_error');
    expect(ErrorType.VALIDATION_ERROR).toBe('validation_error');
    expect(ErrorType.CONFIG_ERROR).toBe('config_error');
    expect(ErrorType.NETWORK_ERROR).toBe('network_error');
    expect(ErrorType.UNKNOWN_ERROR).toBe('unknown_error');
  });
});
