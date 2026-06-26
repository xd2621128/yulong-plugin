import { getApiPermission } from '../db';
import { checkPermission, hasToken, refreshUserPermissions } from '../permission-guard';
import { buildRequest, request } from '../api-client';
import { ErrorType } from '../envelope';
import * as logger from '../logger';
import * as fs from 'fs';
import * as path from 'path';
import type { CommandContext } from '../types';

/**
 * 判断命令是否为文件上传类命令
 *
 * 目前仅 hr.file.upload 与 hr.file.upload.return.attachment 需要 multipart/form-data 上传
 */
function isFileUploadCommand(command: string): boolean {
  return command === 'hr.file.upload' || command === 'hr.file.upload.return.attachment';
}

/**
 * 根据 --file 选项构造 multipart/form-data 请求体
 *
 * 前端上传组件统一使用字段名 `file`（见 FileUploaderImg/index.vue）
 */
function buildFileUploadBody(filePath: string): FormData {
  if (!fs.existsSync(filePath)) {
    throw new Error(`上传文件不存在: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`上传路径不是文件: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const bunFile = (Bun as any).file?.(filePath);
  const mimeType = typeof bunFile?.type === 'string' && bunFile.type
    ? bunFile.type
    : 'application/octet-stream';

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType }), filename);
  return formData;
}

/**
 * 业务命令入口
 *
 * 当前为骨架实现：
 * 1. 检查 token
 * 2. 检查权限映射
 * 3. 权限预检
 * 4. 构造请求（不实际发送）
 */
export async function businessCommand(
  context: CommandContext,
  userid: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  // 1. 检查 token
  if (!hasToken()) {
    throw new Error('未登录，请先使用 yulong auth import-token 注入 token');
  }

  // 2. 获取权限映射
  const permission = getApiPermission(context.command);

  if (!permission) {
    logger.warn(`命令 ${context.command} 未配置权限映射，将直接调后端`);
    const reqConfig = buildRequest(context, params);
    reqConfig.userid = userid;
    return request(reqConfig);
  }

  // 3. 权限预检
  const requiredPermissions = JSON.parse(permission.required_permissions) as string[];
  let checkResult = await checkPermission(userid, requiredPermissions, permission.match_mode);

  // 4. 缓存为空且预检失败时，尝试刷新一次权限缓存
  if (!checkResult.passed && checkResult.userHas.length === 0) {
    logger.info('权限缓存为空，尝试刷新...');
    try {
      await refreshUserPermissions(userid);
      checkResult = await checkPermission(userid, requiredPermissions, permission.match_mode);
    }
    catch (err) {
      logger.warn(`权限刷新失败: ${err instanceof Error ? err.message : String(err)}`);
      // 保持原失败结果，继续向下走
    }
  }

  if (!checkResult.passed) {
    const err = new Error(`权限不足：需要 ${permission.match_mode === 'all' ? '全部' : '任一'} [${requiredPermissions.join(', ')}]`);
    err.name = ErrorType.PERMISSION_DENIED;
    throw err;
  }

  // 5. 危险操作确认
  if (permission.is_dangerous === 1 && !context.options.yes) {
    throw new Error(`危险操作 ${context.command}，请添加 --yes 确认`);
  }

  // 6. 构造并执行请求
  logger.info(`权限检查通过：${context.command}`);

  let explicitBody: FormData | undefined;
  if (isFileUploadCommand(context.command)) {
    const filePath = context.options.file;
    if (!filePath) {
      throw new Error(`命令 ${context.command} 需要 --file 参数指定上传文件路径`);
    }
    explicitBody = buildFileUploadBody(filePath);
  }

  const reqConfig = buildRequest(context, params, explicitBody);
  reqConfig.userid = userid;

  // 骨架阶段：如果未配置 baseUrl，仅返回请求配置
  try {
    return request(reqConfig);
  }
  catch (err) {
    logger.error(`请求失败: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
