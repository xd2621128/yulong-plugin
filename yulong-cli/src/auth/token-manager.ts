import * as fs from 'fs';
import * as path from 'path';
import { getDataDir } from '../core/config';
import type { TokenInfo } from '../core/types';

const TOKEN_FILE = 'tokens.local.json';

export function getTokenPath(): string {
  return path.join(getDataDir(), TOKEN_FILE);
}

export function loadTokens(): TokenInfo | null {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(tokenPath, 'utf8');
    return JSON.parse(content) as TokenInfo;
  }
  catch (err) {
    throw new Error(`token 文件解析失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function saveTokens(tokens: TokenInfo): void {
  const tokenPath = getTokenPath();
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function clearTokens(): void {
  const tokenPath = getTokenPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

/**
 * 检查 accessToken 是否过期
 * 提前 5 分钟缓冲
 */
export function isAccessTokenExpired(tokens: TokenInfo): boolean {
  const expiresAt = new Date(tokens.expiresAt).getTime();
  const now = Date.now();
  return now >= expiresAt - 5 * 60 * 1000;
}

export function getAccessToken(): string | undefined {
  const tokens = loadTokens();
  return tokens?.accessToken;
}

export function getRefreshToken(): string | undefined {
  const tokens = loadTokens();
  return tokens?.refreshToken;
}

export function getOrgId(): string | undefined {
  const tokens = loadTokens();
  return tokens?.orgId;
}
