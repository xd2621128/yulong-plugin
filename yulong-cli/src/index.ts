#!/usr/bin/env bun
import * as fs from 'fs';
import { parseArgs } from 'util';
import { success, error, printEnvelope, ErrorType } from './envelope';
import { configureLogger, info, error as logError } from './logger';
import { loadConfig, getBaseUrl } from './config';
import { resolveUser } from './user-resolver';
import * as auth from './auth';
import { schemaCommand } from './schema';
import { businessCommand } from './commands/business';
import { getApiPermission } from './db';
import { getCommandParams, getCommandExample } from './command-params';
import { thirdPartyLogin } from './auth-core';
import { refreshUserPermissions } from './permission-guard';
import { applyFields } from './formatter';
import type { GlobalOptions, CommandContext, ApiPermission } from './types';

const SPECIAL_COMMANDS = ['auth', 'schema'];

function prepareOutput(data: unknown, fields?: string): unknown {
  return fields ? applyFields(data, fields) : data;
}

function printHelp(): void {
  console.log(`
御龙 CLI

用法:
  yulong <command...> [选项]
  yulong auth <subcommand> [选项]
  yulong schema [选项]

全局选项:
  --userid <id>       用户标识（默认从约定数据库读取）
  --json <json>       请求参数 JSON 字符串
  --json-file <path>  请求参数 JSON 文件路径
  --file <path>       上传文件路径（用于文件上传类命令）
  --format <format>   输出格式: json / table / raw（默认 json）
  --fields <list>     筛选输出字段（逗号分隔）
  --resource-mark <mark>  覆盖 X-ResourceMark 请求头
  --verbose, -v       详细日志
  --debug             调试日志
  --dry-run           仅显示解析结果，不执行
  --yes, -y           危险操作确认（跳过交互）
  --timeout <sec>     HTTP 超时（秒，默认 30）
  --help, -h          显示帮助

示例:
  yulong schema
  yulong auth status
  yulong auth refresh-permissions --format json
  yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'
  yulong hr knowledge addKnowledge --json '{"title":"..."}' --yes
`);
}

function printCommandHelp(commandName: string, permission: ApiPermission | null): void {
  const cliCommand = commandName.replace(/\./g, ' ');
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(permission?.method || '');

  console.log(`
命令: ${commandName}
`);

  if (permission) {
    if (permission.description) {
      console.log(`描述: ${permission.description}\n`);
    }

    console.log(`后端接口: ${permission.method} ${permission.path}`);

    try {
      const required = JSON.parse(permission.required_permissions) as string[];
      const isAllOpen = permission.match_mode === 'all' && required.length === 1 && required[0] === 'all';
      if (required.length > 0 && !isAllOpen) {
        console.log(`权限要求: 需要${permission.match_mode === 'all' ? '全部' : '任一'} [${required.join(', ')}]`);
      }
      else if (permission.match_mode === 'all') {
        console.log('权限要求: 对认证用户开放');
      }
    }
    catch {
      console.log(`权限要求: ${permission.required_permissions}`);
    }

    if (permission.resource_mark) {
      console.log(`ResourceMark: ${permission.resource_mark}`);
    }

    if (permission.is_dangerous === 1) {
      console.log('危险操作: 执行时需要加 --yes 确认');
    }

    const params = getCommandParams(commandName);

    // 路径参数示例占位符：优先取 command-params 中的第一个参数名，否则默认 <id>
    const hasPathParam = permission?.path?.includes('${param0}') ?? false;
    const pathArgName = hasPathParam ? (params?.[0]?.name || 'id') : '';
    const pathArgHint = hasPathParam ? ` <${pathArgName}>` : '';

    console.log('\n用法:');
    if (needsBody) {
      console.log(`  yulong ${cliCommand}${pathArgHint} --json '{"...":"..."}' [选项]`);
    }
    else if (hasPathParam) {
      console.log(`  yulong ${cliCommand}${pathArgHint} [选项]`);
    }
    else {
      console.log(`  yulong ${cliCommand} [选项]`);
    }

    console.log(`\n示例:`);
    const exampleJson = getCommandExample(commandName) || (needsBody ? '{"currentPage":1,"pageSize":10}' : '');
    if (needsBody) {
      console.log(`  yulong ${cliCommand}${pathArgHint} --json '${exampleJson}' --format json`);
    }
    else if (hasPathParam) {
      console.log(`  yulong ${cliCommand} ${pathArgName === 'field' ? 'clue_scene' : '123'} --format json`);
    }
    else {
      console.log(`  yulong ${cliCommand} --format json`);
    }

    if (params && params.length > 0) {
      console.log(`\n常用参数:`);
      const maxNameLen = Math.max(...params.map(p => p.name.length));
      for (const p of params) {
        const pad = ' '.repeat(maxNameLen - p.name.length);
        console.log(`  ${p.name}${pad}  ${p.type.padEnd(12)} ${p.desc}`);
      }
    }
  }
  else {
    console.log(`提示: 该命令未在 api_permissions 表中注册，CLI 将直接透传到后端。`);
    console.log(`\n用法:`);
    console.log(`  yulong ${cliCommand} --json '{"...":"..."}' --format json`);
  }

  console.log(`
全局选项:
  --userid <id>       用户标识（默认从约定数据库读取）
  --json <json>       请求参数 JSON 字符串
  --json-file <path>  请求参数 JSON 文件路径
  --file <path>       上传文件路径（用于文件上传类命令）
  --format <format>   输出格式: json / table / raw（默认 json）
  --fields <list>     筛选输出字段（逗号分隔）
  --resource-mark <mark>  覆盖 X-ResourceMark 请求头
  --verbose, -v       详细日志
  --debug             调试日志
  --dry-run           仅显示解析结果，不执行
  --yes, -y           危险操作确认（跳过交互）
  --timeout <sec>     HTTP 超时（秒，默认 30）
`);
}

function printAuthHelp(subCommand?: string): void {
  const helps: Record<string, string> = {
    login: `auth login — 通过第三方登录接口登录

用法:
  yulong auth login [选项]

说明:
  识别当前用户并获取 accessToken + refreshToken，同时刷新本地权限缓存。
  用户识别优先级：约定数据库 → --userid → YULONG_USERID。`,
    logout: `auth logout — 清除本地 token

用法:
  yulong auth logout [选项]`,
    status: `auth status — 查看本地 token 状态

用法:
  yulong auth status [选项]`,
    'refresh-permissions': `auth refresh-permissions — 刷新本地权限缓存

用法:
  yulong auth refresh-permissions [选项]

说明:
  不重新登录，直接调用后端权限接口更新本地缓存。`,
    'switch-org': `auth switch-org — 切换登录组织（骨架实现）

用法:
  yulong auth switch-org --json '{"orgId":"xxx"}' [选项]`,
    'import-token': `auth import-token — 手动导入 token（SSO 未上线前的降级方案）

用法:
  yulong auth import-token --json '{"accessToken":"...","refreshToken":"...","expiresAt":"...","orgId":"..."}' [选项]`,
  };

  if (subCommand && helps[subCommand]) {
    console.log(`\n${helps[subCommand]}\n`);
    return;
  }

  console.log(`
御龙 CLI — auth 子命令

用法:
  yulong auth <subcommand> [选项]

子命令:
  login              通过第三方登录接口登录
  logout             清除本地 token
  status             查看本地 token 状态
  refresh-permissions 刷新本地权限缓存
  switch-org         切换登录组织（骨架实现）
  import-token       手动导入 token

示例:
  yulong auth login --format json
  yulong auth status --format json
  yulong auth refresh-permissions --format json
`);
}

function parseGlobalOptions(argv: string[]): { options: GlobalOptions; positionals: string[] } {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      userid: { type: 'string' },
      json: { type: 'string' },
      'json-file': { type: 'string' },
      file: { type: 'string' },
      format: { type: 'string', default: 'json' },
      fields: { type: 'string' },
      'resource-mark': { type: 'string' },
      verbose: { type: 'boolean', short: 'v', default: false },
      debug: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      yes: { type: 'boolean', short: 'y', default: false },
      timeout: { type: 'string', default: '30' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: false,
    allowPositionals: true,
  });

  return {
    options: {
      userid: values.userid as string | undefined,
      json: values.json as string | undefined,
      jsonFile: values['json-file'] as string | undefined,
      file: values.file as string | undefined,
      format: (values.format as 'json' | 'table' | 'raw') || 'json',
      fields: values.fields as string | undefined,
      resourceMark: values['resource-mark'] as string | undefined,
      verbose: values.verbose as boolean,
      debug: values.debug as boolean,
      dryRun: values['dry-run'] as boolean,
      yes: values.yes as boolean,
      timeout: parseInt(values.timeout as string, 10) || 30,
      help: values.help as boolean,
    },
    positionals,
  };
}

function parseRequestParams(options: GlobalOptions): Record<string, unknown> {
  let raw: string | undefined;
  if (options.json) {
    raw = options.json;
  }
  else if (options.jsonFile) {
    const filePath = options.jsonFile;
    if (filePath === '-') {
      // 从 stdin 读取 JSON 参数
      const chunks: Buffer[] = [];
      while (true) {
        const chunk = Buffer.alloc(4096);
        const bytesRead = fs.readSync(process.stdin.fd, chunk, 0, chunk.length, null);
        if (bytesRead === 0) {
          break;
        }
        chunks.push(chunk.subarray(0, bytesRead));
      }
      raw = Buffer.concat(chunks).toString('utf8');
    }
    else if (!fs.existsSync(filePath)) {
      const err = new Error(`参数文件不存在: ${filePath}`);
      err.name = ErrorType.VALIDATION_ERROR;
      throw err;
    }
    else {
      raw = fs.readFileSync(filePath, 'utf8');
    }
  }

  if (!raw || raw.trim() === '') {
    return {};
  }

  try {
    return JSON.parse(raw);
  }
  catch (err) {
    const error = new Error(`参数 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.VALIDATION_ERROR;
    throw error;
  }
}

async function dispatchSpecialCommand(
  command: string,
  subCommand: string,
  context: CommandContext,
): Promise<unknown> {
  switch (command) {
    case 'auth':
      return auth.handle(subCommand, context);
    case 'schema':
      return schemaCommand(context);
    default: {
      const err = new Error(`未知特殊命令: ${command}`);
      err.name = ErrorType.VALIDATION_ERROR;
      throw err;
    }
  }
}

function resolveCommandAndArgs(positionals: string[]): { command: string; args: string[] } {
  // 从最长到最短匹配 api_permissions 中已注册的命令
  for (let i = positionals.length; i > 0; i--) {
    const candidate = positionals.slice(0, i).join('.');
    if (getApiPermission(candidate)) {
      return { command: candidate, args: positionals.slice(i) };
    }
  }

  // 未匹配到已知命令时，全部视为命令名（无路径参数）
  return { command: positionals.join('.'), args: [] };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    printHelp();
    return;
  }

  const { options, positionals } = parseGlobalOptions(argv);

  // 命令级帮助：yulong <command...> --help
  if (options.help) {
    if (positionals.length > 0) {
      const first = positionals[0];
      if (first === 'auth') {
        printAuthHelp(positionals[1]);
      }
      else {
        const { command: commandName } = resolveCommandAndArgs(positionals);
        const permission = getApiPermission(commandName);
        printCommandHelp(commandName, permission);
      }
    }
    else {
      printHelp();
    }
    return;
  }

  const config = loadConfig();
  configureLogger(options, config.logLevel);

  info(`启动 yulong-cli，参数: ${JSON.stringify(positionals)}`);

  try {
    // 特殊命令
    const first = positionals[0];
    if (first && SPECIAL_COMMANDS.includes(first)) {
      const subCommand = positionals[1] || '';
      const context: CommandContext = {
        command: `${first} ${subCommand}`.trim(),
        module: first,
        resource: subCommand,
        action: '',
        options,
        args: positionals.slice(2),
      };
      const result = await dispatchSpecialCommand(first, subCommand, context);
      printEnvelope(success(prepareOutput(result, options.fields), options.dryRun), options.format);
      return;
    }

    // 业务命令: yulong <command...> (至少 1 个位置参数)
    if (positionals.length < 1) {
      printEnvelope(error(ErrorType.VALIDATION_ERROR, '命令格式错误，需要: yulong <command...>'));
      process.exitCode = 1;
      return;
    }

    const { command, args: pathArgs } = resolveCommandAndArgs(positionals);
    const params = parseRequestParams(options);

    const context: CommandContext = {
      command,
      module: '',
      resource: '',
      action: '',
      options,
      args: pathArgs,
    };

    // 解析用户
    const user = await resolveUser(options);
    info(`当前用户: ${user.userid}`);

    // 当约定数据库为空、使用 --userid/YULONG_USERID 兜底时，需要先以该用户身份登录
    if (user.source === 'explicit') {
      info('约定数据库为空，使用指定用户登录...');
      await thirdPartyLogin(user.userid, loadConfig().timeout || 30);
      try {
        await refreshUserPermissions(user.userid);
      }
      catch (err) {
        logError(`登录后权限刷新失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (options.dryRun) {
      const result = {
        command,
        user: user.userid,
        params,
        baseUrl: getBaseUrl(config),
        resourceMark: options.resourceMark || '使用 api_permissions.resource_mark',
        note: 'dry-run 模式，未执行实际请求',
      };
      printEnvelope(success(prepareOutput(result, options.fields), true), options.format);
      return;
    }

    // 分发到业务命令
    const result = await businessCommand(context, user.userid, params);
    printEnvelope(success(prepareOutput(result, options.fields)), options.format);
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(message);

    // 如果错误对象带有已知的 ErrorType，使用它；否则归为 unknown_error
    const knownTypes = Object.values(ErrorType);
    const errType = err instanceof Error && knownTypes.includes(err.name as any)
      ? err.name
      : ErrorType.UNKNOWN_ERROR;

    const detail = err instanceof Error && (err as Error & { detail?: Record<string, unknown> }).detail
      ? (err as Error & { detail?: Record<string, unknown> }).detail
      : undefined;

    printEnvelope(error(errType, message, detail));
    process.exitCode = 1;
  }
  finally {
    // SQLite 连接会在进程退出时自动关闭
  }
}

main();
