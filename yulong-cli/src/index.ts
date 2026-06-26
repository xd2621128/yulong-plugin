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
import { getCommandParams } from './command-params';
import type { GlobalOptions, CommandContext, ApiPermission } from './types';

const SPECIAL_COMMANDS = ['auth', 'schema'];

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
  --format <format>  输出格式: json / table / raw（默认 json）
  --fields <list>     筛选输出字段（逗号分隔）
  --resource-mark     覆盖 X-ResourceMark 请求头
  --verbose, -v       详细日志
  --debug             调试日志
  --dry-run           仅显示解析结果，不执行
  --yes, -y           危险操作确认（跳过交互）
  --timeout <sec>    HTTP 超时（秒，默认 30）
  --help, -h          显示帮助

示例:
  yulong schema
  yulong auth status
  yulong auth refresh-permissions --format json
  yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'
  yulong rbac user delete --id 123 --yes
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
    if (needsBody) {
      console.log(`  yulong ${cliCommand}${pathArgHint} --json '{"currentPage":1,"pageSize":10}' --format json`);
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
  --resource-mark     覆盖 X-ResourceMark 请求头
  --verbose, -v       详细日志
  --debug             调试日志
  --dry-run           仅显示解析结果，不执行
  --yes, -y           危险操作确认（跳过交互）
  --timeout <sec>     HTTP 超时（秒，默认 30）
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
      // TODO: 从 stdin 读取
      raw = '{}';
    }
    else if (!fs.existsSync(filePath)) {
      throw new Error(`参数文件不存在: ${filePath}`);
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
    throw new Error(`参数 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`);
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
    default:
      throw new Error(`未知特殊命令: ${command}`);
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
      const { command: commandName } = resolveCommandAndArgs(positionals);
      const permission = getApiPermission(commandName);
      printCommandHelp(commandName, permission);
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
      printEnvelope(success(result, options.dryRun));
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

    if (options.dryRun) {
      const result = {
        command,
        user: user.userid,
        params,
        baseUrl: getBaseUrl(config),
        resourceMark: options.resourceMark || '使用 api_permissions.resource_mark',
        note: 'dry-run 模式，未执行实际请求',
      };
      printEnvelope(success(result, true));
      return;
    }

    // 分发到业务命令
    const result = await businessCommand(context, user.userid, params);
    printEnvelope(success(result));
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
