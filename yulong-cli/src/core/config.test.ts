import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig } from './config';

/**
 * mode 解析优先级（刻意保持短链路，便于定位问题）：
 * YULONG_MODE 环境变量 > 编译期注入（测试中未注入）> 'local'
 *
 * config.json / config.local.json 中的 mode 字段会被忽略。
 * 通过 YULONG_HOME 指向临时目录隔离配置文件（getProjectRoot 优先使用 YULONG_HOME）。
 */
describe('loadConfig mode', () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let originalMode: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yulong-config-test-'));
    originalHome = process.env.YULONG_HOME;
    originalMode = process.env.YULONG_MODE;
    process.env.YULONG_HOME = tempDir;
    delete process.env.YULONG_MODE;
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.YULONG_HOME = originalHome;
    }
    else {
      delete process.env.YULONG_HOME;
    }
    if (originalMode !== undefined) {
      process.env.YULONG_MODE = originalMode;
    }
    else {
      delete process.env.YULONG_MODE;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('defaults to local when nothing configured', () => {
    expect(loadConfig().mode).toBe('local');
  });

  it('reads mode from YULONG_MODE env', () => {
    process.env.YULONG_MODE = 'token';
    expect(loadConfig().mode).toBe('token');

    process.env.YULONG_MODE = 'local';
    expect(loadConfig().mode).toBe('local');
  });

  it('falls back to local for invalid YULONG_MODE value', () => {
    process.env.YULONG_MODE = 'bogus';
    expect(loadConfig().mode).toBe('local');
  });

  it('ignores mode in config files', () => {
    fs.writeFileSync(path.join(tempDir, 'config.json'), JSON.stringify({ mode: 'token' }));
    fs.writeFileSync(path.join(tempDir, 'config.local.json'), JSON.stringify({ mode: 'token' }));
    expect(loadConfig().mode).toBe('local');

    // env 仍然生效，且不受配置文件影响
    process.env.YULONG_MODE = 'token';
    expect(loadConfig().mode).toBe('token');
  });
});
