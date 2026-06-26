import { listApiPermissions } from './db';
import type { CommandContext } from './types';

/**
 * schema 命令：列出所有可用命令
 *
 * 输出按模块分组，只保留用户最关心的信息：
 * - 命令名称
 * - 描述
 * - HTTP 方法 / 路径
 * - 示例调用
 */
export async function schemaCommand(context: CommandContext): Promise<unknown> {
  const module = context.options.json
    ? JSON.parse(context.options.json).module
    : undefined;

  const permissions = listApiPermissions(module);

  // 默认只显示已开放的命令：required_permissions 非空，或 match_mode 为 all 且 required_permissions 为空（对认证用户开放）
  // 可通过 --json '{"all":true}' 查看全部命令
  const showAll = context.options.json
    ? JSON.parse(context.options.json).all === true
    : false;

  const openPermissions = permissions.filter((p) => {
    if (showAll) return true;
    try {
      const required = JSON.parse(p.required_permissions) as string[];
      return required.length > 0 || p.match_mode === 'all';
    }
    catch {
      return false;
    }
  });

  const grouped: Record<string, { commands: Array<{
    name: string;
    description?: string;
    method: string;
    path: string;
    example: string;
  }> }> = {};

  for (const p of openPermissions) {
    if (!grouped[p.module]) {
      grouped[p.module] = { commands: [] };
    }

    const commandName = p.command_name;
    const needsBody = ['POST', 'PUT', 'PATCH'].includes(p.method);

    // 已知命令给出具体参数示例，未知命令用占位符
    const PARAM_EXAMPLES: Record<string, string> = {
      'rbac.user.userPage': '{"currentPage":1,"pageSize":10}',
    };
    const paramsJson = PARAM_EXAMPLES[p.command_name] || '{"...":"..."}';

    const example = needsBody
      ? `yulong ${p.command_name.replace(/\./g, ' ')} --json '${paramsJson}' --format json`
      : `yulong ${p.command_name.replace(/\./g, ' ')} --format json`;

    grouped[p.module].commands.push({
      name: commandName,
      description: p.description || undefined,
      method: p.method,
      path: p.path,
      example,
    });
  }

  return {
    total: openPermissions.length,
    modules: grouped,
  };
}
