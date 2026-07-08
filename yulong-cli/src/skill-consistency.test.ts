import { describe, expect, it, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'bun:sqlite';

const PROJECT_ROOT = path.resolve(import.meta.dir, '../..');
const SKILL_DIR = path.join(PROJECT_ROOT, 'yulong-skill');
const DB_PATH = path.join(PROJECT_ROOT, 'yulong-cli', 'data', 'yulong.db');

/**
 * CLI 中的特殊命令，不在 api_permissions 中注册。
 */
const SPECIAL_COMMANDS = new Set([
  'auth.login',
  'auth.logout',
  'auth.status',
  'auth.refresh-permissions',
  'auth.switch-org',
  'schema',
]);

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    }
    else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function extractCommands(text: string): string[] {
  // 匹配 "yulong <cmd segment> <cmd segment> ..." 形式的命令引用，把空格换成点号
  const commands: string[] = [];
  const re = /yulong\s+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const tokens: string[] = [];
    let remaining = text.slice(match.index + match[0].length);
    while (true) {
      const tokenMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9_-]*)(?:\s+|$)/);
      if (!tokenMatch) {
        break;
      }
      tokens.push(tokenMatch[1]);
      remaining = remaining.slice(tokenMatch[0].length);
    }
    if (tokens.length >= 2) {
      commands.push(tokens.join('.'));
    }
  }
  return commands;
}

const rawSkillCommands = (() => {
  const commands = new Set<string>();
  if (!fs.existsSync(SKILL_DIR)) {
    return commands;
  }
  for (const file of walk(SKILL_DIR)) {
    if (!file.endsWith('.md')) {
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    for (const cmd of extractCommands(text)) {
      if (!SPECIAL_COMMANDS.has(cmd)) {
        commands.add(cmd);
      }
    }
  }
  return commands;
})();

const db = fs.existsSync(DB_PATH) ? new Database(DB_PATH) : undefined;

const registeredCommands = (() => {
  if (!db || rawSkillCommands.size === 0) {
    return new Set<string>();
  }
  const list = Array.from(rawSkillCommands);
  const placeholders = list.map(() => '?').join(',');
  const rows = db.query(
    `SELECT command_name FROM api_permissions WHERE command_name IN (${placeholders})`,
  ).all(...list) as Array<{ command_name: string }>;
  return new Set(rows.map(r => r.command_name));
})();

/**
 * 过滤掉被更长命令包含的前缀引用。
 * 例如：文档里同时出现 "yulong project business" 和 "yulong project business list"，
 * 只保留真正注册的完整命令；如果前缀本身也是注册命令，则保留。
 */
const skillCommands = Array.from(rawSkillCommands).filter((cmd) => {
  if (registeredCommands.has(cmd)) {
    return true;
  }
  return !Array.from(rawSkillCommands).some(
    (other) => other !== cmd && other.startsWith(`${cmd}.`),
  );
});

describe('skill natural-language command references', () => {
  afterAll(() => {
    db?.close();
  });

  it('reads at least one command reference from skill docs', () => {
    expect(rawSkillCommands.size).toBeGreaterThan(0);
  });

  it.each(skillCommands)('command %s exists in api_permissions', (cmd) => {
    if (!db) {
      return;
    }
    const row = db.query('SELECT command_name FROM api_permissions WHERE command_name = ?').get(cmd);
    expect(row).not.toBeNull();
  });
});
