import { getApiPermission } from '../core/db';
import { checkPermission, hasToken, refreshUserPermissions, fetchUserPermissions } from '../auth/permission-guard';
import { buildRequest, request } from '../core/api-client';
import { ErrorType } from '../core/envelope';
import * as logger from '../core/logger';
import * as fs from 'fs';
import * as path from 'path';
import type { CommandContext } from '../core/types';

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
    const err = new Error(`上传文件不存在: ${filePath}`);
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    const err = new Error(`上传路径不是文件: ${filePath}`);
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
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
 * 1. 普通模式：检查本地 token、权限预检、危险操作确认、执行请求
 * 2. Token 模式：使用外部 token，每次请求前拉取权限做预检，无本地缓存
 */
export async function businessCommand(
  context: CommandContext,
  userid: string | undefined,
  params: Record<string, unknown>,
): Promise<unknown> {
  const token = context.options.token;
  const isTokenMode = !!token;

  if (!isTokenMode) {
    if (!hasToken()) {
      const err = new Error('未登录，请先使用 yulong auth login 登录');
      err.name = ErrorType.AUTH_REQUIRED;
      throw err;
    }
    if (!userid) {
      // 普通模式下 userid 必须存在，属于内部防御
      const err = new Error('未找到用户配置');
      err.name = ErrorType.AUTH_REQUIRED;
      throw err;
    }
  }

  // 2. 获取权限映射
  const permission = getApiPermission(context.command);

  if (!permission) {
    logger.warn(`命令 ${context.command} 未配置权限映射，将直接调后端`);
    const reqConfig = buildRequest(context, params);
    reqConfig.userid = userid;
    reqConfig.skipAuthRetry = isTokenMode;
    return request(reqConfig);
  }

  // 3. 权限预检
  const requiredPermissions = JSON.parse(permission.required_permissions) as string[];
  let checkResult: { passed: boolean; userHas: string[] };

  if (isTokenMode) {
    const userPermissions = await fetchUserPermissions(token);
    checkResult = checkPermissionsLocally(requiredPermissions, permission.match_mode, userPermissions);
  }
  else {
    const normalUserId = userid!;
    checkResult = await checkPermission(normalUserId, requiredPermissions, permission.match_mode);

    // 4. 缓存为空且预检失败时，尝试刷新一次权限缓存
    if (!checkResult.passed && checkResult.userHas.length === 0) {
      logger.info('权限缓存为空，尝试刷新...');
      try {
        await refreshUserPermissions(normalUserId);
        checkResult = await checkPermission(normalUserId, requiredPermissions, permission.match_mode);
      }
      catch (err) {
        logger.warn(`权限刷新失败: ${err instanceof Error ? err.message : String(err)}`);
        // 保持原失败结果，继续向下走
      }
    }
  }

  if (!checkResult.passed) {
    // required_permissions 为空的命令属于未开放命令（见 auth/permission-filter.ts），给出明确提示
    const message = requiredPermissions.length === 0
      ? `命令 ${context.command} 尚未开放，暂不可用（可执行 yulong schema 查看已开放命令）`
      : `权限不足：需要 ${permission.match_mode === 'all' ? '全部' : '任一'} [${requiredPermissions.join(', ')}]`;
    const err = new Error(message);
    err.name = ErrorType.PERMISSION_DENIED;
    throw err;
  }

  // 5. 危险操作确认
  if (permission.is_dangerous === 1 && !context.options.yes) {
    const err = new Error(`危险操作 ${context.command}，请添加 --yes 确认`);
    err.name = ErrorType.VALIDATION_ERROR;
    throw err;
  }

  // 6. 构造并执行请求
  logger.info(`权限检查通过：${context.command}`);

  let explicitBody: FormData | undefined;
  if (isFileUploadCommand(context.command)) {
    const filePath = context.options.file;
    if (!filePath) {
      const err = new Error(`命令 ${context.command} 需要 --file 参数指定上传文件路径`);
      err.name = ErrorType.VALIDATION_ERROR;
      throw err;
    }
    explicitBody = buildFileUploadBody(filePath);
  }

  const reqConfig = buildRequest(context, params, explicitBody);
  reqConfig.userid = userid;
  reqConfig.skipAuthRetry = isTokenMode;

  try {
    return request(reqConfig);
  }
  catch (err) {
    logger.error(`请求失败: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * 本地权限对比
 */
function checkPermissionsLocally(
  requiredPermissions: string[],
  matchMode: 'any' | 'all',
  userPermissions: string[],
): { passed: boolean; userHas: string[] } {
  let passed = false;
  if (matchMode === 'all' && requiredPermissions.length === 1 && requiredPermissions[0] === 'all') {
    passed = true;
  }
  else if (matchMode === 'all') {
    passed = requiredPermissions.every(p => userPermissions.includes(p));
  }
  else {
    passed = requiredPermissions.some(p => userPermissions.includes(p));
  }
  return { passed, userHas: userPermissions };
}
