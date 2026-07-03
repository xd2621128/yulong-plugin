import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  baseUrl: string;
  timeout: number;
  /** CLI 自身数据库路径（默认 {dataDir}/yulong.db） */
  dbPath: string;
  /** 御小龙身份数据库路径，仅用于覆盖默认路径 */
  userDbPath: string;
  logLevel: string;
}

const DEFAULT_CONFIG: Config = {
  baseUrl: '',
  timeout: 30,
  dbPath: '',
  userDbPath: '',
  logLevel: 'info',
};

function getBinaryDir(): string {
  // 编译为二进制后，process.execPath 是二进制自身路径；
  // 开发模式下此函数不会被使用（前面已返回项目根目录）
  return path.dirname(process.execPath);
}

function ensureUserRoot(binaryDir: string, userRoot: string): void {
  if (!fs.existsSync(userRoot)) {
    fs.mkdirSync(userRoot, { recursive: true });
  }

  // 从安装目录复制默认配置文件和 seed 数据库到用户目录
  const srcConfig = path.join(binaryDir, 'config.json');
  const dstConfig = path.join(userRoot, 'config.json');
  if (fs.existsSync(srcConfig) && !fs.existsSync(dstConfig)) {
    fs.copyFileSync(srcConfig, dstConfig);
  }

  const srcDataDir = path.join(binaryDir, 'data');
  const dstDataDir = path.join(userRoot, 'data');
  if (fs.existsSync(srcDataDir) && !fs.existsSync(dstDataDir)) {
    fs.mkdirSync(dstDataDir, { recursive: true });
    const srcDb = path.join(srcDataDir, 'yulong.db');
    const dstDb = path.join(dstDataDir, 'yulong.db');
    if (fs.existsSync(srcDb) && !fs.existsSync(dstDb)) {
      fs.copyFileSync(srcDb, dstDb);
    }
  }
}

function getUserConfigRoot(binaryDir: string): string {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    return process.cwd();
  }
  const userRoot = path.join(home, '.config', 'yulong');
  if (binaryDir) {
    ensureUserRoot(binaryDir, userRoot);
  }
  return userRoot;
}

function getProjectRoot(): string {
  const argv1 = process.argv[1];
  if (argv1) {
    const scriptDir = path.dirname(argv1);
    // 开发时：bun run src/index.ts，从 src/ 向上两级到 yulong-cli 目录
    if (path.basename(scriptDir) === 'src') {
      return path.dirname(scriptDir);
    }
  }

  const binaryDir = getBinaryDir();

  // 1. 显式指定 home（最高优先级，用于全局安装后的 wrapper）
  const yulongHome = process.env.YULONG_HOME;
  if (yulongHome) {
    const userRoot = path.resolve(yulongHome);
    if (binaryDir) {
      ensureUserRoot(binaryDir, userRoot);
    }
    return userRoot;
  }

  // 2. 便携模式：二进制所在目录存在 config.json，则使用该目录
  if (binaryDir) {
    const portableConfig = path.join(binaryDir, 'config.json');
    if (fs.existsSync(portableConfig)) {
      return binaryDir;
    }
  }

  // 3. 按用户隔离：~/.config/yulong
  return getUserConfigRoot(binaryDir);
}

/**
 * 解析 .env 文件内容
 *
 * 支持格式：
 * KEY=value
 * KEY="value"
 * KEY='value'
 * # 注释
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // 去除引号
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 手动加载 .env 文件
 *
 * 与前端 Vite 对齐的合并优先级：
 * 1. .env.{env}.local（本地覆盖，不提交到仓库）
 * 2. .env.{env}
 * 3. .env
 *
 * 返回合并后的配置对象。实际环境变量优先级最高，不会被覆盖。
 */
function loadEnvFiles(): Record<string, string> {
  const root = getProjectRoot();
  const env = process.env.YULONG_ENV || process.env.NODE_ENV || 'development';

  const files = [
    path.join(root, '.env'),
    path.join(root, `.env.${env}`),
    path.join(root, `.env.${env}.local`),
  ];

  const merged: Record<string, string> = {};

  for (const file of files) {
    if (!fs.existsSync(file)) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf8');
      const vars = parseEnvFile(content);
      for (const [key, value] of Object.entries(vars)) {
        merged[key] = value;
      }
    }
    catch (err) {
      // 忽略读取失败的本地文件
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[yulong-cli] 读取 env 文件失败: ${file}: ${message}`);
    }
  }

  return merged;
}

/**
 * 判断当前是否为开发模式（bun run src/index.ts）
 *
 * 开发模式下 Bun 会自动加载 .env 文件，无需手动加载。
 * 编译后的二进制需要手动加载。
 */
function isDevMode(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) {
    return false;
  }
  return path.basename(path.dirname(argv1)) === 'src';
}

// 开发模式下依赖 Bun 自动加载 .env；
// 编译为二进制后，Bun 不会自动加载，需要手动加载。
if (!isDevMode()) {
  const envVars = loadEnvFiles();
  for (const [key, value] of Object.entries(envVars)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getDataDir(): string {
  const root = getProjectRoot();
  const dataDir = path.join(root, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function readJsonConfig(fileName: string): Partial<Config> {
  const root = getProjectRoot();
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as Partial<Config>;
  }
  catch (err) {
    throw new Error(`配置文件解析失败: ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function parseTimeout(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * 加载最终配置
 *
 * 优先级（高 → 低）：
 * 1. 环境变量 YULONG_*（含 Bun 自动加载的 .env 值）
 * 2. config.local.json
 * 3. config.json
 * 4. 硬编码默认值
 */
export function loadConfig(): Config {
  const configJson = readJsonConfig('config.json');
  const configLocal = readJsonConfig('config.local.json');

  return {
    baseUrl:
      process.env.YULONG_BASE_URL
      || configLocal.baseUrl
      || configJson.baseUrl
      || DEFAULT_CONFIG.baseUrl,

    timeout:
      parseTimeout(process.env.YULONG_TIMEOUT)
      || configLocal.timeout
      || configJson.timeout
      || DEFAULT_CONFIG.timeout,

    dbPath:
      process.env.YULONG_DB_PATH
      || configLocal.dbPath
      || configJson.dbPath
      || DEFAULT_CONFIG.dbPath,

    userDbPath:
      process.env.YULONG_USER_DB_PATH
      || configLocal.userDbPath
      || configJson.userDbPath
      || DEFAULT_CONFIG.userDbPath,

    logLevel:
      process.env.YULONG_LOG_LEVEL
      || configLocal.logLevel
      || configJson.logLevel
      || DEFAULT_CONFIG.logLevel,
  };
}

export function getBaseUrl(config: Config): string {
  return process.env.YULONG_BASE_URL || config.baseUrl;
}
