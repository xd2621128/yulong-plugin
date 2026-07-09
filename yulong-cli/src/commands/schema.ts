import { listApiPermissions } from '../core/db';
import { ErrorType } from '../core/envelope';
import { getCommandParams } from '../commands/command-params';
import { filterOpenPermissions } from '../auth/permission-filter';
import type { CommandContext } from '../core/types';

function parseJsonOptions(json?: string): Record<string, unknown> {
  if (!json) {
    return {};
  }
  try {
    return JSON.parse(json) as Record<string, unknown>;
  }
  catch (err) {
    const error = new Error(`参数 JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`);
    error.name = ErrorType.VALIDATION_ERROR;
    throw error;
  }
}

/**
 * schema 命令：列出所有可用命令
 *
 * 输出为平铺命令列表，保留用户最关心的信息：
 * - 命令名称
 * - 描述
 * - HTTP 方法 / 路径
 * - 示例调用
 */
export async function schemaCommand(context: CommandContext): Promise<unknown> {
  const options = parseJsonOptions(context.options.json);
  const module = options.module as string | undefined;
  const showAll = options.all === true;

  const permissions = listApiPermissions().filter((p) => {
    if (!module) return true;
    return p.module === module || p.command_name.startsWith(`${module}.`);
  });

  const openPermissions = showAll ? permissions : filterOpenPermissions(permissions);

  const commands = openPermissions.map((p) => {
    const commandName = p.command_name;
    const needsBody = ['POST', 'PUT', 'PATCH'].includes(p.method);

    // 已知命令给出具体参数示例，未知命令用占位符
    const PARAM_EXAMPLES: Record<string, string> = {
      'rbac.user.userPage': '{"currentPage":1,"pageSize":10}',
    };
    const paramsJson = PARAM_EXAMPLES[p.command_name] || '{"...":"..."}';

    // 路径参数示例占位符：优先取 command-params 中的第一个参数名，否则默认 <id>
    const hasPathParam = p.path?.includes('${param0}') ?? false;
    const params = getCommandParams(p.command_name);
    const pathArgName = hasPathParam ? (params?.[0]?.name || 'id') : '';
    const pathArgHint = hasPathParam ? ` <${pathArgName}>` : '';

    const example = needsBody
      ? `yulong ${p.command_name.replace(/\./g, ' ')}${pathArgHint} --json '${paramsJson}' --format json`
      : hasPathParam
        ? `yulong ${p.command_name.replace(/\./g, ' ')}${pathArgHint} --format json`
        : `yulong ${p.command_name.replace(/\./g, ' ')} --format json`;

    return {
      name: commandName,
      module: p.module,
      description: p.description || undefined,
      method: p.method,
      path: p.path,
      example,
    };
  });

  return {
    total: commands.length,
    commands,
  };
}
